"""Benchmark: run fixed tasks headless with and without plugins, and compare tokens, cost and pass rate.

Each run gets a fresh copy of the task's fixture, loads no user settings, plugins or MCP servers
(only the plugins named in the config), and is checked by the task's own pass/fail command.

    python bench/run.py                      # every task, every config, 1 run each
    python bench/run.py --tasks noisy-build --configs baseline,context-guard --runs 3 --model sonnet

Results go to bench/results/<timestamp>.json and a Markdown table is printed (paste it into the README).
"""

import argparse
import json
import shutil
import statistics
import subprocess
import sys
import tempfile
import time
from pathlib import Path

BENCH = Path(__file__).resolve().parent
REPO = BENCH.parent

# Plugin folders loaded per config. "baseline" loads none.
CONFIGS = {
    "baseline": [],
    "context-guard": ["context-guard"],
    "haiku-agents": ["haiku-agents"],
    "smart-compact": ["smart-compact"],
    "all": ["context-guard", "haiku-agents", "lean-skills", "smart-compact"],
}


def run_once(task_dir: Path, plugins: list[str], model: str, budget: float, timeout: int) -> dict:
    task = json.loads((task_dir / "task.json").read_text(encoding="utf-8"))
    work = Path(tempfile.mkdtemp(prefix=f"bench-{task_dir.name}-"))
    try:
        shutil.copytree(task_dir / "fixture", work, dirs_exist_ok=True)
        if task.get("setup"):
            subprocess.run(task["setup"], shell=True, cwd=work, check=True, capture_output=True)

        # A task is one prompt, or several "turns" sent one after another into the same session.
        prompts = task.get("turns") or [task["prompt"]]
        totals = {"cost_usd": 0.0, "turns": 0, "input": 0, "cache_read": 0, "cache_write": 0, "output": 0}
        session_id = None
        started = time.time()
        out: dict = {}
        for prompt in prompts:
            cmd = [
                "claude", "-p", prompt,
                "--model", model,
                "--output-format", "json",
                "--setting-sources", "project",  # no user settings, so no installed plugins
                "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
                "--permission-mode", "bypassPermissions",
                "--max-budget-usd", str(budget),
            ]
            if session_id:
                cmd += ["--resume", session_id]
            elif len(prompts) == 1:
                cmd += ["--no-session-persistence"]
            for p in plugins:
                cmd += ["--plugin-dir", str(REPO / p)]

            proc = subprocess.run(cmd, cwd=work, capture_output=True, text=True, encoding="utf-8",
                                  timeout=timeout, stdin=subprocess.DEVNULL)
            try:
                out = json.loads(proc.stdout)
            except json.JSONDecodeError:
                return {"error": (proc.stdout + proc.stderr)[-500:], "seconds": round(time.time() - started, 1), "passed": False}
            session_id = out.get("session_id")
            u = out.get("usage", {})
            totals["cost_usd"] += out.get("total_cost_usd", 0) or 0
            totals["turns"] += out.get("num_turns", 0) or 0
            totals["input"] += u.get("input_tokens", 0)
            totals["cache_read"] += u.get("cache_read_input_tokens", 0)
            totals["cache_write"] += u.get("cache_creation_input_tokens", 0)
            totals["output"] += u.get("output_tokens", 0)

        (work / ".bench-answer.txt").write_text(out.get("result") or "", encoding="utf-8")
        check = subprocess.run(task["check"], shell=True, cwd=work, capture_output=True, text=True)
        return {
            "passed": check.returncode == 0,
            "check_output": (check.stdout + check.stderr)[-300:],
            **totals,
            "seconds": round(time.time() - started, 1),
        }
    finally:
        shutil.rmtree(work, ignore_errors=True)


def summarize(rows: list[dict]) -> dict:
    ok = [r for r in rows if "error" not in r]
    med = lambda k: statistics.median(r[k] for r in ok) if ok else 0
    return {
        "runs": len(rows),
        "passed": sum(r["passed"] for r in rows),
        "cost_usd": med("cost_usd"),
        "context_tokens": med("cache_read") + med("cache_write") + med("input"),
        "output": med("output"),
        "turns": med("turns"),
        "seconds": med("seconds"),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tasks", help="comma-separated task names (default: all)")
    ap.add_argument("--configs", default="baseline,context-guard", help=f"comma-separated, from: {', '.join(CONFIGS)}")
    ap.add_argument("--runs", type=int, default=1)
    ap.add_argument("--model", default="sonnet")
    ap.add_argument("--budget", type=float, default=1.0, help="max USD per run")
    ap.add_argument("--timeout", type=int, default=600)
    a = ap.parse_args()

    task_dirs = sorted(d for d in (BENCH / "tasks").iterdir() if (d / "task.json").exists())
    if a.tasks:
        wanted = set(a.tasks.split(","))
        task_dirs = [d for d in task_dirs if d.name in wanted]
    configs = a.configs.split(",")
    for c in configs:
        if c not in CONFIGS:
            sys.exit(f"unknown config {c}")

    results: dict = {"model": a.model, "runs": a.runs, "tasks": {}}
    for d in task_dirs:
        results["tasks"][d.name] = {}
        for c in configs:
            rows = []
            for i in range(a.runs):
                print(f"{d.name} / {c} / run {i + 1}...", file=sys.stderr, flush=True)
                rows.append(run_once(d, CONFIGS[c], a.model, a.budget, a.timeout))
            results["tasks"][d.name][c] = {"summary": summarize(rows), "rows": rows}

    out_dir = BENCH / "results"
    out_dir.mkdir(exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    (out_dir / f"{stamp}.json").write_text(json.dumps(results, indent=2), encoding="utf-8")

    print(f"\nModel: {a.model}, {a.runs} run(s) per cell, medians.\n")
    print("| Task | Config | Passed | Cost | Context tokens | Output tokens | Turns | Time |")
    print("|---|---|---|---|---|---|---|---|")
    for task, by_config in results["tasks"].items():
        base = by_config.get("baseline", {}).get("summary")
        for c, v in by_config.items():
            s = v["summary"]
            delta = ""
            if base and c != "baseline" and base["context_tokens"]:
                delta = f" ({(s['context_tokens'] - base['context_tokens']) / base['context_tokens']:+.0%})"
            print(f"| {task} | {c} | {s['passed']}/{s['runs']} | ${s['cost_usd']:.3f} | {s['context_tokens']:,.0f}{delta} "
                  f"| {s['output']:,.0f} | {s['turns']:.0f} | {s['seconds']:.0f}s |")


if __name__ == "__main__":
    main()

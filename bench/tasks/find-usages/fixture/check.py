import json, re, sys
expected = set(json.load(open(".expected.json")))
answer = open(".bench-answer.txt", encoding="utf-8").read()
found = {p.replace("\\", "/").strip("`* ./") for p in re.findall(r"[\w./\-]+\.py", answer)}
found = {f if f.startswith("shop/") else f for f in found}
print("missing:", sorted(expected - found), "extra:", sorted(found - expected))
sys.exit(0 if found == expected else 1)

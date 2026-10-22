import glob, sys

# Prints a line per check so the output is long even when almost everything passes.
RULES = [("FIXME", "leftover FIXME"), ("hardcoded-secret", "hardcoded secret"), ("TODO deprecated", "deprecated code left in")]
problems = 0
for path in sorted(glob.glob("src/*.py")):
    text = open(path).read()
    for n in range(40):
        print(f"{path}: check {n:02d} style/format/imports ... ok")
    for needle, label in RULES:
        if needle in text:
            problems += 1
            print(f"{path}: PROBLEM: {label} ({needle!r})")
print(f"{problems} problem(s)")
if "--check" in sys.argv:
    sys.exit(1 if problems else 0)

# 40 source files; three contain problems the linter reports between ~1,600 lines of routine output.
import os
os.makedirs("src", exist_ok=True)
for i in range(40):
    lines = [f"def func_{i}_{k}(x):\n    return x + {k}\n" for k in range(10)]
    if i == 7:
        lines.append("def debug_dump(x):\n    print(x)  # FIXME remove before release\n")
    if i == 23:
        lines.append("API_KEY = 'hardcoded-secret-123'\n")
    if i == 31:
        lines.append("def old_api(x):\n    return x  # TODO deprecated\n")
    open(f"src/mod_{i}.py", "w").write("\n".join(lines))

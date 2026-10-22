# Writes 60 modules across 6 packages; 7 of them call apply_discount, 2 more only mention it.
import json, os, random
random.seed(7)
callers = set()
for p in range(6):
    os.makedirs(f"shop/pkg{p}", exist_ok=True)
    for m in range(10):
        path = f"shop/pkg{p}/mod{m}.py"
        body = [f'"""Module {p}.{m}."""', "from shop.pricing import apply_discount" if (p * 10 + m) % 9 == 3 else "import math", ""]
        for f in range(25):
            body += [f"def f{f}(x):", f"    return math.floor(x * {f + 1}) if x else 0" if (p * 10 + m) % 9 != 3 else f"    return x * {f + 1}", ""]
        if (p * 10 + m) % 9 == 3:
            body += ["def checkout(cart):", "    return apply_discount(sum(cart), 0.1)", ""]
            callers.add(path)
        elif (p * 10 + m) % 13 == 5:
            body += ["# TODO: maybe use apply_discount here later", ""]
        open(path, "w").write("\n".join(body))
os.makedirs("shop", exist_ok=True)
open("shop/pricing.py", "w").write("def apply_discount(total, rate):\n    return total * (1 - rate)\n")
json.dump(sorted(callers), open(".expected.json", "w"))

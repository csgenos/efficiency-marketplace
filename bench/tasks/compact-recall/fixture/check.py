import re, sys
answer = open(".bench-answer.txt", encoding="utf-8").read().lower()
src = open("pricing.py").read()
need = ["tab", "readme", "docstring", "apply_discount", "clamp_price"]
missing = [w for w in need if w not in answer]
import importlib.util
spec = importlib.util.spec_from_file_location("p", "pricing.py"); p = importlib.util.module_from_spec(spec); spec.loader.exec_module(p)
ok_code = abs(p.apply_discount(200, 0.1) - 180) < 1e-9 and p.clamp_price(-5) == 0 and p.clamp_price(20000) == 10000
print("missing from recall:", missing, "| code ok:", ok_code)
sys.exit(0 if not missing and ok_code else 1)

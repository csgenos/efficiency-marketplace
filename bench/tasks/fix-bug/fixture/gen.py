# Writes a ~900-line inventory.py with one bug deep inside, so the fix needs targeted reading.
parts = ['"""Inventory helpers."""\n\n']
for i in range(110):
    parts.append(f'''
def helper_{i}(items, factor={i % 7 + 1}):
    """Scale the quantities of items by factor (helper {i})."""
    out = []
    for item in items:
        out.append({{**item, "qty": item["qty"] * factor}})
    return out
''')
parts.insert(70, '''
def total_value(items):
    """Sum of price times quantity over all items."""
    total = 0
    for item in items:
        total += item["price"] + item["qty"]
    return total
''')
open("inventory.py", "w").write("".join(parts))

from inventory import total_value

items = [{"price": 2.5, "qty": 4}, {"price": 10, "qty": 3}]
assert total_value(items) == 40, f"expected 40, got {total_value(items)}"
print("ok")

import json

# A build that prints a lot of routine progress, with one real warning buried in it.
config = json.load(open("config.json"))
for i in range(4000):
    print(f"[{i:04d}/4000] compiled module_{i}.c -> module_{i}.o ({(i * 37) % 900 + 100} bytes, {i % 17}ms)")
    if i == 2711 and not isinstance(config["retries"], int):
        print(f"WARNING: config.json key 'retries' must be an integer, got {config['retries']!r}")
print("build finished")

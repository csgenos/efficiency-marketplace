import subprocess, sys
out = subprocess.run([sys.executable, "build.py"], capture_output=True, text=True).stdout
sys.exit(0 if "WARNING" not in out and "build finished" in out else 1)

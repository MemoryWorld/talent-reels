"""One command after dependency setup. Ctrl+C stops both child servers."""
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not npm or not (ROOT / "web/node_modules/next").exists():
        raise SystemExit("Install Node.js 24, then run: cd web && npm ci")
    try:
        import fastapi  # noqa: F401
        import uvicorn  # noqa: F401
    except ImportError:
        raise SystemExit("Run: python -m pip install -r backend/requirements.txt")
    for port in (8789, 8790):
        with socket.socket() as sock:
            if sock.connect_ex(("127.0.0.1", port)) == 0:
                raise SystemExit(f"Port {port} is in use. Stop that local service before starting.")
    environment = {**os.environ, "NEXT_TELEMETRY_DISABLED": "1"}
    children = []
    def stop(*_):
        for child in children:
            if child.poll() is None:
                if os.name == "nt":
                    subprocess.run(["taskkill", "/PID", str(child.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    os.killpg(child.pid, signal.SIGTERM)
    def interrupted(*_):
        raise KeyboardInterrupt()
    signal.signal(signal.SIGINT, interrupted)
    try:
        launch = {"env": environment, "start_new_session": os.name != "nt"}
        children.append(subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.app:app", "--host", "127.0.0.1", "--port", "8790"], cwd=ROOT, **launch))
        children.append(subprocess.Popen([npm, "run", "dev"], cwd=ROOT / "web", **launch))
        print("Talent Reels: http://127.0.0.1:8789 | API docs: http://127.0.0.1:8790/docs", flush=True)
        while all(child.poll() is None for child in children):
            time.sleep(.5)
    except KeyboardInterrupt:
        pass
    finally:
        stop()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Manage the per-user macOS LaunchAgent for Vietnam Lead Finder."""

from __future__ import annotations

import argparse
import os
import plistlib
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

LABEL = "com.ptung.vietnam-lead-finder"
ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "desktop" / "server.py"
APP_DIR = Path.home() / "Library" / "Application Support" / "VietnamLeadFinder"
PLIST_PATH = Path.home() / "Library" / "LaunchAgents" / f"{LABEL}.plist"


def launchctl(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    result = subprocess.run(["/bin/launchctl", *args], text=True, capture_output=True)
    if check and result.returncode:
        message = (result.stderr or result.stdout).strip()
        raise RuntimeError(message or f"launchctl {' '.join(args)} failed")
    return result


def health(port: int) -> dict | None:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=1) as response:
            import json
            payload = json.load(response)
        expected = str(APP_DIR / "leads.sqlite3")
        if payload.get("ok") and payload.get("storage") == expected:
            return payload
    except (OSError, ValueError, urllib.error.URLError):
        pass
    return None


def domain() -> str:
    return f"gui/{os.getuid()}"


def create_plist(port: int) -> None:
    APP_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    APP_DIR.chmod(0o700)
    PLIST_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "Label": LABEL,
        "ProgramArguments": [sys.executable, str(SERVER), "--host", "127.0.0.1", "--port", str(port)],
        "WorkingDirectory": str(ROOT),
        "RunAtLoad": True,
        "KeepAlive": True,
        "ProcessType": "Interactive",
        "StandardOutPath": str(APP_DIR / "server.log"),
        "StandardErrorPath": str(APP_DIR / "server.log"),
        "Umask": 63,
    }
    with PLIST_PATH.open("wb") as handle:
        plistlib.dump(payload, handle)
    PLIST_PATH.chmod(0o600)


def start(port: int) -> None:
    current = health(port)
    if current:
        target = f"{domain()}/{LABEL}"
        loaded = launchctl("print", target, check=False).returncode == 0
        if loaded:
            print(f"Dashboard is running at http://127.0.0.1:{port}")
            return
        stop_unmanaged_instance(port)
    create_plist(port)
    target = f"{domain()}/{LABEL}"
    launchctl("bootout", target, check=False)
    launchctl("bootstrap", domain(), str(PLIST_PATH))
    launchctl("kickstart", "-k", target)
    for _ in range(30):
        current = health(port)
        if current:
            print(f"Dashboard is running at http://127.0.0.1:{port}")
            print(f"Local database: {current['storage']}")
            return
        time.sleep(1)
    launchctl("bootout", target, check=False)
    raise RuntimeError(f"Dashboard did not become healthy. Check {APP_DIR / 'server.log'}")


def stop_unmanaged_instance(port: int) -> None:
    result = subprocess.run(
        ["/usr/sbin/lsof", "-nP", "-t", f"-iTCP:{port}", "-sTCP:LISTEN"],
        capture_output=True, text=True,
    )
    pids = [item for item in result.stdout.split() if item.isdigit()]
    for item in pids:
        pid = int(item)
        command = subprocess.run(["/bin/ps", "-p", item, "-o", "command="], capture_output=True, text=True).stdout.strip()
        cwd = subprocess.run(["/usr/sbin/lsof", "-a", "-p", item, "-d", "cwd", "-Fn"], capture_output=True, text=True).stdout
        uid = subprocess.run(["/bin/ps", "-p", item, "-o", "uid="], capture_output=True, text=True).stdout.strip()
        same_repo = f"n{ROOT}\n" in cwd and "desktop/server.py" in command
        if uid != str(os.getuid()) or not same_repo or f"--port {port}" not in command:
            raise RuntimeError(f"Port {port} is occupied by another process; leaving it untouched.")
        os.kill(pid, 15)
    if pids:
        for _ in range(10):
            if health(port) is None:
                return
            time.sleep(0.2)
        raise RuntimeError(f"The previous local server on port {port} did not stop.")


def stop(port: int) -> None:
    target = f"{domain()}/{LABEL}"
    if launchctl("print", target, check=False).returncode == 0:
        launchctl("bootout", target)
    elif health(port):
        stop_unmanaged_instance(port)
    PLIST_PATH.unlink(missing_ok=True)
    print("Vietnam Lead Finder stopped.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("start", "status", "stop"))
    parser.add_argument("--port", type=int, default=4317)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("Port must be between 1024 and 65535")
    try:
        if args.action == "start":
            start(args.port)
        elif args.action == "status":
            current = health(args.port)
            if not current:
                print("Dashboard is not running.", file=sys.stderr)
                return 1
            print(f"Dashboard is running at http://127.0.0.1:{args.port}")
            print(f"Local database: {current['storage']}")
        else:
            stop(args.port)
    except (OSError, RuntimeError) as exc:
        print(f"Vietnam Lead Finder: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

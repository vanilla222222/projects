#!/bin/sh
cd -- "$(dirname -- "$0")" || exit 1
if command -v python3.12 >/dev/null 2>&1; then
  exec python3.12 launch.py
else
  exec python3 launch.py
fi

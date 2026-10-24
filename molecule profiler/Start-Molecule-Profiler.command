#!/bin/sh
cd -- "$(dirname -- "$0")" || exit 1
if command -v python3.12 >/dev/null 2>&1; then
  python3.12 launch.py
else
  python3 launch.py
fi
result=$?
if [ "$result" -ne 0 ]; then
  printf '\nStartup failed. Install Python 3.12 from python.org and see STANDALONE.md.\nPress Enter to close.'
  read -r answer
fi
exit "$result"

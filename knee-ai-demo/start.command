#!/bin/bash
cd "$(dirname "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 was not found. Install Python 3.9+ and restart. AI requires this project server."
  read -r -p "Press Return to close."
  exit 1
fi
python3 serve.py

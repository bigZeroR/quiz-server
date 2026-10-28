#!/usr/bin/env bash
# Linux / macOS launcher for Quiz Server
set -euo pipefail
cd "$(dirname "$0")/.."

PY=python3
command -v python3 >/dev/null 2>&1 || PY=python

if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  "$PY" -m venv venv
fi

case "$(uname -s)" in
  Darwin) VENV_PY="venv/bin/python" ;;
  *)      VENV_PY="venv/bin/python" ;;
esac

"$VENV_PY" -m pip install --quiet --upgrade pip
"$VENV_PY" -m pip install --quiet -r requirements.txt

if [ ! -f .env ]; then cp .env.example .env; fi

echo "Starting Quiz Server..."
exec "$VENV_PY" server.py

#!/usr/bin/env bash
set -euo pipefail

if [ ! -d "venv" ]; then
    echo "▶ Creating venv..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

echo "▶ Starting server..."
python server.py

# Windows launcher for Quiz Server (PowerShell)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$py = "python"
if (-not (Get-Command $py -ErrorAction SilentlyContinue)) {
    throw "Python 3.10+ is required. Install it from https://python.org"
}

if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..."
    & $py -m venv venv
}

$venvPy = Join-Path "venv" "Scripts\python.exe"

& $venvPy -m pip install --quiet --upgrade pip
& $venvPy -m pip install --quiet -r requirements.txt

if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }

Write-Host "Starting Quiz Server..."
& $venvPy server.py

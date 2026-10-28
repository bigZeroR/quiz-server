@echo off
REM Windows launcher for Quiz Server (double-click friendly)
setlocal
cd /d "%~dp0.."

where python >nul 2>nul
if errorlevel 1 (
  echo Python 3.10+ is required. Install from https://python.org
  pause
  exit /b 1
)

if not exist "venv" (
  echo Creating virtual environment...
  python -m venv venv
)

set VENV_PY=venv\Scripts\python.exe

%VENV_PY% -m pip install --quiet --upgrade pip
%VENV_PY% -m pip install --quiet -r requirements.txt

if not exist ".env" copy ".env.example" ".env" >nul

echo Starting Quiz Server...
%VENV_PY% server.py
pause

@echo off
cd /d "%~dp0"

if exist .venv\Scripts\activate.bat (
    echo Sanal ortam aktive ediliyor...
    call .venv\Scripts\activate.bat
)

set PYTHONPATH=.
echo PYTHONPATH=%PYTHONPATH%
echo.
echo Backend baslatiliyor: http://localhost:8000
echo Dokumantasyon: http://localhost:8000/docs
echo.

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause

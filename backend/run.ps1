# Backend baslatma scripti (PowerShell)
# Kullanim: .\run.ps1   veya   powershell -ExecutionPolicy Bypass -File run.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Sanal ortam varsa aktive et
if (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "Sanal ortam aktive ediliyor..."
    & .\.venv\Scripts\Activate.ps1
}

$env:PYTHONPATH = "."
Write-Host "PYTHONPATH=$env:PYTHONPATH"
Write-Host "Backend baslatiliyor: http://localhost:8000"
Write-Host "Dokumantasyon: http://localhost:8000/docs"
Write-Host ""

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

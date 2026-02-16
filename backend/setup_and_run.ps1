# Ilk kurulum + calistirma (PowerShell)
# pip ile venv olusturur, bagimliliklari yukler, backend'i baslatir

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== Backend kurulumu ===" -ForegroundColor Cyan

# Venv yoksa olustur
if (-not (Test-Path ".venv")) {
    Write-Host "Sanal ortam olusturuluyor..."
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "HATA: python -m venv basarisiz. Python yuklu mu? (python --version)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Sanal ortam aktive ediliyor..."
& .\.venv\Scripts\Activate.ps1

Write-Host "Bagimliliklari yukleniyor..."
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "HATA: pip install basarisiz." -ForegroundColor Red
    exit 1
}

# .env yoksa uyari
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "UYARI: .env dosyasi yok. .env.example'dan kopyalayip duzenleyin." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host ".env olusturuldu. Gerekirse duzenleyin (DATABASE_URL, JWT_SECRET_KEY)." -ForegroundColor Yellow
    }
    Write-Host ""
}

$env:PYTHONPATH = "."
Write-Host ""
Write-Host "Backend baslatiliyor: http://localhost:8000" -ForegroundColor Green
Write-Host "Durdurmak icin Ctrl+C" -ForegroundColor Gray
Write-Host ""

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

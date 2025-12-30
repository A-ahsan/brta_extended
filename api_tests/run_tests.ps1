# 🧪 Run API Tests - Phase 1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧪 Running Phase 1: Health Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "tests/test_phase1_health.py")) {
    Write-Host "❌ Error: Not in api_tests directory" -ForegroundColor Red
    Write-Host "   Please run: cd api_tests" -ForegroundColor Yellow
    exit 1
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found" -ForegroundColor Red
    Write-Host "   Please run setup.ps1 first" -ForegroundColor Yellow
    exit 1
}

Write-Host "Running tests..." -ForegroundColor Yellow
Write-Host ""

# Run pytest with verbose output
pytest tests/test_phase1_health.py -v -s --html=reports/report.html --self-contained-html

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Tests Completed Successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "⚠️  Some Tests Failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 Reports Generated:" -ForegroundColor Yellow
Write-Host "   Excel: excel_reports/" -ForegroundColor Cyan
Write-Host "   HTML:  reports/report.html" -ForegroundColor Cyan
Write-Host ""

# Open Excel reports folder
Write-Host "Opening reports folder..." -ForegroundColor Yellow
Start-Process "excel_reports"

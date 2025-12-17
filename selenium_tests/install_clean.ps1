# Fixed Installation Script for Python 3.14
# Run this to properly install dependencies

Write-Host "========================================" -ForegroundColor Green
Write-Host "BRTA Selenium - Fixed Installation" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Step 1: Delete old venv if exists
if (Test-Path "venv") {
    Write-Host "Step 1: Removing old virtual environment..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force venv
    Write-Host "OK Old venv removed" -ForegroundColor Green
}

# Step 2: Create fresh venv
Write-Host "`nStep 2: Creating fresh virtual environment..." -ForegroundColor Cyan
python -m venv venv
Write-Host "OK Virtual environment created" -ForegroundColor Green

# Step 3: Activate venv
Write-Host "`nStep 3: Activating virtual environment..." -ForegroundColor Cyan
& .\venv\Scripts\Activate.ps1
Write-Host "OK Virtual environment activated" -ForegroundColor Green

# Step 4: Upgrade pip
Write-Host "`nStep 4: Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip 2>&1 | Out-Null
Write-Host "OK Pip upgraded" -ForegroundColor Green

# Step 5: Install core dependencies first
Write-Host "`nStep 5: Installing core packages..." -ForegroundColor Cyan
Write-Host "  Installing selenium..." -ForegroundColor Gray
pip install selenium --quiet

Write-Host "  Installing webdriver-manager..." -ForegroundColor Gray
pip install webdriver-manager --quiet

Write-Host "  Installing pytest..." -ForegroundColor Gray
pip install pytest --quiet

Write-Host "  Installing pytest-html..." -ForegroundColor Gray
pip install pytest-html --quiet

Write-Host "  Installing openpyxl..." -ForegroundColor Gray
pip install openpyxl --quiet

Write-Host "  Installing xlsxwriter..." -ForegroundColor Gray
pip install xlsxwriter --quiet

Write-Host "  Installing python-dotenv..." -ForegroundColor Gray
pip install python-dotenv --quiet

Write-Host "  Installing python-dateutil..." -ForegroundColor Gray
pip install python-dateutil --quiet

Write-Host "  Installing colorlog..." -ForegroundColor Gray
pip install colorlog --quiet

Write-Host "OK Core packages installed" -ForegroundColor Green

# Step 6: Verify installations
Write-Host "`nStep 6: Verifying installations..." -ForegroundColor Cyan
$packages = @("selenium", "webdriver-manager", "pytest", "openpyxl", "python-dotenv")
$allInstalled = $true

foreach ($package in $packages) {
    $result = pip show $package 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK $package" -ForegroundColor Green
    } else {
        Write-Host "  FAIL $package (missing)" -ForegroundColor Red
        $allInstalled = $false
    }
}

if ($allInstalled) {
    Write-Host "`nOK All packages installed successfully!" -ForegroundColor Green
} else {
    Write-Host "`nWARNING Some packages missing. Try manual install." -ForegroundColor Yellow
}

# Step 7: Create directories
Write-Host "`nStep 7: Creating directories..." -ForegroundColor Cyan
$result = python -c "from config import Config; Config.create_directories()" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Directories created" -ForegroundColor Green
} else {
    Write-Host "WARNING Run 'python initialize.py' later to create directories" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Make sure your BRTA app is running at: https://192.168.0.107:3000" -ForegroundColor White
Write-Host "2. Create test user in database (testuser@brta.com / Test@123456)" -ForegroundColor White
Write-Host "3. Run tests: pytest test_phase1_authentication.py -v -s" -ForegroundColor White

Write-Host "`nPress any key to run Phase 1 tests now (or Ctrl+C to exit)..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "`nRunning Phase 1: Authentication Tests..." -ForegroundColor Cyan
pytest test_phase1_authentication.py -v -s

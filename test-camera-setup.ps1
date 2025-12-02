# Quick Camera Test Script
# Run this to verify your HTTPS and camera setup

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BRTA 2.0 - Camera Setup Checker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check mkcert
Write-Host "[1/6] Checking mkcert..." -ForegroundColor Yellow
$mkcert = Get-Command mkcert -ErrorAction SilentlyContinue
if ($mkcert) {
    Write-Host "  ✅ mkcert is installed" -ForegroundColor Green
} else {
    Write-Host "  ❌ mkcert NOT installed!" -ForegroundColor Red
    Write-Host "  Install with: winget install mkcert" -ForegroundColor Yellow
    exit 1
}

# 2. Check certificates
Write-Host "[2/6] Checking SSL certificates..." -ForegroundColor Yellow
if ((Test-Path "cert\cert.pem") -and (Test-Path "cert\key.pem")) {
    Write-Host "  ✅ SSL certificates exist" -ForegroundColor Green
} else {
    Write-Host "  ❌ SSL certificates NOT found!" -ForegroundColor Red
    Write-Host "  Run: .\auto-ssl.ps1" -ForegroundColor Yellow
    exit 1
}

# 3. Check vite.config.js
Write-Host "[3/6] Checking vite.config.js..." -ForegroundColor Yellow
$viteConfig = Get-Content "vite.config.js" -Raw
if ($viteConfig -match "https.*key.*cert") {
    Write-Host "  ✅ Vite configured for HTTPS" -ForegroundColor Green
} else {
    Write-Host "  ❌ Vite NOT configured for HTTPS!" -ForegroundColor Red
    Write-Host "  Run: .\auto-ssl.ps1" -ForegroundColor Yellow
    exit 1
}

# 4. Get network IP
Write-Host "[4/6] Detecting network IP..." -ForegroundColor Yellow
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -like '192.168.*' -or 
    $_.IPAddress -like '10.*' -or 
    $_.IPAddress -like '172.*' 
})[0].IPAddress

if ($ip) {
    Write-Host "  ✅ Network IP: $ip" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No network IP detected (WiFi/LAN not connected?)" -ForegroundColor Yellow
    Write-Host "  You can still use: https://localhost:3000" -ForegroundColor Cyan
}

# 5. Check if dev server is running
Write-Host "[5/6] Checking dev server..." -ForegroundColor Yellow
$devProcess = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*node*"
}
if ($devProcess) {
    Write-Host "  ✅ Node process is running" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Dev server not running" -ForegroundColor Yellow
    Write-Host "  Start with: npm run dev" -ForegroundColor Cyan
}

# 6. Check firewall (port 3000)
Write-Host "[6/6] Checking firewall..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "Vite Dev Server*" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Write-Host "  ✅ Firewall rule exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No firewall rule for port 3000" -ForegroundColor Yellow
    Write-Host "  Mobile access may be blocked" -ForegroundColor Yellow
    Write-Host ""
    $createRule = Read-Host "  Create firewall rule now? (y/n)"
    if ($createRule -eq 'y') {
        try {
            New-NetFirewallRule -DisplayName "Vite Dev Server (Port 3000)" `
                                -Direction Inbound `
                                -LocalPort 3000 `
                                -Protocol TCP `
                                -Action Allow `
                                -ErrorAction Stop
            Write-Host "  ✅ Firewall rule created!" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ Failed to create rule. Run as Administrator." -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Access URLs:" -ForegroundColor White
Write-Host "   Local:    https://localhost:3000" -ForegroundColor Cyan
if ($ip) {
    Write-Host "   Network:  https://$ip:3000" -ForegroundColor Cyan
    Write-Host "   Mobile:   https://$ip:3000" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "📱 Test Camera:" -ForegroundColor White
if ($ip) {
    Write-Host "   https://$ip:3000/verify-vehicle" -ForegroundColor Cyan
} else {
    Write-Host "   https://localhost:3000/verify-vehicle" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "⚡ Quick Start:" -ForegroundColor White
Write-Host "   1. npm run dev          (if not running)" -ForegroundColor Gray
Write-Host "   2. Accept certificate in browser" -ForegroundColor Gray
Write-Host "   3. Allow camera permission" -ForegroundColor Gray
Write-Host "   4. Click 'Scan QR Code'" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Troubleshooting:" -ForegroundColor White
Write-Host "   • Camera not working? Check HTTPS (must have 🔒 icon)" -ForegroundColor Gray
Write-Host "   • Certificate error? Click 'Advanced' → 'Proceed'" -ForegroundColor Gray
Write-Host "   • Mobile can't access? Check same WiFi + firewall" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Setup check complete!" -ForegroundColor Green
Write-Host ""

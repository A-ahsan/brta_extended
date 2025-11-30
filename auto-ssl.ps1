# Auto-generate SSL cert for current network IP and update Vite config
# Usage: Run this script before starting your dev server

# Get current IP address
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' -or $_.IPAddress -like '172.*' })[0].IPAddress
if (-not $ip) {
    Write-Host "❌ Could not detect local network IP!" -ForegroundColor Red
    exit 1
}
Write-Host "Detected local IP: $ip" -ForegroundColor Cyan

# Check mkcert
$mkcert = Get-Command mkcert -ErrorAction SilentlyContinue
if (-not $mkcert) {
    Write-Host "❌ mkcert not found! Please install mkcert first." -ForegroundColor Red
    Write-Host "winget install mkcert"
    exit 1
}

# Create cert directory
$certDir = "cert"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
}

# Generate certificate for current IP
Write-Host "Generating SSL certificate for $ip..." -ForegroundColor Green
cd $certDir
mkcert localhost 127.0.0.1 $ip ::1
cd ..

# Rename cert files for Vite
$certFile = "$certDir\$ip+3.pem"
$keyFile = "$certDir\$ip+3-key.pem"
if (Test-Path $certFile -and Test-Path $keyFile) {
    Rename-Item $certFile cert.pem -Force
    Rename-Item $keyFile key.pem -Force
    Write-Host "Renamed cert.pem and key.pem for Vite." -ForegroundColor Green
} else {
    Write-Host "❌ Certificate files not found!" -ForegroundColor Red
    exit 1
}

# Update vite.config.js
$viteConfig = "vite.config.js"
if (Test-Path $viteConfig) {
    $viteText = Get-Content $viteConfig -Raw
    $viteText = $viteText -replace "https: false", "https: { key: './cert/key.pem', cert: './cert/cert.pem' }"
    Set-Content $viteConfig $viteText
    Write-Host "Updated vite.config.js for HTTPS." -ForegroundColor Green
} else {
    Write-Host "vite.config.js not found! Please update manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ SSL setup complete! Restart your dev server and access https://$ip:3000" -ForegroundColor Cyan
Write-Host "⚠️  Remember: You must trust the certificate in your browser the first time." -ForegroundColor Yellow

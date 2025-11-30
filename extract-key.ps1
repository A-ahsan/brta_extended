# Extract private key from PFX for Vite HTTPS
# Requires OpenSSL to be installed

Write-Host "🔑 Extracting private key from certificate..." -ForegroundColor Green

# Check if OpenSSL is available
$openssl = Get-Command openssl -ErrorAction SilentlyContinue

if (-not $openssl) {
    Write-Host "❌ OpenSSL not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install OpenSSL:" -ForegroundColor Yellow
    Write-Host "   winget install OpenSSL.Light"
    Write-Host ""
    Write-Host "Or download from: https://slproweb.com/products/Win32OpenSSL.html"
    exit 1
}

$certDir = ".\cert"
$pfxPath = "$certDir\localhost.pfx"
$keyPath = "$certDir\key.pem"
$certPath = "$certDir\cert.pem"

if (-not (Test-Path $pfxPath)) {
    Write-Host "❌ Certificate file not found!" -ForegroundColor Red
    Write-Host "Please run .\generate-cert.ps1 first"
    exit 1
}

# Extract private key
Write-Host "Extracting private key..." -ForegroundColor Yellow
$env:OPENSSL_CONF = ""
openssl pkcs12 -in $pfxPath -nocerts -out "$certDir\key-encrypted.pem" -passin pass:brta2025 -passout pass:brta2025

# Remove passphrase from key
openssl rsa -in "$certDir\key-encrypted.pem" -out $keyPath -passin pass:brta2025

# Extract certificate
Write-Host "Extracting certificate..." -ForegroundColor Yellow
openssl pkcs12 -in $pfxPath -clcerts -nokeys -out $certPath -passin pass:brta2025

# Clean up encrypted key
Remove-Item "$certDir\key-encrypted.pem" -Force

Write-Host ""
Write-Host "✅ Certificate and key extracted successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Files ready:" -ForegroundColor Cyan
Write-Host "   - cert/key.pem (private key)"
Write-Host "   - cert/cert.pem (certificate)"
Write-Host ""
Write-Host "📝 Final steps:" -ForegroundColor Yellow
Write-Host "   1. Edit vite.config.js"
Write-Host "   2. Uncomment the HTTPS configuration block"
Write-Host "   3. Restart dev server: npm run dev"
Write-Host "   4. Access at: https://192.168.0.101:3000"
Write-Host ""
Write-Host "⚠️  Your browser will show a security warning." -ForegroundColor Yellow
Write-Host "   Click 'Advanced' -> 'Proceed to site' to continue."
Write-Host "   Camera access will now work over network IP!"

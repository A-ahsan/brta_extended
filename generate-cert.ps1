# Generate Self-Signed SSL Certificate for Local HTTPS Development
# This allows camera access over network IP addresses

Write-Host "Generating SSL Certificate for Local HTTPS..." -ForegroundColor Green

# Auto-detect local IP address
Write-Host "Detecting local IP address..." -ForegroundColor Yellow
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" }).IPAddress | Select-Object -First 1

if (-not $localIP) {
    Write-Host "Could not detect local IP. Using default 192.168.1.100" -ForegroundColor Red
    $localIP = "192.168.1.100"
}

Write-Host "Detected IP: $localIP" -ForegroundColor Cyan

# Create cert directory if it doesn't exist
$certDir = ".\cert"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
}

Write-Host "Creating self-signed certificate..." -ForegroundColor Yellow

# Generate certificate with auto-detected IP
$cert = New-SelfSignedCertificate `
    -Subject "CN=localhost" `
    -DnsName "localhost", "127.0.0.1", $localIP, "*.local" `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -NotAfter (Get-Date).AddYears(5) `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -FriendlyName "BRTA Dev Certificate" `
    -HashAlgorithm SHA256 `
    -KeyUsage DigitalSignature, KeyEncipherment, DataEncipherment `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")

Write-Host "Certificate created with thumbprint: $($cert.Thumbprint)" -ForegroundColor Cyan

# Export certificate and private key
$certPassword = ConvertTo-SecureString -String "brta2025" -Force -AsPlainText
$pfxPath = "$certDir\localhost.pfx"

Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $certPassword | Out-Null

# Convert PFX to PEM format for Vite
Write-Host "Converting to PEM format..." -ForegroundColor Yellow

# Extract certificate
$certPem = "-----BEGIN CERTIFICATE-----`n"
$certPem += [Convert]::ToBase64String($cert.Export('Cert'), 'InsertLineBreaks')
$certPem += "`n-----END CERTIFICATE-----"
Set-Content -Path "$certDir\cert.pem" -Value $certPem

Write-Host ""
Write-Host "Certificate generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "   - cert/localhost.pfx (password: brta2025)"
Write-Host "   - cert/cert.pem"
Write-Host ""
Write-Host "To complete the setup:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option A - Simple (Recommended for testing):"
Write-Host "   1. Trust the certificate in your browser when it warns you"
Write-Host "   2. Just click Advanced then Proceed to site"
Write-Host ""
Write-Host "Option B - Full trust (Better for long-term):"
Write-Host "   1. Double-click cert/localhost.pfx"
Write-Host "   2. Install to Current User then Trusted Root Certification Authorities"
Write-Host "   3. Password: brta2025"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Install OpenSSL if not installed: winget install OpenSSL.Light"
Write-Host "   2. Run: .\extract-key.ps1 (to extract private key)"
Write-Host "   3. Update vite.config.js to enable HTTPS"
Write-Host "   4. Restart your dev server"
Write-Host ""
Write-Host "Access your app at: https://$localIP:3000" -ForegroundColor Green
Write-Host "Or at: https://localhost:3000" -ForegroundColor Green

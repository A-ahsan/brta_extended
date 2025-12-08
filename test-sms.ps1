# SMS System Test Script
# Run this to test your SMS integration

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  BRTA SMS Notification System - Test Suite" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Check if backend is running
Write-Host "1. Checking backend server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://localhost:5000" -Method GET -SkipCertificateCheck -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✓ Backend is running on https://localhost:5000" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Backend not running! Please start it first:" -ForegroundColor Red
    Write-Host "     cd backend" -ForegroundColor Gray
    Write-Host "     node server.js" -ForegroundColor Gray
    exit
}

# Test SMS endpoint with sample data
Write-Host "`n2. Testing SMS API endpoint..." -ForegroundColor Yellow
Write-Host "   Note: This will attempt to send a test SMS" -ForegroundColor Gray

$testData = @{
    userId = "00000000-0000-0000-0000-000000000000"  # Replace with real user ID
    violationNumber = "VIO-2025-TEST001"
    violationName = "Test Violation"
    amount = "1000.00"
    websiteUrl = "https://brta.gov.bd"
} | ConvertTo-Json

Write-Host "`n   Test Payload:" -ForegroundColor Cyan
Write-Host $testData -ForegroundColor Gray

try {
    $smsResponse = Invoke-RestMethod -Uri "https://localhost:5000/api/violations/send-sms" `
        -Method POST `
        -ContentType "application/json" `
        -Body $testData `
        -SkipCertificateCheck `
        -ErrorAction Stop

    if ($smsResponse.success) {
        Write-Host "`n   ✓ SMS API Endpoint Working!" -ForegroundColor Green
        Write-Host "     Message sent to: $($smsResponse.phoneNumber)" -ForegroundColor Green
    } else {
        Write-Host "`n   ⚠ SMS sending failed: $($smsResponse.error)" -ForegroundColor Yellow
        Write-Host "     This might be due to:" -ForegroundColor Gray
        Write-Host "     - Invalid user ID (user not found)" -ForegroundColor Gray
        Write-Host "     - User has no phone number in Supabase Auth" -ForegroundColor Gray
        Write-Host "     - BulkSMSBD API issues" -ForegroundColor Gray
    }
} catch {
    Write-Host "`n   ✗ API Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Check Supabase configuration
Write-Host "`n3. Checking Supabase configuration..." -ForegroundColor Yellow
if (Test-Path "backend\.env") {
    $envContent = Get-Content "backend\.env" -Raw
    
    if ($envContent -match "SUPABASE_URL") {
        Write-Host "   ✓ SUPABASE_URL configured" -ForegroundColor Green
    } else {
        Write-Host "   ✗ SUPABASE_URL missing in .env" -ForegroundColor Red
    }
    
    if ($envContent -match "SUPABASE_SERVICE_ROLE_KEY") {
        Write-Host "   ✓ SUPABASE_SERVICE_ROLE_KEY configured" -ForegroundColor Green
    } else {
        Write-Host "   ✗ SUPABASE_SERVICE_ROLE_KEY missing in .env" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ backend\.env file not found!" -ForegroundColor Red
}

# Instructions for manual testing
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  Manual Testing Instructions" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

Write-Host "1. Get a real user ID from Supabase:" -ForegroundColor Yellow
Write-Host "   - Go to Supabase Dashboard > Authentication > Users" -ForegroundColor Gray
Write-Host "   - Copy a user's ID (UUID)" -ForegroundColor Gray
Write-Host "   - Ensure that user has a phone number (01XXXXXXXXX)`n" -ForegroundColor Gray

Write-Host "2. Test via Police Dashboard:" -ForegroundColor Yellow
Write-Host "   - Login as police officer" -ForegroundColor Gray
Write-Host "   - Scan a vehicle QR code" -ForegroundColor Gray
Write-Host "   - Click 'Add Violation'" -ForegroundColor Gray
Write-Host "   - Fill in violation details and submit" -ForegroundColor Gray
Write-Host "   - Check console for SMS logs`n" -ForegroundColor Gray

Write-Host "3. Test via cURL (PowerShell):" -ForegroundColor Yellow
Write-Host @"
   `$body = @{
       userId = 'YOUR-USER-UUID-HERE'
       violationNumber = 'VIO-2025-TEST'
       violationName = 'Test Fine'
       amount = '500.00'
       websiteUrl = 'https://brta.gov.bd'
   } | ConvertTo-Json

   Invoke-RestMethod -Uri 'https://localhost:5000/api/violations/send-sms' ``
       -Method POST ``
       -ContentType 'application/json' ``
       -Body `$body ``
       -SkipCertificateCheck
"@ -ForegroundColor Gray

Write-Host "`n4. Check SMS Balance:" -ForegroundColor Yellow
Write-Host "   Visit: http://bulksmsbd.net/api/getBalanceApi?api_key=WUc2EjFMY7abkO72ojC5" -ForegroundColor Gray

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  Expected SMS Format" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

Write-Host @"
**TEST MESSAGE**
BRTA Fine Alert!
Fine #VIO-2025-123456
Reason: Over Speeding
Amount: 2000.00 BDT
Visit BRTA 2.0 to pay
"@ -ForegroundColor White

Write-Host "`n================================================`n" -ForegroundColor Cyan

Write-Host "Test complete! Check the results above." -ForegroundColor Green
Write-Host "For detailed setup, see: SMS_NOTIFICATION_SETUP.md`n" -ForegroundColor Cyan

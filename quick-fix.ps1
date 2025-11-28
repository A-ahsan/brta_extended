# Quick Fix Script - Run this after SQL setup
# This script will clear cache and restart servers

Write-Host "🔧 BRTA System Fix Script" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Step 1: Check if SQL was run
Write-Host "⚠️  IMPORTANT: Have you run the SQL script in Supabase?" -ForegroundColor Yellow
Write-Host "   Location: database/fix_all_issues.sql" -ForegroundColor Yellow
$sqlRun = Read-Host "   Type 'yes' to continue"

if ($sqlRun -ne "yes") {
    Write-Host "`n❌ Please run the SQL script first!" -ForegroundColor Red
    Write-Host "   1. Go to https://supabase.com/dashboard" -ForegroundColor White
    Write-Host "   2. SQL Editor → Copy database/fix_all_issues.sql" -ForegroundColor White
    Write-Host "   3. Run it, then restart this script`n" -ForegroundColor White
    exit
}

# Step 2: Kill any running dev servers
Write-Host "`n🛑 Stopping running servers..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Step 3: Clear node_modules cache (optional but recommended)
Write-Host "🗑️  Clearing build cache..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
if (Test-Path "node_modules/.vite") {
    Remove-Item -Recurse -Force "node_modules/.vite"
}

# Step 4: Start frontend
Write-Host "`n✅ Starting frontend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
Start-Sleep -Seconds 3

# Step 5: Start backend
Write-Host "✅ Starting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; node server.js"

Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Green

Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Open browser: http://localhost:3000" -ForegroundColor White
Write-Host "   2. Press F12 → Application → Clear site data" -ForegroundColor White
Write-Host "   3. Login and test the system" -ForegroundColor White
Write-Host "   4. Check the URGENT_FIXES.md for testing checklist`n" -ForegroundColor White

Write-Host "⚡ Both servers are now running in separate windows!" -ForegroundColor Yellow
Write-Host "   Press any key to exit this script..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

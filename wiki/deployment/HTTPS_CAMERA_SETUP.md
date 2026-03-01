# HTTPS & Camera Setup Guide

## Problem
Camera/QR scanner doesn't work because:
1. **Modern browsers require HTTPS** for camera access (security feature)
2. **HTTP doesn't allow camera** on network IPs (only works on localhost)

---

## ✅ Quick Setup (Windows)

### Step 1: Install mkcert (One-time setup)

```powershell
# Install mkcert using winget
winget install mkcert

# Install the local CA (Certificate Authority)
mkcert -install
```

**What this does**: Creates a trusted local certificate authority that your browser will trust.

---

### Step 2: Get Your Network IP

```powershell
# Check your current IP address
ipconfig
```

Look for **IPv4 Address** under your network adapter (e.g., `192.168.1.100`)

---

### Step 3: Generate SSL Certificate

```powershell
# Navigate to your project
cd D:\My_Project\brta_extended

# Run the auto-ssl script
.\auto-ssl.ps1
```

**What this does**: 
- Detects your network IP automatically
- Generates SSL certificate for: `localhost`, `127.0.0.1`, your IP, `::1`
- Updates vite.config.js automatically
- Creates `cert/cert.pem` and `cert/key.pem` files

---

### Step 4: Start Dev Server

```powershell
# Start frontend (in main project directory)
npm run dev

# Start backend (in another terminal)
cd backend
node server.js
```

**Frontend will run on**: `https://YOUR_IP:3000`  
**Backend runs on**: `http://localhost:5000`

---

### Step 5: Trust Certificate (First Time Only)

#### On Your Computer:
1. Browser will show **"Your connection is not private"**
2. Click **"Advanced"**
3. Click **"Proceed to YOUR_IP (unsafe)"** or **"Accept the Risk"**
4. Done! Certificate is now trusted.

#### On Mobile Device:
1. Connect to same WiFi network
2. Open browser on mobile
3. Go to `https://YOUR_IP:3000`
4. Browser shows warning
5. Tap **"Advanced"** → **"Proceed"**
6. Now camera will work!

---

## 📱 Mobile Access

### Find Your Network IP:
```powershell
ipconfig
```
Example output: `192.168.1.100`

### Access from Mobile:
1. Connect mobile to **same WiFi**
2. Open mobile browser
3. Go to: `https://192.168.1.100:3000` (use YOUR IP)
4. Accept certificate warning (one time)
5. Camera should now work!

---

## 🔧 Troubleshooting

### Problem 1: "mkcert not found"
**Solution**:
```powershell
# Install mkcert
winget install mkcert

# Restart PowerShell
# Run mkcert -install
```

### Problem 2: Camera still not working
**Checklist**:
- ✅ Using **HTTPS** (not HTTP)
- ✅ Accepted certificate warning in browser
- ✅ Granted camera permission when prompted
- ✅ On mobile: same WiFi network
- ✅ Certificate generated for correct IP

**Force camera permission**:
1. Browser settings → Site settings
2. Find your site (https://YOUR_IP:3000)
3. Camera → Allow

### Problem 3: "Cannot access from mobile"
**Solutions**:
```powershell
# Check Windows Firewall
# Add rule for port 3000

# Or temporarily disable firewall for testing
# Control Panel → Windows Defender Firewall → Turn off
```

### Problem 4: IP Changed (WiFi reconnected)
**Solution**:
```powershell
# Your IP changed, regenerate certificate
.\auto-ssl.ps1

# Restart dev server
npm run dev
```

### Problem 5: Certificate Error Persists
**Solution**:
```powershell
# Clear browser cache
# Or use incognito/private mode
# Or try different browser (Chrome, Firefox, Edge)
```

---

## 🎯 Testing Camera Access

### Test 1: Check HTTPS
Open browser console (F12):
```javascript
console.log(window.location.protocol)
// Should show: "https:"
```

### Test 2: Check Camera Permission
```javascript
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    console.log('✅ Camera works!');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.error('❌ Camera error:', err));
```

### Test 3: QR Scanner
1. Open: `https://YOUR_IP:3000/verify-vehicle`
2. Click "Scan QR Code"
3. Click "Camera" mode
4. Browser asks for camera permission → Click **Allow**
5. Camera should open!

---

## 📝 Quick Reference

### Commands
```powershell
# Setup (one-time)
winget install mkcert
mkcert -install

# Generate cert (when IP changes)
.\auto-ssl.ps1

# Start servers
npm run dev              # Frontend (HTTPS)
cd backend; node server.js  # Backend (HTTP)
```

### URLs
- **Local**: `https://localhost:3000`
- **Network**: `https://YOUR_IP:3000` (e.g., `https://192.168.1.100:3000`)
- **Public Verify**: `https://YOUR_IP:3000/verify-vehicle`
- **Police**: `https://YOUR_IP:3000/police-login`

### Ports
- **Frontend**: 3000 (HTTPS)
- **Backend**: 5000 (HTTP)

---

## 🚀 Production Deployment

For production, use a real domain with proper SSL:

1. **Deploy to hosting** (Vercel, Netlify, etc.)
2. **Use custom domain** (e.g., brta.yourdomain.com)
3. **Automatic SSL** provided by hosting
4. **Camera works** automatically (trusted certificate)

---

## ⚡ Alternative: ngrok (Quick Testing)

If you can't get local HTTPS working:

```powershell
# Install ngrok
winget install ngrok

# Expose your local server
ngrok http 3000

# Use the HTTPS URL provided
# Example: https://abc123.ngrok.io
```

**Pros**: Instant HTTPS with trusted certificate  
**Cons**: URL changes each time, slower than local network

---

## 🔒 Security Notes

- **mkcert certificates** are only trusted on your devices
- **Not for production** - use real certificates in production
- **Safe for development** - certificates only work locally
- **No risk** - other people can't use your certificates

---

## ✅ Success Checklist

Before testing camera:
- [ ] mkcert installed
- [ ] mkcert -install run
- [ ] auto-ssl.ps1 executed successfully
- [ ] cert/cert.pem and cert/key.pem exist
- [ ] npm run dev running
- [ ] Accessing via HTTPS (not HTTP)
- [ ] Certificate warning accepted in browser
- [ ] Camera permission granted when prompted
- [ ] (Mobile) Connected to same WiFi

---

**All set! Camera should work now on both laptop and mobile!** 📱💻

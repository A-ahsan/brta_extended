# 🔐 Enable HTTPS for Camera Access on Network IP

This guide helps you enable HTTPS so the camera works when accessing the app from network IP addresses (like `192.168.0.101:3000`).

## ⚡ Quick Setup

### Step 1: Generate SSL Certificate

```powershell
.\generate-cert.ps1
```

This creates a self-signed certificate for local development.

### Step 2: Extract Private Key (requires OpenSSL)

**Install OpenSSL first:**
```powershell
winget install OpenSSL.Light
```

**Then extract the key:**
```powershell
.\extract-key.ps1
```

### Step 3: Enable HTTPS in Vite

Edit `vite.config.js` and **uncomment** the HTTPS configuration:

```javascript
server: {
  port: 3000,
  host: '0.0.0.0',
  https: {
    key: './cert/key.pem',
    cert: './cert/cert.pem'
  }
},
```

### Step 4: Restart Dev Server

```powershell
npm run dev
```

### Step 5: Access Over HTTPS

Open in browser:
```
https://192.168.0.101:3000
```

**You'll see a security warning** - this is normal for self-signed certificates.

Click: **Advanced** → **Proceed to site**

✅ **Camera will now work!**

---

## 🚀 Alternative: Simple Method (No OpenSSL)

If you don't want to install OpenSSL, use this simpler approach:

### Use mkcert (Recommended)

1. **Install mkcert:**
```powershell
winget install mkcert
```

2. **Create local CA:**
```powershell
mkcert -install
```

3. **Generate certificate:**
```powershell
mkdir cert
cd cert
mkcert localhost 127.0.0.1 192.168.0.101 ::1
cd ..
```

4. **Rename files:**
```powershell
Rename-Item .\cert\localhost+3.pem cert.pem
Rename-Item .\cert\localhost+3-key.pem key.pem
```

5. **Enable HTTPS in vite.config.js** (uncomment the https block)

6. **Restart server and access via https://192.168.0.101:3000**

---

## 📱 Testing on Mobile Devices

Once HTTPS is enabled:

1. Connect your phone to the same WiFi
2. Visit `https://192.168.0.101:3000` on your phone
3. Accept the security warning
4. Camera will work on mobile too! 📷

---

## 🛠️ Troubleshooting

### "Certificate not trusted"
- This is normal for self-signed certificates
- Just click "Advanced" → "Proceed"
- Or install the certificate in your system's trusted root certificates

### "OpenSSL not found"
- Install via: `winget install OpenSSL.Light`
- Or download from: https://slproweb.com/products/Win32OpenSSL.html

### "Camera still not working"
- Make sure you're using `https://` not `http://`
- Check browser console for errors
- Try clearing browser cache and reloading

---

## 📌 Important Notes

- **Development only**: These certificates are for local development only
- **Browser warnings**: Self-signed certificates will always show warnings
- **Production**: Use proper SSL certificates from Let's Encrypt or similar
- **Security**: The password "brta2025" is only for local development

---

## 🎯 Why This is Needed

Modern browsers **require HTTPS** for:
- Camera access (`getUserMedia`)
- Microphone access
- Geolocation
- Service workers
- Other sensitive APIs

**Exception**: `localhost` and `127.0.0.1` work over HTTP

**Network IPs**: `192.168.x.x` require HTTPS for camera access

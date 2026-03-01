# 🚀 FREE DEPLOYMENT GUIDE - BRTA Extended

## 📦 What You Have
- **Frontend:** React + Vite app
- **Backend:** Node.js/Express server
- **Database:** Supabase (already hosted!)

---

## 🎯 RECOMMENDED: Vercel + Render

### **Part 1: Deploy Frontend to Vercel**

#### 1. **Sign up & Connect Repository**
```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Or use GitHub integration (recommended)
```

#### 2. **Via Vercel Website (Easiest)**
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (leave as root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

#### 3. **Environment Variables**
Add these in Vercel Dashboard → Settings → Environment Variables:
```env
VITE_SUPABASE_URL=https://tcqatmkqmvaseakicqkr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjcWF0bWtxbXZhc2Vha2ljcWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzYyNTgsImV4cCI6MjA3OTY1MjI1OH0.I0ja_FAds6VBLu5OxZvyMR1LhQf-EPp77goGaYvrTgY
VITE_OPENROUTER_API_KEY=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
VITE_BACKEND_URL=https://your-backend-url.onrender.com
```

#### 4. **Deploy**
Click "Deploy" - Done in 2 minutes! ✅

---

### **Part 2: Deploy Backend to Render**

#### 1. **Sign up at [render.com](https://render.com)**

#### 2. **Create New Web Service**
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** brta-backend
   - **Root Directory:** `backend`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

#### 3. **Environment Variables**
Add in Render Dashboard:
```env
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://tcqatmkqmvaseakicqkr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SSLCZ_STORE_ID=testbox
SSLCZ_STORE_PASSWORD=qwerty
SSLCZ_API_URL=https://sandbox.sslcommerz.com/gwprocess/v4/api.php
OPENROUTER_API_KEY=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
```

#### 4. **Get Backend URL**
After deployment, copy your backend URL (e.g., `https://brta-backend-abc123.onrender.com`)

#### 5. **Update Frontend Environment**
Go back to Vercel → Settings → Environment Variables:
- Update `VITE_BACKEND_URL` with your Render backend URL
- Redeploy frontend

---

## 🔄 ALTERNATIVE: Railway (Better Performance)

### **Backend on Railway**

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Configure:
   - **Root Directory:** `backend`
   - **Start Command:** `npm start`
   - Add same environment variables as above
6. Get Railway URL and update Vercel `VITE_BACKEND_URL`

**Pros:**
- ✅ No sleep (stays active)
- ✅ Better performance
- ✅ $5 free monthly credits
- ❌ Credits run out faster for heavy usage

---

## 📱 ALTERNATIVE: Netlify + Fly.io

### **Frontend on Netlify**
1. [netlify.com](https://netlify.com) → New site from Git
2. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Add environment variables
4. Deploy

### **Backend on Fly.io**
1. Install Fly CLI:
```bash
npm install -g flyctl
```

2. Login and launch:
```bash
cd backend
fly auth login
fly launch
```

3. Add secrets:
```bash
fly secrets set SUPABASE_URL=your-url
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
# ... add all other env vars
```

4. Deploy:
```bash
fly deploy
```

---

## ⚠️ IMPORTANT MODIFICATIONS NEEDED

### **1. Remove HTTPS from Backend (Not Needed)**
Hosting platforms provide HTTPS automatically. Update `backend/server.js`:

**Remove these lines:**
```javascript
// Remove HTTPS configuration
import https from 'https';
import fs from 'fs';

// Remove this block:
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  server = https.createServer(httpsOptions, app);
  console.log('🔒 HTTPS enabled for backend');
} else {
  server = app;
  console.log('⚠️  HTTPS certificates not found, running on HTTP');
}
```

**Replace with:**
```javascript
const server = app;
```

### **2. Update CORS Configuration**
In `backend/server.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://your-vercel-app.vercel.app' // Add your Vercel domain
  ],
  credentials: true
}));
```

---

## 💰 COST BREAKDOWN (FREE!)

| Service | Free Tier | Cost |
|---------|-----------|------|
| **Vercel** (Frontend) | 100GB bandwidth, unlimited deployments | $0 |
| **Render** (Backend) | 750 hours/month | $0 |
| **Supabase** (Database) | 500MB database, 1GB file storage | $0 |
| **Total** | | **$0/month** |

---

## 🎯 QUICK START (5 Minutes)

### **Option A: Via CLI**

```bash
# 1. Install CLIs
npm i -g vercel

# 2. Deploy Frontend
cd d:/My_Project/brta_extended
vercel --prod

# 3. Deploy Backend (Render via GitHub - use web interface)
# OR use Railway:
cd backend
npm i -g railway
railway login
railway init
railway up
```

### **Option B: Via GitHub (Easiest)**

1. **Push to GitHub:**
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Connect Services:**
   - Vercel → Import GitHub repo (select main folder)
   - Render → Import GitHub repo (select backend folder)

3. **Add environment variables in both dashboards**

4. **Done!** ✅

---

## 🚨 LIMITATIONS TO KNOW

### **Render Free Tier:**
- ⚠️ Spins down after 15 min inactivity
- ⚠️ First request takes 30-60 sec to wake up
- ✅ Perfect for testing/portfolio projects

### **Solutions:**
1. Use **Railway** instead (no sleep, but credits-based)
2. Use **cron job** to ping backend every 14 min (keeps it awake)
3. Upgrade to Render paid ($7/month for always-on)

---

## 🔧 TROUBLESHOOTING

### **Build Fails on Vercel:**
- Check `package.json` has correct dependencies
- Ensure `vite.config.js` is present
- Check build logs for missing packages

### **Backend Connection Issues:**
- Verify `VITE_BACKEND_URL` matches your Render URL
- Check CORS settings allow your Vercel domain
- Ensure all env vars are set in Render dashboard

### **Database Connection Issues:**
- Verify Supabase credentials in env vars
- Check Supabase project is not paused
- Ensure service role key is used in backend

---

## 📊 MONITORING (Free Tools)

- **Vercel Analytics:** Built-in (free)
- **Render Metrics:** Dashboard shows CPU/memory
- **Supabase Dashboard:** Database usage and logs
- **UptimeRobot:** Free uptime monitoring (50 monitors)

---

## 🎓 NEXT STEPS

1. ✅ Deploy frontend to Vercel
2. ✅ Deploy backend to Render/Railway
3. ✅ Update environment variables
4. ✅ Test all features
5. ✅ Set up custom domain (optional - free on Vercel/Netlify)
6. ✅ Enable analytics
7. ✅ Set up CI/CD (auto-deploy on git push)

---

## 🌐 CUSTOM DOMAIN (Optional - Free!)

### **Get Free Domain:**
1. [Freenom](http://freenom.com) - Free .tk, .ml, .ga domains
2. [dot.tk](http://dot.tk) - Free domains

### **Add to Vercel:**
1. Vercel Dashboard → Settings → Domains
2. Add your domain
3. Update DNS records as instructed
4. Done!

---

## ✅ CHECKLIST BEFORE DEPLOYMENT

- [ ] Remove `.env` from git (use `.gitignore`)
- [ ] Add environment variables to hosting dashboards
- [ ] Test payment gateway in sandbox mode
- [ ] Update CORS whitelist with production URLs
- [ ] Remove HTTPS configuration from backend
- [ ] Test SMS/Email services with production credentials
- [ ] Set up error monitoring (Sentry free tier)
- [ ] Enable GitHub auto-deploy on both platforms
- [ ] Test all user flows (signup, login, payments)
- [ ] Update README with live URLs

---

## 🎉 DEPLOYMENT COMPLETE!

Your app will be live at:
- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://your-app.onrender.com`

**Total Time:** 10-15 minutes  
**Total Cost:** $0/month  
**Total Awesomeness:** 💯

---

Need help? Check the documentation:
- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app)

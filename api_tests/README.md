# 🧪 API Testing Framework - Phase 1

## ✅ What's Created

### Phase 1: Basic Health & Status Tests (SAFE - Read Only)

```
api_tests/
├── config/
│   └── config.py          # Configuration loader
├── tests/
│   └── test_phase1_health.py  # Health check tests
├── utils/
│   ├── api_client.py      # HTTP client wrapper
│   └── excel_reporter.py  # Excel report generator
├── reports/               # HTML reports
├── excel_reports/         # Excel reports
├── requirements.txt       # Dependencies
├── .env.example          # Environment template
└── conftest.py           # Pytest configuration
```

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```powershell
cd api_tests
pip install -r requirements.txt
```

### Step 2: Configure Environment

```powershell
# Copy example to actual .env
copy .env.example .env

# Edit .env with your actual URLs
notepad .env
```

**Required Configuration:**
```env
API_BASE_URL=https://your-backend.onrender.com
FRONTEND_URL=https://brta-extended.vercel.app
```

⚠️ **IMPORTANT:** 
- Localhost URLs are BLOCKED 
- Only production URLs allowed
- Tests are READ-ONLY (won't modify data)

---

## 🧪 Run Tests

### Run All Phase 1 Tests:
```powershell
cd api_tests
pytest tests/test_phase1_health.py -v -s
```

### Run with HTML Report:
```powershell
pytest tests/test_phase1_health.py -v -s --html=reports/report.html
```

### Run Specific Test:
```powershell
pytest tests/test_phase1_health.py::TestPhase1Health::test_01_backend_server_is_reachable -v
```

---

## 📊 Reports

### Excel Reports
- Generated automatically after test run
- Location: `api_tests/excel_reports/`
- Format: `Phase1_Health_Status_YYYYMMDD_HHMMSS.xlsx`

### HTML Reports  
- Location: `api_tests/reports/`
- Open in browser to view

---

## ✅ Phase 1 Tests (4 Tests - All Safe)

| # | Test Name | What It Tests | Safe? |
|---|-----------|---------------|-------|
| 1 | Backend Server Reachability | Server is online | ✅ Yes |
| 2 | Response Time Check | Response < 3 seconds | ✅ Yes |
| 3 | Server Headers Check | Proper headers present | ✅ Yes |
| 4 | CORS Configuration | CORS enabled | ✅ Yes |

**All tests are READ-ONLY** - They only check if endpoints respond, no data modification.

---

## 🔐 Safety Features

✅ **Localhost Protection** - Blocked by design
✅ **Read-Only Tests** - No POST/PUT/DELETE in Phase 1  
✅ **Timeout Protection** - 30 second timeout
✅ **Retry Logic** - 3 retries on failure
✅ **Error Handling** - Won't crash on errors

---

## 📈 Next Phases (Coming Soon)

- **Phase 2:** GET Endpoint Tests (License, Vehicle data)
- **Phase 3:** Authentication Tests
- **Phase 4:** Payment Flow Tests
- **Phase 5:** POST/PUT Tests (with validation)

---

## 🆘 Troubleshooting

### Error: "LOCALHOST URLs are NOT allowed"
**Solution:** Update `.env` with production URLs

### Error: "No module named 'requests'"
**Solution:** Run `pip install -r requirements.txt`

### Error: "Server unreachable"
**Solution:** 
1. Check if backend is deployed
2. Verify API_BASE_URL in `.env`
3. Check internet connection

---

## 📝 Test Results Format

**Excel Report Columns:**
- # (Test Number)
- Test Name
- Endpoint
- Method (GET/POST/etc)
- Status Code (Actual)
- Expected Code
- Response Time (ms)
- Result (PASS/FAIL)
- Error Message
- Timestamp

---

**Status:** ✅ Phase 1 Complete - Safe for Production
**Next:** Waiting for your backend URL to run tests!

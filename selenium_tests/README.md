# BRTA Selenium Testing Framework

## 🎯 Overview
Comprehensive Selenium test automation framework for BRTA Extended Portal with Excel reporting and visible Edge browser testing.

## 📁 Project Structure
```
selenium_tests/
├── config.py                          # Test configuration
├── driver_manager.py                  # WebDriver management
├── page_objects.py                    # Page Object Models
├── excel_reporter.py                  # Excel report generation
├── requirements.txt                   # Python dependencies
├── .env.example                       # Environment template
│
├── test_phase1_authentication.py      # Phase 1: Auth tests
├── test_phase2_license_application.py # Phase 2: License tests
├── test_phase3_vehicle_registration.py# Phase 3: Vehicle tests
├── test_phase4_route_permits.py       # Phase 4: Route permit tests
├── test_phase5_violations.py          # Phase 5: Violation tests
├── test_phase6_admin_operations.py    # Phase 6: Admin tests
├── test_phase7_police_operations.py   # Phase 7: Police tests
│
├── reports/                           # HTML/JSON reports
├── excel_reports/                     # Excel test reports
├── screenshots/                       # Test screenshots
└── test_data/                         # Test data files
```

## 🚀 Setup Instructions

### 1. Install Python Dependencies
```powershell
cd selenium_tests
pip install -r requirements.txt
```

### 2. Configure Environment
```powershell
# Copy example env file
cp .env.example .env

# Edit .env with your settings
notepad .env
```

### 3. Install Edge WebDriver
WebDriver will be automatically downloaded on first run using `webdriver-manager`.

### 4. Prepare Test Data

**Create Test Users in Database:**
- **User:** testuser@brta.com / Test@123456
- **Admin:** admin@brta.com / Admin@123456
- **Police:** police@brta.com / Police@123456
- **Dealer:** dealer@brta.com / Dealer@123456

## 📊 Test Phases (Feature Split)

### **Phase 1: Authentication** ✅ READY
- Homepage Load
- Navigate to Login
- Login with Valid Credentials
- Login with Invalid Credentials
- Navigate to Signup
- Signup New User
- Password Strength Validation
- Forgot Password Flow

**Run:**
```powershell
pytest test_phase1_authentication.py -v -s
```

### **Phase 2: License Application** (Coming Next)
- New DL Application Modal
- NID Upload & OCR
- Auto-fill Personal Info
- Photo Upload
- Application Submission
- Progress Tracker

### **Phase 3: Face Verification & Exams** (Coming)
- Face Verification Flow
- Online MCQ Exam
- Road Sign Recognition
- Physical Exam Booking

### **Phase 4: Vehicle Registration** (Coming)
- Vehicle Selection
- Tax Token Period
- Payment Flow
- Smart Card Generation
- QR Code Verification

### **Phase 5: Route Permits** (Coming)
- Route Selection on Map
- Distance Calculation
- Document Upload
- Admin Approval
- PDF Download

### **Phase 6: Violations & Impoundments** (Coming)
- View Violations
- Fine Payment
- Impoundment Flow
- Release Payment

### **Phase 7: Admin Operations** (Coming)
- Application Approval
- Test Center Management
- Question Bank
- Route Permit Approval

### **Phase 8: Police Operations** (Coming)
- QR Scanner
- Vehicle Verification
- Add Violation
- Impound Vehicle

## 🎨 Features

### ✅ Visible Testing
- **Edge Browser** opens and shows all actions
- **Slow execution** with configurable delays
- **Scrolling** to elements before interaction
- **Character-by-character** typing for visibility

### ✅ Excel Reporting
- **Test Summary** with statistics
- **Detailed Results** for each test
- **Color-coded** status (Pass/Fail/Skip)
- **Screenshots** linked in report
- **Timestamps** for all tests

### ✅ Page Object Model
- **Maintainable** test code
- **Reusable** page classes
- **Clear separation** of test logic and page structure

### ✅ Error Handling
- **Screenshots** on failure
- **Detailed error** messages
- **Graceful cleanup**

## 🔧 Configuration

Edit `.env` file to customize:

```bash
# Browser Settings
BROWSER=edge                    # Browser type
HEADLESS=false                  # Set to true for headless mode
WINDOW_WIDTH=1920               # Browser width
WINDOW_HEIGHT=1080              # Browser height

# Delays (seconds) - Increase for slower, more visible testing
SHORT_DELAY=1                   # Quick actions
MEDIUM_DELAY=2                  # Normal actions
LONG_DELAY=3                    # Page loads

# Timeouts
IMPLICIT_WAIT=10               # Implicit wait
EXPLICIT_WAIT=20               # Explicit wait
PAGE_LOAD_TIMEOUT=30           # Page load timeout
```

## 📈 Running Tests

### Run Single Phase
```powershell
pytest test_phase1_authentication.py -v -s
```

### Run All Tests
```powershell
pytest -v -s
```

### Run with HTML Report
```powershell
pytest test_phase1_authentication.py --html=reports/report.html -v -s
```

### Run Specific Test
```powershell
pytest test_phase1_authentication.py::TestPhase1Authentication::test_01_homepage_loads -v -s
```

## 📊 Excel Reports

After each test run, find Excel reports in `excel_reports/` folder:
- **Test Summary** sheet with statistics
- **Test Details** sheet with individual results
- **Color-coded** Pass/Fail status
- **Screenshots** paths
- **Execution times**

## 📸 Screenshots

Screenshots are automatically captured:
- **On test failure**
- **At key verification points**
- Saved in `screenshots/` folder with timestamp

## 🎯 Test Case Template

Generate test case template:
```python
from excel_reporter import TestCaseTemplate

TestCaseTemplate.create_template()
```

This creates `test_case_template.xlsx` for documenting test cases.

## 🐛 Troubleshooting

### Browser doesn't open
- Ensure Edge browser is installed
- Check `BROWSER=edge` in `.env`
- Verify `HEADLESS=false`

### Test user not found
- Create test users in Supabase database
- Update credentials in `.env`

### Element not found
- Increase `EXPLICIT_WAIT` in `.env`
- Check if application is running (`npm run dev`)
- Verify `BASE_URL` is correct

### Slow execution
- Reduce delay values in `.env`
- Decrease `IMPLICIT_WAIT`

## 📝 Writing New Tests

Example test structure:
```python
def test_05_new_test(self):
    """
    Test ID: AUTH-005
    Test: Description
    """
    test_id = "AUTH-005"
    test_name = "My New Test"
    start_time = time.time()
    
    try:
        # Test steps
        page = MyPage(self.driver)
        page.do_something()
        
        # Assertion
        assert condition
        
        # Report success
        duration = time.time() - start_time
        self.excel_reporter.add_test_result(
            test_id=test_id,
            category="Category",
            name=test_name,
            description="What this test does",
            status="PASS",
            duration=duration
        )
        
    except Exception as e:
        # Report failure
        duration = time.time() - start_time
        screenshot = self.driver_manager.take_screenshot(f"FAILED_{test_id}")
        
        self.excel_reporter.add_test_result(
            test_id=test_id,
            category="Category",
            name=test_name,
            description="What this test does",
            status="FAIL",
            duration=duration,
            error_msg=str(e),
            screenshot=str(screenshot)
        )
        raise
```

## 🎉 Next Steps

1. **Run Phase 1** to verify setup
2. **Review Excel report** for results
3. **Check screenshots** in screenshots folder
4. **Create test users** if needed
5. **Proceed to Phase 2** when ready

## 📞 Support

For issues or questions, refer to:
- Test logs in console output
- Excel reports in `excel_reports/`
- Screenshots in `screenshots/`
- Main README.md in project root

---

**Happy Testing! 🚀**

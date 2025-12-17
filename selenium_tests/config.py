"""
BRTA Selenium Test Configuration
Loads environment variables and provides test settings
"""

import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

class Config:
    """Test Configuration Class"""
    
    # Base Settings
    BASE_URL = os.getenv('BASE_URL', 'https://192.168.0.107:3000')
    BROWSER = os.getenv('BROWSER', 'edge').lower()
    HEADLESS = os.getenv('HEADLESS', 'false').lower() == 'true'
    
    # Window Settings
    WINDOW_WIDTH = int(os.getenv('WINDOW_WIDTH', '1920'))
    WINDOW_HEIGHT = int(os.getenv('WINDOW_HEIGHT', '1080'))
    
    # Timeout Settings
    IMPLICIT_WAIT = int(os.getenv('IMPLICIT_WAIT', '10'))
    EXPLICIT_WAIT = int(os.getenv('EXPLICIT_WAIT', '20'))
    PAGE_LOAD_TIMEOUT = int(os.getenv('PAGE_LOAD_TIMEOUT', '30'))
    
    # Test User Credentials
    TEST_USER_EMAIL = os.getenv('TEST_USER_EMAIL', 'testuser@brta.com')
    TEST_USER_PASSWORD = os.getenv('TEST_USER_PASSWORD', 'Test@123456')
    
    # Admin Credentials
    TEST_ADMIN_EMAIL = os.getenv('TEST_ADMIN_EMAIL', 'admin@brta.com')
    TEST_ADMIN_PASSWORD = os.getenv('TEST_ADMIN_PASSWORD', 'Admin@123456')
    
    # Police Credentials
    TEST_POLICE_EMAIL = os.getenv('TEST_POLICE_EMAIL', 'police@brta.com')
    TEST_POLICE_PASSWORD = os.getenv('TEST_POLICE_PASSWORD', 'Police@123456')
    
    # Vehicle Adder Credentials
    TEST_VEHICLE_ADDER_EMAIL = os.getenv('TEST_VEHICLE_ADDER_EMAIL', 'dealer@brta.com')
    TEST_VEHICLE_ADDER_PASSWORD = os.getenv('TEST_VEHICLE_ADDER_PASSWORD', 'Dealer@123456')
    
    # Screenshot Settings
    SCREENSHOT_ON_FAILURE = os.getenv('SCREENSHOT_ON_FAILURE', 'true').lower() == 'true'
    SCREENSHOT_DIR = os.getenv('SCREENSHOT_DIR', 'screenshots')
    
    # Test Data
    TEST_NID = os.getenv('TEST_NID', '1234567890123')
    TEST_PHONE = os.getenv('TEST_PHONE', '01712345678')
    TEST_BLOOD_GROUP = os.getenv('TEST_BLOOD_GROUP', 'A+')
    
    # Delays for Visible Testing (seconds)
    SHORT_DELAY = float(os.getenv('SHORT_DELAY', '1'))
    MEDIUM_DELAY = float(os.getenv('MEDIUM_DELAY', '2'))
    LONG_DELAY = float(os.getenv('LONG_DELAY', '3'))
    
    # Directories
    BASE_DIR = Path(__file__).parent
    REPORTS_DIR = BASE_DIR / 'reports'
    EXCEL_DIR = BASE_DIR / 'excel_reports'
    SCREENSHOTS_DIR = BASE_DIR / SCREENSHOT_DIR
    TEST_DATA_DIR = BASE_DIR / 'test_data'
    
    @classmethod
    def create_directories(cls):
        """Create necessary directories if they don't exist"""
        cls.REPORTS_DIR.mkdir(exist_ok=True)
        cls.EXCEL_DIR.mkdir(exist_ok=True)
        cls.SCREENSHOTS_DIR.mkdir(exist_ok=True)
        cls.TEST_DATA_DIR.mkdir(exist_ok=True)

# Create directories on import
Config.create_directories()

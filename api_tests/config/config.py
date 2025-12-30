"""
API Test Configuration
Loads environment variables and provides test settings
"""
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

class Config:
    """Test configuration class"""
    
    # API URLs - PRODUCTION ONLY
    API_BASE_URL = os.getenv('API_BASE_URL', 'https://brta-backend.onrender.com')
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://brta-extended.vercel.app')
    
    # Supabase
    SUPABASE_URL = os.getenv('SUPABASE_URL', '')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', '')
    
    # Test Users
    TEST_USER_EMAIL = os.getenv('TEST_USER_EMAIL', 'testuser@brta.com')
    TEST_USER_PASSWORD = os.getenv('TEST_USER_PASSWORD', 'Test@123456')
    
    TEST_ADMIN_EMAIL = os.getenv('TEST_ADMIN_EMAIL', 'admin@brta.com')
    TEST_ADMIN_PASSWORD = os.getenv('TEST_ADMIN_PASSWORD', 'Admin@123456')
    
    TEST_POLICE_EMAIL = os.getenv('TEST_POLICE_EMAIL', 'police@brta.com')
    TEST_POLICE_PASSWORD = os.getenv('TEST_POLICE_PASSWORD', 'Police@123456')
    
    # Request Settings
    TIMEOUT = int(os.getenv('TIMEOUT_SECONDS', '30'))
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
    
    # Report Settings
    REPORTS_DIR = Path(__file__).parent.parent / 'reports'
    EXCEL_REPORTS_DIR = Path(__file__).parent.parent / 'excel_reports'
    
    # Ensure directories exist
    REPORTS_DIR.mkdir(exist_ok=True)
    EXCEL_REPORTS_DIR.mkdir(exist_ok=True)
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if 'localhost' in cls.API_BASE_URL.lower():
            raise ValueError("⚠️ LOCALHOST URLs are NOT allowed! Use production URLs only.")
        
        if not cls.API_BASE_URL:
            raise ValueError("API_BASE_URL is required")
        
        return True

# Validate on import
Config.validate()

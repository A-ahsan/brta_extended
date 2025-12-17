"""
BRTA Selenium Test - Phase 1: Authentication Tests
Tests login, signup, and password reset functionality
"""

import pytest
import time
from datetime import datetime
from driver_manager import DriverManager
from page_objects import LoginPage, SignupPage, HomePage
from excel_reporter import ExcelReporter
from config import Config
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TestPhase1Authentication:
    """Phase 1: Authentication Test Suite"""
    
    @classmethod
    def setup_class(cls):
        """Setup before all tests"""
        logger.info("=" * 80)
        logger.info("PHASE 1: AUTHENTICATION TESTS - STARTING")
        logger.info("=" * 80)
        
        cls.driver_manager = DriverManager()
        cls.driver = cls.driver_manager.initialize_driver()
        
        # Initialize Excel Reporter
        cls.excel_reporter = ExcelReporter("Phase1_Authentication")
        cls.excel_reporter.initialize_workbook()
        
        cls.test_results = []
    
    @classmethod
    def teardown_class(cls):
        """Cleanup after all tests"""
        # Write Excel report
        cls.excel_reporter.write_results()
        report_path = cls.excel_reporter.save()
        
        logger.info("=" * 80)
        logger.info(f"PHASE 1: AUTHENTICATION TESTS - COMPLETED")
        logger.info(f"Excel Report: {report_path}")
        logger.info("=" * 80)
        
        # Close browser
        time.sleep(Config.LONG_DELAY)  # Pause before closing
        cls.driver_manager.quit()
    
    def test_01_homepage_loads(self):
        """
        Test ID: AUTH-001
        Test: Homepage loads successfully
        """
        test_id = "AUTH-001"
        test_name = "Homepage Load Test"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"TEST: {test_id} - {test_name}")
            logger.info(f"{'='*60}")
            
            homepage = HomePage(self.driver)
            homepage.navigate()
            
            # Verify page title
            assert "BRTA" in self.driver.title or "Bangladesh" in self.driver.title
            
            # Take screenshot
            screenshot = self.driver_manager.take_screenshot("homepage_load")
            
            duration = time.time() - start_time
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="Authentication",
                name=test_name,
                description="Verify homepage loads successfully with BRTA branding",
                status="PASS",
                duration=duration,
                screenshot=str(screenshot)
            )
            
            logger.info(f"✅ PASSED: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot(f"FAILED_{test_id}")
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="Authentication",
                name=test_name,
                description="Verify homepage loads successfully",
                status="FAIL",
                duration=duration,
                error_msg=str(e),
                screenshot=str(screenshot)
            )
            
            logger.error(f"❌ FAILED: {test_name} - {str(e)}")
            raise
    
    def test_02_navigate_to_login(self):
        """
        Test ID: AUTH-002
        Test: Navigate to login page from homepage
        """
        test_id = "AUTH-002"
        test_name = "Navigate to Login Page"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"TEST: {test_id} - {test_name}")
            logger.info(f"{'='*60}")
            
            homepage = HomePage(self.driver)
            homepage.click_login()
            
            # Verify URL changed to login
            time.sleep(Config.MEDIUM_DELAY)
            assert "/login" in self.driver.current_url.lower()
            
            screenshot = self.driver_manager.take_screenshot("navigate_to_login")
            duration = time.time() - start_time
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="Authentication",
                name=test_name,
                description="Click login button on homepage and navigate to login page",
                status="PASS",
                duration=duration,
                screenshot=str(screenshot)
            )
            
            logger.info(f"✅ PASSED: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot(f"FAILED_{test_id}")
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="Authentication",
                name=test_name,
                description="Navigate to login page",
                status="FAIL",
                duration=duration,
                error_msg=str(e),
                screenshot=str(screenshot)
            )
            
            logger.error(f"❌ FAILED: {test_name} - {str(e)}")
            raise
    
    def test_03_login_with_valid_credentials(self):
        """
        Test ID: AUTH-003
        Test: Login with valid credentials
        """
        test_id = "AUTH-003"
        test_name = "Login with Valid Credentials"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"TEST: {test_id} - {test_name}")
            logger.info(f"{'='*60}")
            
            login_page = LoginPage(self.driver)
            login_page.navigate()
            
            # Perform login
            login_page.login(Config.TEST_USER_EMAIL, Config.TEST_USER_PASSWORD)
            
            # Wait longer for redirect and page load (dashboard or homepage)
            time.sleep(5)  # Give enough time for authentication and redirect
            
            # Verify login success - check URL changed from /login
            current_url = self.driver.current_url
            logger.info(f"Current URL after login: {current_url}")
            
            # Check if redirected away from login page (successful login)
            assert "/login" not in current_url, f"Still on login page: {current_url}"
            
            screenshot = self.driver_manager.take_screenshot("login_success")
            duration = time.time() - start_time
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="Authentication",
                name=test_name,
                description=f"Login with email: {Config.TEST_USER_EMAIL}",
                status="PASS",
                duration=duration,
                screenshot=str(screenshot)
            )
            
            logger.info(f"✅ PASSED: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot(f"FAILED_{test_id}")
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="Authentication",
                name=test_name,
                description="Login with valid credentials",
                status="FAIL",
                duration=duration,
                error_msg=str(e),
                screenshot=str(screenshot)
            )
            
            logger.error(f"❌ FAILED: {test_name} - {str(e)}")
            logger.info("Note: Make sure test user exists in database")
            raise
    
    def test_04_navigate_to_signup(self):
        """
        Test ID: AUTH-004
        Test: Navigate to signup page
        """
        test_id = "AUTH-004"
        test_name = "Navigate to Signup Page"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"TEST: {test_id} - {test_name}")
            logger.info(f"{'='*60}")
            
            homepage = HomePage(self.driver)
            homepage.navigate()
            homepage.click_signup()
            
            # Verify URL changed to signup
            time.sleep(Config.MEDIUM_DELAY)
            assert "/signup" in self.driver.current_url.lower()
            
            screenshot = self.driver_manager.take_screenshot("navigate_to_signup")
            duration = time.time() - start_time
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="Authentication",
                name=test_name,
                description="Click signup button and navigate to registration page",
                status="PASS",
                duration=duration,
                screenshot=str(screenshot)
            )
            
            logger.info(f"✅ PASSED: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot(f"FAILED_{test_id}")
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="Authentication",
                name=test_name,
                description="Navigate to signup page",
                status="FAIL",
                duration=duration,
                error_msg=str(e),
                screenshot=str(screenshot)
            )
            
            logger.error(f"❌ FAILED: {test_name} - {str(e)}")
            raise


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

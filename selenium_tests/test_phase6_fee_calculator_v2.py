

import pytest
import time
import logging
from pathlib import Path
from driver_manager import DriverManager
from excel_reporter import ExcelReporter
from page_objects import FeeCalculatorPage
from config import Config
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class TestPhase6FeeCalculator:
    """Phase 6: Public Fee Calculator Test Suite"""
    
    @pytest.fixture(scope='class', autouse=True)
    def setup_class(self, request):
        """Setup for entire test class"""
        logger.info("\n" + "="*80)
        logger.info("PHASE 6: PUBLIC FEE CALCULATOR TESTS")
        logger.info("="*80)
        
        request.cls.excel_reporter = ExcelReporter("Phase6_Fee_Calculator")
        request.cls.excel_reporter.initialize_workbook()
        
        yield
        
        try:
            request.cls.excel_reporter.write_results()
            report_path = request.cls.excel_reporter.save()
            logger.info(f"\n📊 Excel Report: {report_path}")
        except Exception as e:
            logger.error(f"Error saving report: {e}")
    
    @pytest.fixture(autouse=True)
    def setup_method(self):
        """Setup for each test method"""
        self.driver_manager = DriverManager()
        self.driver = self.driver_manager.initialize_driver()
        
        yield
        
        self.driver_manager.quit()
    
    def test_01_navigate_and_verify_categories(self):
        """Test ID: FEE-001 - Navigate to fee calculator and verify all categories"""
        test_id = "FEE-001"
        test_name = "Navigate and Verify Categories"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}\nTEST: {test_id} - {test_name}\n{'='*60}")
            
            # Navigate to fee calculator
            self.driver.get(f"{Config.BASE_URL}/fee-calculator")
            time.sleep(2)
            
            # Verify page loaded
            assert "/fee-calculator" in self.driver.current_url
            
            # Verify all 4 categories exist
            categories = ["Driving License", "Bike Registration", "Car Registration", "Bike Tax"]
            for cat in categories:
                elem = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, f"//button[contains(., '{cat}')]"))
                )
                assert elem.is_displayed()
                logger.info(f"✓ {cat} category found")
            
            screenshot = self.driver_manager.take_screenshot("fee_calc_categories")
            duration = time.time() - start_time
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="Fee Calculator",
                name=test_name,
                description="Verify fee calculator page loads with all 4 categories",
                status="PASS",
                duration=duration,
                screenshot=screenshot
            )
            logger.info(f"✅ PASS: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot("fee_calc_failed")
            self.excel_reporter.add_test_result(
                test_id=test_id, category="Fee Calculator", name=test_name,
                description="Verify fee calculator page loads with all 4 categories",
                status="FAIL", duration=duration, error_msg=str(e), screenshot=screenshot
            )
            logger.error(f"❌ FAIL: {test_name} - {str(e)}")
            raise
    
    def test_02_driving_license_non_prof_new(self):
        """Test ID: FEE-002 - Calculate Non-Professional New License (৳4,557 for 10 years)"""
        test_id = "FEE-002"
        test_name = "Non-Professional New License Fee"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}\nTEST: {test_id} - {test_name}\n{'='*60}")
            
            self.driver.get(f"{Config.BASE_URL}/fee-calculator")
            time.sleep(2)
            
            # Select Driving License (default)
            driving_license = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Driving License')]"))
            )
            driving_license.click()
            time.sleep(1)
            
            # Select Non-Professional (default)
            non_prof = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Non-Professional')]"))
            )
            non_prof.click()
            time.sleep(1)
            
            # Select New License (default)
            new_license = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'New License')]"))
            )
            new_license.click()
            time.sleep(1)
            
            # Click Calculate
            calc_btn = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Calculate Fee')]"))
            )
            calc_btn.click()
            time.sleep(3)  # Wait for calculation animation
            
            # Verify result appears - look for "Calculated Fee" heading or result section
            logger.info("Waiting for calculation result...")
            result_section = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Calculated Fee') or contains(text(), 'Total Amount') or contains(@class, 'text-4xl')]"))
            )
            assert result_section.is_displayed()
            
            # Verify the amount contains expected value
            page_text = self.driver.find_element(By.TAG_NAME, "body").text
            assert "4,557" in page_text or "4557" in page_text, f"Expected fee not found in page"
            logger.info("✓ Fee ৳4,557 verified")
            
            screenshot = self.driver_manager.take_screenshot("license_non_prof_new")
            duration = time.time() - start_time
            
            self.excel_reporter.add_test_result(
                test_id=test_id, category="Driving License", name=test_name,
                description="Calculate Non-Professional New License: ৳4,557 for 10 years",
                status="PASS", duration=duration, screenshot=screenshot
            )
            logger.info(f"✅ PASS: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot("license_non_prof_failed")
            self.excel_reporter.add_test_result(
                test_id=test_id, category="Driving License", name=test_name,
                description="Calculate Non-Professional New License",
                status="FAIL", duration=duration, error_msg=str(e), screenshot=screenshot
            )
            logger.error(f"❌ FAIL: {test_name} - {str(e)}")
            raise
    
    def test_03_driving_license_prof_renewal(self):
        """Test ID: FEE-003 - Calculate Professional Renewal (৳2,387 for 5 years)"""
        test_id = "FEE-003"
        test_name = "Professional Renewal License Fee"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}\nTEST: {test_id} - {test_name}\n{'='*60}")
            
            self.driver.get(f"{Config.BASE_URL}/fee-calculator")
            time.sleep(2)
            
            # Select Professional
            prof = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Professional') and not(contains(., 'Non'))]"))
            )
            prof.click()
            time.sleep(1)
            
            # Select Renewal
            renewal = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Renewal')]"))
            )
            renewal.click()
            time.sleep(1)
            
            # Click Calculate
            calc_btn = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Calculate Fee')]"))
            )
            calc_btn.click()
            time.sleep(3)
            
            # Verify result appears
            result_section = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Calculated Fee') or contains(text(), 'Total Amount') or contains(@class, 'text-4xl')]"))
            )
            assert result_section.is_displayed()
            page_text = self.driver.find_element(By.TAG_NAME, "body").text
            assert "2,387" in page_text or "2387" in page_text
            logger.info("✓ Fee ৳2,387 verified")
            
            screenshot = self.driver_manager.take_screenshot("license_prof_renewal")
            duration = time.time() - start_time
            
            self.excel_reporter.add_test_result(
                test_id=test_id, category="Driving License", name=test_name,
                description="Calculate Professional Renewal: ৳2,387 for 5 years",
                status="PASS", duration=duration, screenshot=screenshot
            )
            logger.info(f"✅ PASS: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot("license_prof_failed")
            self.excel_reporter.add_test_result(
                test_id=test_id, category="Driving License", name=test_name,
                description="Calculate Professional Renewal",
                status="FAIL", duration=duration, error_msg=str(e), screenshot=screenshot
            )
            logger.error(f"❌ FAIL: {test_name} - {str(e)}")
            raise
    
    def test_04_bike_registration_100cc_2years(self):
        """Test ID: FEE-004 - Calculate Bike Reg 100cc 2 years (৳10,664)"""
        test_id = "FEE-004"
        test_name = "Bike Registration (100cc, 2 years)"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}\nTEST: {test_id} - {test_name}\n{'='*60}")
            
            self.driver.get(f"{Config.BASE_URL}/fee-calculator")
            time.sleep(2)
            
            # Select Bike Registration
            bike_reg = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Bike Registration')]"))
            )
            bike_reg.click()
            time.sleep(1)
            
            # Select Up to 100cc
            engine = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Up to 100cc')]"))
            )
            engine.click()
            time.sleep(1)
            
            # Select 2 Years
            period = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., '2 Years')]"))
            )
            period.click()
            time.sleep(1)
            
            # Calculate
            calc_btn = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Calculate Fee')]"))
            )
            calc_btn.click()
            time.sleep(3)
            
            # Verify result appears
            result_section = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Calculated Fee') or contains(text(), 'Total Amount') or contains(@class, 'text-4xl')]"))
            )
            assert result_section.is_displayed()
            page_text = self.driver.find_element(By.TAG_NAME, "body").text
            assert "10,664" in page_text or "10664" in page_text
            logger.info("✓ Fee ৳10,664 verified")
            
            screenshot = self.driver_manager.take_screenshot("bike_reg_100cc_2yrs")
            duration = time.time() - start_time
            
            self.excel_reporter.add_test_result(
                test_id=test_id, category="Bike Registration", name=test_name,
                description="Calculate Bike Registration (100cc, 2 years): ৳10,664",
                status="PASS", duration=duration, screenshot=screenshot
            )
            logger.info(f"✅ PASS: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot("bike_reg_failed")
            self.excel_reporter.add_test_result(
                test_id=test_id, category="Bike Registration", name=test_name,
                description="Calculate Bike Registration (100cc, 2 years)",
                status="FAIL", duration=duration, error_msg=str(e), screenshot=screenshot
            )
            logger.error(f"❌ FAIL: {test_name} - {str(e)}")
            raise
    
    def test_05_car_registration_1500cc(self):
        """Test ID: FEE-005 - Calculate Car Reg 1500cc (৳40,000)"""
        test_id = "FEE-005"
        test_name = "Car Registration (Up to 1500cc)"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}\nTEST: {test_id} - {test_name}\n{'='*60}")
            
            self.driver.get(f"{Config.BASE_URL}/fee-calculator")
            time.sleep(2)
            
            # Select Car Registration
            car_reg = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Car Registration')]"))
            )
            car_reg.click()
            time.sleep(1)
            
            # Select Up to 1500cc
            engine = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Up to 1500cc')]"))
            )
            engine.click()
            time.sleep(1)
            
            # Calculate
            calc_btn = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Calculate Fee')]"))
            )
            calc_btn.click()
            time.sleep(3)
            
            # Verify result appears
            result_section = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Calculated Fee') or contains(text(), 'Total Amount') or contains(@class, 'text-4xl')]"))
            )
            assert result_section.is_displayed()
            page_text = self.driver.find_element(By.TAG_NAME, "body").text
            assert "40,000" in page_text or "40000" in page_text
            logger.info("✓ Fee ৳40,000 verified")
            
            screenshot = self.driver_manager.take_screenshot("car_reg_1500cc")
            duration = time.time() - start_time
            
            self.excel_reporter.add_test_result(
                test_id=test_id, category="Car Registration", name=test_name,
                description="Calculate Car Registration (1500cc): ৳40,000 (Reg: ৳25,000 + Tax: ৳15,000)",
                status="PASS", duration=duration, screenshot=screenshot
            )
            logger.info(f"✅ PASS: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot("car_reg_failed")
            self.excel_reporter.add_test_result(
                test_id=test_id, category="Car Registration", name=test_name,
                description="Calculate Car Registration (1500cc)",
                status="FAIL", duration=duration, error_msg=str(e), screenshot=screenshot
            )
            logger.error(f"❌ FAIL: {test_name} - {str(e)}")
            raise
    
    def test_06_bike_tax_below100cc_annual(self):
        """Test ID: FEE-006 - Calculate Bike Tax Below 100cc Annual (৳2,300)"""
        test_id = "FEE-006"
        test_name = "Bike Tax (Below 100cc, Annual)"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}\nTEST: {test_id} - {test_name}\n{'='*60}")
            
            self.driver.get(f"{Config.BASE_URL}/fee-calculator")
            time.sleep(2)
            
            # Select Bike Tax
            bike_tax = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Bike Tax')]"))
            )
            bike_tax.click()
            time.sleep(1)
            
            # Select Below 100cc
            engine = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Below 100cc')]"))
            )
            engine.click()
            time.sleep(1)
            
            # Select Annual
            payment_type = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Annual')]"))
            )
            payment_type.click()
            time.sleep(1)
            
            # Calculate
            calc_btn = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Calculate Fee')]"))
            )
            calc_btn.click()
            time.sleep(3)
            
            # Verify result appears
            result_section = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Calculated Fee') or contains(text(), 'Total Amount') or contains(@class, 'text-4xl')]"))
            )
            assert result_section.is_displayed()
            page_text = self.driver.find_element(By.TAG_NAME, "body").text
            assert "2,300" in page_text or "2300" in page_text
            logger.info("✓ Fee ৳2,300 verified")
            
            screenshot = self.driver_manager.take_screenshot("bike_tax_annual")
            duration = time.time() - start_time
            
            self.excel_reporter.add_test_result(
                test_id=test_id, category="Bike Tax Token", name=test_name,
                description="Calculate Bike Tax (Below 100cc, Annual): ৳2,300",
                status="PASS", duration=duration, screenshot=screenshot
            )
            logger.info(f"✅ PASS: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot("bike_tax_failed")
            self.excel_reporter.add_test_result(
                test_id=test_id, category="Bike Tax Token", name=test_name,
                description="Calculate Bike Tax (Below 100cc, Annual)",
                status="FAIL", duration=duration, error_msg=str(e), screenshot=screenshot
            )
            logger.error(f"❌ FAIL: {test_name} - {str(e)}")
            raise


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-s"])

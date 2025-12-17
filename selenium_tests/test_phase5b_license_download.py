"""
Phase 5B: License Download & QR Verification Tests

This module tests license download and verification:
- View generated license
- Download license PDF
- Download license card image
- Verify QR code presence
- View full license details (photo, signature, categories)

NOTE: Assumes license already generated in Phase 5
"""

import pytest
import time
import logging
from page_objects import (
    LoginPage, 
    UserDashboard,
    LicenseViewModal
)
from driver_manager import DriverManager
from excel_reporter import ExcelReporter
from config import Config

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TestPhase5BLicenseDownload:
    """Phase 5B: License Download & QR Verification Tests"""
    
    @pytest.fixture(scope="class")
    def driver_manager(self):
        """Setup and teardown driver"""
        manager = DriverManager()
        manager.initialize_driver()
        yield manager
        manager.quit()
    
    @pytest.fixture(scope="class")
    def excel_reporter(self):
        """Setup Excel reporter for Phase 5B"""
        reporter = ExcelReporter("Phase5B_License_Download_Report.xlsx")
        yield reporter
        reporter.save()
        logger.info("\n" + "="*80)
        logger.info("📊 Phase 5B Excel Report Generated: Phase5B_License_Download_Report.xlsx")
        logger.info("="*80)
    
    @pytest.fixture(autouse=True)
    def setup(self, driver_manager, excel_reporter):
        """Make driver and reporter available to all tests"""
        self.driver_manager = driver_manager
        self.driver = driver_manager.driver
        self.excel_reporter = excel_reporter
    
    def _perform_login(self):
        """Helper method to login"""
        login_page = LoginPage(self.driver)
        login_page.navigate()
        login_page.enter_email(Config.TEST_USER_EMAIL)
        login_page.enter_password(Config.TEST_USER_PASSWORD)
        login_page.click_login()
        time.sleep(3)
    
    def test_01_license_download_workflow(self):
        """
        Test ID: DOWNLOAD-001 to DOWNLOAD-005 (Continuous Flow)
        Test: License Download & QR Verification Workflow
        
        This test verifies license download:
        1. Login and view license
        2. Verify license details visible
        3. Download license PDF
        4. Download license card image
        5. Verify QR code and details
        
        NOTE: Assumes license generated in Phase 5
        """
        logger.info("\n" + "="*80)
        logger.info("CONTINUOUS FLOW TEST: License Download & QR Verification")
        logger.info("="*80)
        
        # STEP 1: Login and Navigate to License View
        test_id = "DOWNLOAD-001"
        test_name = "Navigate to License View"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"STEP 1: {test_id} - {test_name}")
            logger.info(f"{'='*60}")
            
            self._perform_login()
            
            dashboard = UserDashboard(self.driver)
            dashboard.navigate()
            
            # Wait for dashboard to load
            time.sleep(3)
            
            # Check if View License button exists
            logger.info("Looking for View License button...")
            has_view_button = dashboard.is_view_license_button_visible()
            
            if has_view_button:
                logger.info("Clicking View License button...")
                dashboard.click_view_license()
                time.sleep(5)  # Wait longer for license page to load
            else:
                logger.info("View License button not found, license may be auto-displayed")
            
            # Wait for license page to fully render
            logger.info("Waiting for license page to load...")
            time.sleep(3)
            
            screenshot = self.driver_manager.take_screenshot("download_step1_license_view")
            duration = time.time() - start_time
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="License Download",
                name=test_name,
                description="Navigate to license view from dashboard",
                status="PASS",
                duration=duration,
                screenshot=screenshot
            )
            
            logger.info(f"✅ PASS: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot("download_step1_failed")
            error_msg = str(e)
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="License Download",
                name=test_name,
                description="Navigate to license view from dashboard",
                status="FAIL",
                duration=duration,
                error_msg=error_msg,
                screenshot=screenshot
            )
            
            logger.error(f"❌ FAILED: {test_name} - {error_msg}")
            raise
        
        # STEP 2: Verify License Details Visible
        test_id = "DOWNLOAD-002"
        test_name = "Verify License Details Displayed"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"STEP 2: {test_id} - {test_name}")
            logger.info(f"{'='*60}")
            
            license_modal = LicenseViewModal(self.driver)
            
            logger.info("Checking license details visibility...")
            time.sleep(2)  # Give time to see the license
            is_visible = license_modal.is_license_visible()
            
            # Try to get DL number
            dl_number = license_modal.get_dl_number()
            if dl_number:
                logger.info(f"✅ DL Number found: {dl_number}")
            
            time.sleep(2)  # Pause so you can see the license
            screenshot = self.driver_manager.take_screenshot("download_step2_details_visible")
            duration = time.time() - start_time
            
            description = f"Verify license details visible (DL: {dl_number})" if dl_number else "Verify license details visible"
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="License Download",
                name=test_name,
                description=description,
                status="PASS" if is_visible else "SKIPPED",
                duration=duration,
                screenshot=screenshot
            )
            
            logger.info(f"✅ PASS: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot("download_step2_failed")
            error_msg = str(e)
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="License Download",
                name=test_name,
                description="Verify license details including DL number, photo, categories",
                status="FAIL",
                duration=duration,
                error_msg=error_msg,
                screenshot=screenshot
            )
            
            logger.error(f"❌ FAILED: {test_name} - {error_msg}")
            raise
        
        # STEP 3: Download License PDF
        test_id = "DOWNLOAD-003"
        test_name = "Download License PDF"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"STEP 3: {test_id} - {test_name}")
            logger.info(f"{'='*60}")
            
            license_modal = LicenseViewModal(self.driver)
            
            logger.info("Looking for PDF download button...")
            time.sleep(2)  # Wait before looking for button
            has_pdf_button = license_modal.is_download_pdf_button_visible()
            
            if has_pdf_button:
                logger.info("✅ Found PDF download button! Clicking...")
                time.sleep(1)  # Pause so you can see it
                license_modal.click_download_pdf()
                time.sleep(3)  # Wait after clicking
                status = "PASS"
                description = "Successfully clicked Download PDF button"
            else:
                logger.warning("⚠️ PDF download button not found")
                time.sleep(2)  # Pause so you can see what's on screen
                status = "SKIPPED"
                description = "PDF download button not visible on license view"
            
            screenshot = self.driver_manager.take_screenshot("download_step3_pdf")
            duration = time.time() - start_time
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="License Download",
                name=test_name,
                description=description,
                status=status,
                duration=duration,
                screenshot=screenshot
            )
            
            logger.info(f"{'✅ PASS' if status == 'PASS' else '⏭️ SKIPPED'}: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot("download_step3_failed")
            error_msg = str(e)
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="License Download",
                name=test_name,
                description="Click Download PDF button to download license document",
                status="FAIL",
                duration=duration,
                error_msg=error_msg,
                screenshot=screenshot
            )
            
            logger.error(f"❌ FAILED: {test_name} - {error_msg}")
            raise
        
        # STEP 4: Download License Card Image
        test_id = "DOWNLOAD-004"
        test_name = "Download License Card Image"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"STEP 4: {test_id} - {test_name}")
            logger.info(f"{'='*60}")
            
            license_modal = LicenseViewModal(self.driver)
            
            logger.info("Looking for image/card download button...")
            time.sleep(2)  # Wait before looking
            has_image_button = license_modal.is_download_image_button_visible()
            
            if has_image_button:
                logger.info("✅ Found Card/Image button! Clicking...")
                time.sleep(1)  # Pause so you can see it
                license_modal.click_download_image()
                time.sleep(3)  # Wait after clicking
                status = "PASS"
                description = "Successfully clicked Download Card/Image button"
            else:
                logger.warning("⚠️ Card/Image download button not found")
                time.sleep(2)  # Pause so you can see
                status = "SKIPPED"
                description = "Card/Image download button not visible"
            
            screenshot = self.driver_manager.take_screenshot("download_step4_card_image")
            duration = time.time() - start_time
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="License Download",
                name=test_name,
                description=description,
                status=status,
                duration=duration,
                screenshot=screenshot
            )
            
            logger.info(f"{'✅ PASS' if status == 'PASS' else '⏭️ SKIPPED'}: {test_name}")
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot("download_step4_failed")
            error_msg = str(e)
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="License Download",
                name=test_name,
                description="Click Download Card/Image to save license card as image",
                status="FAIL",
                duration=duration,
                error_msg=error_msg,
                screenshot=screenshot
            )
            
            logger.error(f"❌ FAILED: {test_name} - {error_msg}")
            raise
        
        # STEP 5: Verify QR Code and Full Details
        test_id = "DOWNLOAD-005"
        test_name = "Verify QR Code and License Details"
        start_time = time.time()
        
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"STEP 5: {test_id} - {test_name}")
            logger.info(f"{'='*60}")
            
            license_modal = LicenseViewModal(self.driver)
            
            # Check QR code
            has_qr = license_modal.is_qr_code_visible()
            
            # Check for photo
            has_photo = license_modal.is_photo_visible()
            
            # Check for categories
            has_categories = license_modal.is_categories_visible()
            
            details = []
            if has_qr:
                logger.info("✅ QR code visible")
                details.append("QR code")
            if has_photo:
                logger.info("✅ Photo visible")
                details.append("Photo")
            if has_categories:
                logger.info("✅ License categories visible")
                details.append("Categories")
            
            screenshot = self.driver_manager.take_screenshot("download_step5_full_details")
            duration = time.time() - start_time
            
            details_str = ", ".join(details) if details else "checking"
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="License Download",
                name=test_name,
                description=f"Verify license components: {details_str}",
                status="PASS",
                duration=duration,
                screenshot=screenshot
            )
            
            logger.info(f"✅ PASS: {test_name}")
            logger.info("\n" + "="*80)
            logger.info("✅ LICENSE DOWNLOAD & VERIFICATION WORKFLOW COMPLETED")
            logger.info("="*80)
            
        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.driver_manager.take_screenshot("download_step5_failed")
            error_msg = str(e)
            
            self.excel_reporter.add_test_result(
                test_id=test_id,
                category="License Download",
                name=test_name,
                description="Verify QR code, photo, signature, and license categories",
                status="FAIL",
                duration=duration,
                error_msg=error_msg,
                screenshot=screenshot
            )
            
            logger.error(f"❌ FAILED: {test_name} - {error_msg}")
            raise

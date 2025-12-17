"""
Page Object Models for BRTA Application
Follows Page Object Model design pattern for maintainability
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
from config import Config
import logging

logger = logging.getLogger(__name__)

class BasePage:
    """Base page class with common methods"""
    
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, Config.EXPLICIT_WAIT)
    
    def slow_delay(self):
        """Medium delay for visibility"""
        time.sleep(Config.MEDIUM_DELAY)
    
    def quick_delay(self):
        """Short delay for visibility"""
        time.sleep(Config.SHORT_DELAY)


class LoginPage(BasePage):
    """Login Page Object"""
    
    # Locators - Match actual React Login.jsx
    EMAIL_INPUT = (By.CSS_SELECTOR, "input[type='email']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[type='password']")
    LOGIN_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    SIGNUP_LINK = (By.XPATH, "//a[contains(@href, '/signup')]")
    FORGOT_PASSWORD_LINK = (By.XPATH, "//a[contains(@href, '/forgot-password')]")
    ERROR_MESSAGE = (By.CSS_SELECTOR, ".error, .alert-danger, [role='alert']")
    
    def navigate(self):
        """Navigate to login page"""
        self.driver.get(f"{Config.BASE_URL}/login")
        self.slow_delay()
        logger.info("Navigated to login page")
    
    def enter_email(self, email):
        """Enter email"""
        element = self.wait.until(EC.presence_of_element_located(self.EMAIL_INPUT))
        element.clear()
        element.send_keys(email)
        self.quick_delay()
        logger.info(f"Entered email: {email}")
    
    def enter_password(self, password):
        """Enter password"""
        element = self.wait.until(EC.presence_of_element_located(self.PASSWORD_INPUT))
        element.clear()
        element.send_keys(password)
        self.quick_delay()
        logger.info("Entered password")
    
    def click_login(self):
        """Click login button"""
        element = self.wait.until(EC.element_to_be_clickable(self.LOGIN_BUTTON))
        element.click()
        self.slow_delay()
        logger.info("Clicked login button")
    
    def login(self, email, password):
        """Complete login flow"""
        self.enter_email(email)
        self.enter_password(password)
        self.click_login()
        logger.info(f"Completed login for: {email}")
    
    def click_signup_link(self):
        """Click signup link"""
        element = self.wait.until(EC.element_to_be_clickable(self.SIGNUP_LINK))
        element.click()
        self.slow_delay()
        logger.info("Clicked signup link")
    
    def click_forgot_password(self):
        """Click forgot password link"""
        element = self.wait.until(EC.element_to_be_clickable(self.FORGOT_PASSWORD_LINK))
        element.click()
        self.slow_delay()
        logger.info("Clicked forgot password link")
    
    def get_error_message(self):
        """Get error message if present"""
        try:
            element = self.driver.find_element(*self.ERROR_MESSAGE)
            return element.text
        except:
            return None


class SignupPage(BasePage):
    """Signup Page Object"""
    
    # Locators
    FULL_NAME_INPUT = (By.CSS_SELECTOR, "input[name='name'], input[placeholder*='Name']")
    EMAIL_INPUT = (By.CSS_SELECTOR, "input[type='email'], input[name='email']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[type='password'][name='password']")
    CONFIRM_PASSWORD_INPUT = (By.CSS_SELECTOR, "input[type='password'][name='confirmPassword']")
    PHONE_INPUT = (By.CSS_SELECTOR, "input[name='phone'], input[placeholder*='Phone']")
    SIGNUP_BUTTON = (By.XPATH, "//button[contains(text(), 'Sign Up') or contains(text(), 'সাইন আপ')]")
    LOGIN_LINK = (By.XPATH, "//a[contains(text(), 'Login') or contains(text(), 'লগইন')]")
    
    def navigate(self):
        """Navigate to signup page"""
        self.driver.get(f"{Config.BASE_URL}/signup")
        self.slow_delay()
        logger.info("Navigated to signup page")
    
    def enter_full_name(self, name):
        """Enter full name"""
        element = self.wait.until(EC.presence_of_element_located(self.FULL_NAME_INPUT))
        element.clear()
        element.send_keys(name)
        self.quick_delay()
        logger.info(f"Entered name: {name}")
    
    def enter_email(self, email):
        """Enter email"""
        element = self.wait.until(EC.presence_of_element_located(self.EMAIL_INPUT))
        element.clear()
        element.send_keys(email)
        self.quick_delay()
        logger.info(f"Entered email: {email}")
    
    def enter_password(self, password):
        """Enter password"""
        element = self.wait.until(EC.presence_of_element_located(self.PASSWORD_INPUT))
        element.clear()
        element.send_keys(password)
        self.quick_delay()
        logger.info("Entered password")
    
    def enter_confirm_password(self, password):
        """Enter confirm password"""
        element = self.wait.until(EC.presence_of_element_located(self.CONFIRM_PASSWORD_INPUT))
        element.clear()
        element.send_keys(password)
        self.quick_delay()
        logger.info("Entered confirm password")
    
    def enter_phone(self, phone):
        """Enter phone number"""
        try:
            element = self.driver.find_element(*self.PHONE_INPUT)
            element.clear()
            element.send_keys(phone)
            self.quick_delay()
            logger.info(f"Entered phone: {phone}")
        except:
            logger.warning("Phone field not found, skipping")
    
    def click_signup(self):
        """Click signup button"""
        element = self.wait.until(EC.element_to_be_clickable(self.SIGNUP_BUTTON))
        element.click()
        self.slow_delay()
        logger.info("Clicked signup button")
    
    def signup(self, name, email, password, phone=None):
        """Complete signup flow"""
        self.enter_full_name(name)
        self.enter_email(email)
        self.enter_password(password)
        self.enter_confirm_password(password)
        if phone:
            self.enter_phone(phone)
        self.click_signup()
        logger.info(f"Completed signup for: {email}")


class HomePage(BasePage):
    """Homepage Object"""
    
    # Locators - Match actual Homepage.jsx navbar and CTA button
    # Login button is in the Navbar (button element with onClick navigate to /login)
    LOGIN_BUTTON = (By.XPATH, "//button[contains(., 'Login') or contains(., 'লগইন')]")
    # Signup/CTA button is the main green button on homepage (with "Apply Now" text)
    SIGNUP_BUTTON = (By.XPATH, "//button[contains(., 'Apply Now') or contains(., 'এখনই আবেদন করুন') or contains(., 'Get Started') or contains(., 'শুরু করুন')]")
    FEATURES_SECTION = (By.CSS_SELECTOR, ".features, #features")
    ABOUT_LINK = (By.XPATH, "//a[contains(text(), 'About') or contains(text(), 'সম্পর্কে')]")
    NOTICES_LINK = (By.XPATH, "//a[contains(@href, '/notices') or contains(text(), 'Notices') or contains(text(), 'নোটিশ')]")
    FEE_CALCULATOR_LINK = (By.XPATH, "//a[contains(text(), 'Fee Calculator') or contains(text(), 'ফি ক্যালকুলেটর')]")
    
    def navigate(self):
        """Navigate to homepage"""
        self.driver.get(Config.BASE_URL)
        self.slow_delay()
        logger.info("Navigated to homepage")
    
    def click_login(self):
        """Click login button"""
        element = self.wait.until(EC.element_to_be_clickable(self.LOGIN_BUTTON))
        element.click()
        self.slow_delay()
        logger.info("Clicked login button on homepage")
    
    def click_signup(self):
        """Click signup button"""
        element = self.wait.until(EC.element_to_be_clickable(self.SIGNUP_BUTTON))
        element.click()
        self.slow_delay()
        logger.info("Clicked signup button on homepage")


class UserDashboard(BasePage):
    """User Dashboard Page Object"""
    
    # Locators
    SIDEBAR = (By.CSS_SELECTOR, "nav, .sidebar, aside")
    LICENSE_TAB = (By.XPATH, "//button[contains(text(), 'License')] | //a[contains(text(), 'License')]")
    VEHICLE_TAB = (By.XPATH, "//button[contains(text(), 'Vehicle')] | //a[contains(text(), 'Vehicle')]")
    PAYMENT_TAB = (By.XPATH, "//button[contains(text(), 'Payment')] | //a[contains(text(), 'Payment')]")
    PROFILE_TAB = (By.XPATH, "//button[contains(text(), 'Profile')] | //a[contains(text(), 'Profile')]")
    NEW_APPLICATION_BUTTON = (By.XPATH, "//button[contains(text(), 'New Application') or contains(text(), 'নতুন আবেদন')]")
    TAKE_EXAM_BUTTON = (By.XPATH, "//button[contains(., 'Take Exam') or contains(., 'পরীক্ষা দিন')]")
    SCHEDULE_PHYSICAL_EXAM_BUTTON = (By.XPATH, "//button[contains(., 'Schedule Exam') or contains(., 'পরীক্ষা নির্ধারণ')]")
    LOGOUT_BUTTON = (By.XPATH, "//button[contains(text(), 'Logout') or contains(text(), 'লগআউট')]")
    
    def navigate(self):
        """Navigate to user dashboard"""
        self.driver.get(f"{Config.BASE_URL}/dashboard")
        self.slow_delay()
        logger.info("Navigated to user dashboard")
    
    def click_license_tab(self):
        """Click license tab"""
        element = self.wait.until(EC.element_to_be_clickable(self.LICENSE_TAB))
        element.click()
        self.slow_delay()
        logger.info("Clicked license tab")
    
    def click_vehicle_tab(self):
        """Click vehicle tab"""
        element = self.wait.until(EC.element_to_be_clickable(self.VEHICLE_TAB))
        element.click()
        self.slow_delay()
        logger.info("Clicked vehicle tab")
    
    def click_new_application(self):
        """Click new application button"""
        element = self.wait.until(EC.element_to_be_clickable(self.NEW_APPLICATION_BUTTON))
        element.click()
        self.slow_delay()
        logger.info("Clicked new application button")
    
    def click_take_exam(self):
        """Click Take Exam button in progress tracker"""
        element = self.wait.until(EC.element_to_be_clickable(self.TAKE_EXAM_BUTTON))
        element.click()
        self.slow_delay()
        logger.info("Clicked Take Exam button")
    
    def click_schedule_physical_exam(self):
        """Click Schedule Physical Exam button in progress tracker"""
        element = self.wait.until(EC.element_to_be_clickable(self.SCHEDULE_PHYSICAL_EXAM_BUTTON))
        element.click()
        self.slow_delay()
        logger.info("Clicked Schedule Physical Exam button")
    
    def is_pay_now_button_visible(self):
        """Check if Pay Now button is visible"""
        try:
            pay_button = (By.XPATH, "//button[contains(., 'Pay Now') or contains(., 'এখনই পরিশোধ করুন')]")
            self.driver.find_element(*pay_button)
            logger.info("Pay Now button is visible")
            return True
        except:
            logger.warning("Pay Now button not visible")
            return False
    
    def click_pay_now(self):
        """Click Pay Now button in progress tracker"""
        pay_button = (By.XPATH, "//button[contains(., 'Pay Now') or contains(., 'এখনই পরিশোধ করুন')]")
        element = self.wait.until(EC.element_to_be_clickable(pay_button))
        element.click()
        self.slow_delay()
        logger.info("Clicked Pay Now button")
    
    def is_generate_license_button_visible(self):
        """Check if Generate License button is visible"""
        try:
            generate_button = (By.XPATH, "//button[contains(., 'Generate License') or contains(., 'Generate DL') or contains(., 'লাইসেন্স তৈরি')]")
            self.driver.find_element(*generate_button)
            logger.info("Generate License button is visible")
            return True
        except:
            logger.warning("Generate License button not visible")
            return False
    
    def click_generate_license(self):
        """Click Generate License button"""
        generate_button = (By.XPATH, "//button[contains(., 'Generate License') or contains(., 'Generate DL') or contains(., 'লাইসেন্স তৈরি')]")
        element = self.wait.until(EC.element_to_be_clickable(generate_button))
        element.click()
        self.slow_delay()
        logger.info("Clicked Generate License button")
    
    def is_view_license_button_visible(self):
        """Check if View License button is visible"""
        try:
            view_button = (By.XPATH, "//button[contains(., 'View Full License') or contains(., 'View License') or contains(., 'View DL') or contains(., 'লাইসেন্স দেখুন')]")
            self.driver.find_element(*view_button)
            logger.info("View License button is visible")
            return True
        except:
            logger.warning("View License button not visible")
            return False
    
    def click_view_license(self):
        """Click View License button"""
        view_button = (By.XPATH, "//button[contains(., 'View Full License') or contains(., 'View License') or contains(., 'View DL') or contains(., 'লাইসেন্স দেখুন')]")
        element = self.wait.until(EC.element_to_be_clickable(view_button))
        element.click()
        self.slow_delay()
        logger.info("Clicked View License button")
    
    def logout(self):
        """Logout from dashboard"""
        element = self.wait.until(EC.element_to_be_clickable(self.LOGOUT_BUTTON))
        element.click()
        self.slow_delay()
        logger.info("Logged out")


class LicenseApplicationModal(BasePage):
    """License Application Modal Page Object"""
    
    # Step 1: License Type Selection
    MODAL_CONTAINER = (By.XPATH, "//div[contains(@class, 'fixed') and contains(@class, 'inset-0')]//div[contains(@class, 'bg-white')]")
    # License type buttons - more flexible selectors
    LIGHT_VEHICLE_BUTTON = (By.XPATH, "//button[contains(., 'Light') and (contains(., 'Bike') or contains(., 'বাইক'))]")
    MOTOR_VEHICLE_BUTTON = (By.XPATH, "//button[contains(., 'Motor') and (contains(., 'Car') or contains(., 'গাড়ি'))]")
    # Category buttons appear after license type selection
    PROFESSIONAL_BUTTON = (By.XPATH, "//button[contains(., 'Professional') and not(contains(., 'Non'))]")
    NON_PROFESSIONAL_BUTTON = (By.XPATH, "//button[contains(., 'Non-Professional') or contains(., 'অপেশাদার')]")
    
    # Step 2: NID Upload
    FILE_UPLOAD_BUTTON = (By.XPATH, "//button[contains(., 'Upload File') or contains(., 'ফাইল আপলোড')]")
    NID_FILE_INPUT = (By.CSS_SELECTOR, "input[type='file']")
    OCR_PROGRESS_BAR = (By.XPATH, "//div[contains(@class, 'progress') or contains(@role, 'progressbar')]")
    NID_NUMBER_INPUT = (By.XPATH, "//input[@type='text' or @type='number']")
    VERIFY_NID_BUTTON = (By.XPATH, "//button[contains(., 'Verify') or contains(., 'যাচাই')]")
    
    # Step 3: Auto-filled Data (after NID verification)
    FULL_NAME_FIELD = (By.XPATH, "//input[@value or @placeholder[contains(., 'Name') or contains(., 'নাম')]]")
    FATHER_NAME_FIELD = (By.XPATH, "//input[@value or @placeholder[contains(., 'Father') or contains(., 'পিতা')]]")
    
    # Step 4: Photo Upload
    USER_PHOTO_INPUT = (By.XPATH, "//input[@type='file' and not(@accept='image/*')]")
    PHOTO_PREVIEW = (By.XPATH, "//img[contains(@alt, 'Photo') or contains(@alt, 'ছবি')]")
    
    # Step 5: Submit
    SUBMIT_APPLICATION_BUTTON = (By.XPATH, "//button[contains(., 'Submit') or contains(., 'জমা') or contains(., 'Apply') or contains(., 'আবেদন')]")
    SUCCESS_MESSAGE = (By.XPATH, "//div[contains(., 'Success') or contains(., 'সফল')]")
    CLOSE_BUTTON = (By.XPATH, "//button[contains(., 'Close') or @aria-label='Close']")
    
    def wait_for_modal(self):
        """Wait for modal to appear"""
        self.wait.until(EC.presence_of_element_located(self.MODAL_CONTAINER))
        self.quick_delay()
        logger.info("License application modal appeared")
    
    def select_light_vehicle(self):
        """Select Light vehicle type"""
        element = self.wait.until(EC.element_to_be_clickable(self.LIGHT_VEHICLE_BUTTON))
        element.click()
        self.quick_delay()
        logger.info("Selected Light vehicle")
    
    def select_motor_vehicle(self):
        """Select Motor vehicle type"""
        element = self.wait.until(EC.element_to_be_clickable(self.MOTOR_VEHICLE_BUTTON))
        element.click()
        self.quick_delay()
        logger.info("Selected Motor vehicle")
    
    def select_professional(self):
        """Select Professional category"""
        element = self.wait.until(EC.element_to_be_clickable(self.PROFESSIONAL_BUTTON))
        element.click()
        self.quick_delay()
        logger.info("Selected Professional category")
    
    def select_non_professional(self):
        """Select Non-Professional category"""
        element = self.wait.until(EC.element_to_be_clickable(self.NON_PROFESSIONAL_BUTTON))
        element.click()
        self.slow_delay()  # Wait for modal to change to next step
        logger.info("Selected Non-Professional category")
    
    def upload_nid_image(self, file_path):
        """Upload NID image"""
        element = self.wait.until(EC.presence_of_element_located(self.NID_FILE_INPUT))
        element.send_keys(file_path)
        self.slow_delay()
        logger.info(f"Uploaded NID image: {file_path}")
    
    def wait_for_ocr_complete(self, timeout=30):
        """Wait for OCR processing to complete"""
        import time
        start_time = time.time()
        logger.info("Waiting for OCR processing...")
        time.sleep(timeout)  # OCR takes time
        logger.info("OCR processing completed")
    
    def get_nid_number(self):
        """Get extracted NID number from input field"""
        try:
            element = self.driver.find_element(*self.NID_NUMBER_INPUT)
            nid_number = element.get_attribute('value')
            logger.info(f"Extracted NID number: {nid_number}")
            return nid_number
        except:
            logger.warning("Could not get NID number from input")
            return None
    
    def click_verify_nid(self):
        """Click Verify NID button"""
        element = self.wait.until(EC.element_to_be_clickable(self.VERIFY_NID_BUTTON))
        element.click()
        self.slow_delay()
        logger.info("Clicked Verify NID button")
    
    def get_autofilled_name(self):
        """Get autofilled full name"""
        try:
            element = self.driver.find_element(*self.FULL_NAME_FIELD)
            name = element.get_attribute('value')
            logger.info(f"Autofilled name: {name}")
            return name
        except:
            return None
    
    def upload_user_photo(self, file_path):
        """Upload user photo"""
        try:
            element = self.wait.until(EC.presence_of_element_located(self.USER_PHOTO_INPUT))
            element.send_keys(file_path)
            self.quick_delay()
            logger.info(f"Uploaded user photo: {file_path}")
        except:
            logger.warning("Could not upload user photo")
    
    def click_submit(self):
        """Click Submit Application button"""
        element = self.wait.until(EC.element_to_be_clickable(self.SUBMIT_APPLICATION_BUTTON))
        element.click()
        self.slow_delay()
        logger.info("Clicked Submit Application button")
    
    def wait_for_success(self):
        """Wait for success message"""
        self.wait.until(EC.presence_of_element_located(self.SUCCESS_MESSAGE))
        self.quick_delay()
        logger.info("Application submitted successfully")
    
    def close_modal(self):
        """Close the modal"""
        try:
            element = self.wait.until(EC.element_to_be_clickable(self.CLOSE_BUTTON))
            element.click()
            self.quick_delay()
            logger.info("Closed application modal")
        except:
            logger.warning("Could not close modal")


class OnlineExamModal:
    """Page object for Online Exam Modal"""
    
    # Selectors
    EXAM_MODAL = (By.XPATH, "//div[contains(@class, 'fixed') and contains(@class, 'inset-0')]")
    INSTRUCTIONS_HEADING = (By.XPATH, "//h3[contains(., 'Online Driving Exam') or contains(., 'অনলাইন ড্রাইভিং পরীক্ষা')]")
    START_EXAM_BUTTON = (By.XPATH, "//button[contains(., 'Start Exam') or contains(., 'পরীক্ষা শুরু করুন')]")
    
    # Exam question elements
    QUESTION_TEXT = (By.XPATH, "//h3[contains(@class, 'text-lg') and contains(@class, 'font-bold')]")
    OPTION_A_BUTTON = (By.XPATH, "//button[.//div[text()='A']]")
    OPTION_B_BUTTON = (By.XPATH, "//button[.//div[text()='B']]")
    OPTION_C_BUTTON = (By.XPATH, "//button[.//div[text()='C']]")
    OPTION_D_BUTTON = (By.XPATH, "//button[.//div[text()='D']]")
    
    NEXT_BUTTON = (By.XPATH, "//button[contains(., 'Next Question') or contains(., 'পরবর্তী প্রশ্ন')]")
    SUBMIT_BUTTON = (By.XPATH, "//button[contains(., 'Submit Exam') or contains(., 'পরীক্ষা জমা দিন')]")
    
    # Results screen
    SUCCESS_SCREEN = (By.XPATH, "//h3[contains(., 'Congratulations') or contains(., 'অভিনন্দন')]")
    FAIL_SCREEN = (By.XPATH, "//h3[contains(., 'Better Luck') or contains(., 'আরও ভাল')]")
    PROCESSING_SCREEN = (By.XPATH, "//h3[contains(., 'Evaluating') or contains(., 'মূল্যায়ন')]")
    
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 20)
    
    def quick_delay(self):
        """Short delay"""
        time.sleep(1)
    
    def slow_delay(self):
        """Longer delay"""
        time.sleep(2)
    
    def wait_for_modal(self):
        """Wait for exam modal to appear"""
        self.wait.until(EC.presence_of_element_located(self.EXAM_MODAL))
        self.quick_delay()
        logger.info("Online exam modal appeared")
    
    def click_start_exam(self):
        """Click Start Exam button"""
        element = self.wait.until(EC.element_to_be_clickable(self.START_EXAM_BUTTON))
        element.click()
        self.slow_delay()
        logger.info("Clicked Start Exam button")
    
    def is_exam_question_visible(self):
        """Check if exam question is visible"""
        try:
            self.wait.until(EC.presence_of_element_located(self.QUESTION_TEXT))
            logger.info("Exam question visible")
            return True
        except:
            logger.warning("Exam question not visible")
            return False
    
    def get_current_question_text(self):
        """Get the text of the current question"""
        try:
            element = self.driver.find_element(*self.QUESTION_TEXT)
            question_text = element.text
            logger.info(f"Current question: {question_text[:50]}...")
            return question_text
        except Exception as e:
            logger.warning(f"Could not get question text: {e}")
            return ""
    
    def select_answer_option(self, option='A'):
        """Select answer option (A, B, C, or D)"""
        option_map = {
            'A': self.OPTION_A_BUTTON,
            'B': self.OPTION_B_BUTTON,
            'C': self.OPTION_C_BUTTON,
            'D': self.OPTION_D_BUTTON
        }
        
        selector = option_map.get(option.upper(), self.OPTION_A_BUTTON)
        
        try:
            element = self.wait.until(EC.element_to_be_clickable(selector))
            element.click()
            logger.info(f"Selected option {option}")
            return True
        except Exception as e:
            logger.warning(f"Could not select option {option}: {e}")
            return False
    
    def click_next_question(self):
        """Click Next Question button"""
        try:
            element = self.wait.until(EC.element_to_be_clickable(self.NEXT_BUTTON))
            element.click()
            logger.info("Clicked Next Question")
            return True
        except:
            logger.warning("Next button not found")
            return False
    
    def click_submit_exam(self):
        """Click Submit Exam button"""
        try:
            element = self.wait.until(EC.element_to_be_clickable(self.SUBMIT_BUTTON))
            element.click()
            logger.info("Clicked Submit Exam")
            return True
        except:
            logger.warning("Submit button not found")
            return False
    
    def is_results_screen_visible(self):
        """Check if results screen is visible (pass or fail)"""
        try:
            # Wait for processing to finish
            time.sleep(5)
            
            # Try to find either success or fail screen
            try:
                self.driver.find_element(*self.SUCCESS_SCREEN)
                logger.info("Success screen visible")
                return True
            except:
                pass
            
            try:
                self.driver.find_element(*self.FAIL_SCREEN)
                logger.info("Fail screen visible")
                return True
            except:
                pass
            
            logger.warning("No results screen found")
            return False
        except Exception as e:
            logger.warning(f"Error checking results screen: {e}")
            return False
    
    def get_exam_result(self):
        """Get exam result (PASS or FAIL)"""
        try:
            try:
                self.driver.find_element(*self.SUCCESS_SCREEN)
                logger.info("Exam result: PASS")
                return "PASS"
            except:
                pass
            
            try:
                self.driver.find_element(*self.FAIL_SCREEN)
                logger.info("Exam result: FAIL")
                return "FAIL"
            except:
                pass
            
            return None
        except:
            return None


class PhysicalExamBookingModal:
    """Page object for Physical Exam Booking Modal"""
    
    # Selectors
    BOOKING_MODAL = (By.XPATH, "//div[contains(@class, 'fixed') and contains(@class, 'inset-0')]")
    MODAL_HEADING = (By.XPATH, "//h2[contains(., 'Physical Exam') or contains(., 'শারীরিক পরীক্ষা')]")
    
    # Test center selection
    TEST_CENTER_CARD = (By.XPATH, "(//div[contains(@class, 'border') and contains(@class, 'rounded-lg')])[1]")
    CONTINUE_BUTTON = (By.XPATH, "//button[contains(., 'Continue') or contains(., 'পরবর্তী')]")
    
    # Date selection
    DATE_DROPDOWN = (By.XPATH, "//select[contains(@class, 'w-full')]")
    FIRST_AVAILABLE_DATE = (By.XPATH, "//select/option[not(contains(., 'Choose')) and not(contains(@value, ''))][1]")
    
    # Confirmation
    CONFIRM_BOOKING_BUTTON = (By.XPATH, "//button[contains(., 'Confirm Booking') or contains(., 'বুকিং নিশ্চিত করুন')]")
    SUCCESS_HEADING = (By.XPATH, "//h2[contains(., 'Booking Confirmed') or contains(., 'Booking Updated') or contains(., 'বুকিং নিশ্চিত')]")
    
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 20)
    
    def quick_delay(self):
        """Short delay"""
        time.sleep(1)
    
    def slow_delay(self):
        """Longer delay"""
        time.sleep(2)
    
    def wait_for_modal(self):
        """Wait for booking modal to appear"""
        self.wait.until(EC.presence_of_element_located(self.BOOKING_MODAL))
        self.quick_delay()
        logger.info("Physical exam booking modal appeared")
    
    def select_first_test_center(self):
        """Select first available test center"""
        try:
            # Find all test center cards that are clickable (not already selected)
            centers = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'cursor-pointer') and contains(@class, 'border-2')]")
            
            if not centers:
                logger.warning("No test centers found")
                return False
            
            # Click first center using JavaScript to avoid interception
            self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", centers[0])
            time.sleep(1)
            self.driver.execute_script("arguments[0].click();", centers[0])
            self.slow_delay()
            logger.info("Selected first test center using JavaScript")
            return True
        except Exception as e:
            logger.warning(f"Could not select test center: {e}")
            return False
    
    def select_first_available_date(self):
        """Select first available date from dropdown"""
        try:
            # Wait for dropdown to be present
            dropdown = self.wait.until(EC.presence_of_element_located(self.DATE_DROPDOWN))
            
            # Scroll into view
            self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", dropdown)
            time.sleep(1)
            
            # Select first non-placeholder option using JavaScript
            self.driver.execute_script("""
                var select = arguments[0];
                for (var i = 0; i < select.options.length; i++) {
                    if (select.options[i].value && select.options[i].value !== '') {
                        select.selectedIndex = i;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }
            """, dropdown)
            self.slow_delay()
            logger.info("Selected first available date")
            return True
        except Exception as e:
            logger.warning(f"Could not select date: {e}")
            return False
    
    def click_continue_to_confirm(self):
        """Click Continue button to go to confirmation"""
        try:
            element = self.wait.until(EC.presence_of_element_located(self.CONTINUE_BUTTON))
            self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", element)
            time.sleep(1)
            self.driver.execute_script("arguments[0].click();", element)
            self.slow_delay()
            logger.info("Clicked Continue to Confirm")
            return True
        except Exception as e:
            logger.warning(f"Could not click Continue: {e}")
            return False
    
    def click_confirm_booking(self):
        """Click Confirm Booking button"""
        try:
            element = self.wait.until(EC.presence_of_element_located(self.CONFIRM_BOOKING_BUTTON))
            self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", element)
            time.sleep(1)
            self.driver.execute_script("arguments[0].click();", element)
            self.slow_delay()
            logger.info("Clicked Confirm Booking")
            return True
        except Exception as e:
            logger.warning(f"Could not click Confirm Booking: {e}")
            return False
    
    def is_success_screen_visible(self):
        """Check if booking success screen is visible"""
        try:
            self.wait.until(EC.presence_of_element_located(self.SUCCESS_HEADING))
            logger.info("Booking success screen visible")
            return True
        except:
            logger.warning("Success screen not visible")
            return False


class PaymentModal:
    """Page object for Payment Modal/Gateway"""
    
    # Selectors for payment modal/gateway
    PAYMENT_MODAL = (By.XPATH, "//div[contains(@class, 'fixed') and contains(@class, 'inset-0')]//h2[contains(., 'Payment') or contains(., 'পেমেন্ট')]")
    PAYMENT_IFRAME = (By.XPATH, "//iframe[contains(@src, 'payment') or contains(@src, 'ssl') or contains(@src, 'bkash')]")
    CLOSE_BUTTON = (By.XPATH, "//button[contains(@class, 'close') or contains(., '×') or contains(., 'Close')]")
    
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
    
    def quick_delay(self):
        """Short delay"""
        time.sleep(1)
    
    def slow_delay(self):
        """Longer delay"""
        time.sleep(2)
    
    def is_payment_gateway_visible(self):
        """Check if payment gateway modal or iframe is visible"""
        try:
            # Check for payment modal
            try:
                self.driver.find_element(*self.PAYMENT_MODAL)
                logger.info("Payment modal visible")
                return True
            except:
                pass
            
            # Check for payment iframe
            try:
                self.driver.find_element(*self.PAYMENT_IFRAME)
                logger.info("Payment iframe visible")
                return True
            except:
                pass
            
            # Check if new window/tab opened
            if len(self.driver.window_handles) > 1:
                logger.info("Payment gateway opened in new window/tab")
                return True
            
            logger.warning("Payment gateway not detected")
            return False
        except Exception as e:
            logger.warning(f"Error checking payment gateway: {e}")
            return False
    
    def close_payment_modal(self):
        """Close payment modal/gateway"""
        try:
            # If new window opened, close it and switch back
            if len(self.driver.window_handles) > 1:
                logger.info("Closing payment window/tab...")
                self.driver.switch_to.window(self.driver.window_handles[-1])
                self.driver.close()
                self.driver.switch_to.window(self.driver.window_handles[0])
                self.slow_delay()
                logger.info("Closed payment window and switched back to main window")
                return True
            
            # Try to find and click close button
            try:
                close_btn = self.wait.until(EC.element_to_be_clickable(self.CLOSE_BUTTON))
                close_btn.click()
                self.quick_delay()
                logger.info("Closed payment modal")
                return True
            except:
                pass
            
            # Try pressing ESC key
            from selenium.webdriver.common.keys import Keys
            self.driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
            self.quick_delay()
            logger.info("Closed payment modal with ESC key")
            return True
            
        except Exception as e:
            logger.warning(f"Could not close payment modal: {e}")
            return False


class LicenseViewModal:
    """Page object for License View/Display"""
    
    # Selectors for license display
    LICENSE_CARD = (By.XPATH, "//div[contains(@class, 'license') or contains(@class, 'dl-card')]")
    LICENSE_MODAL = (By.XPATH, "//div[contains(@class, 'modal')]//h2[contains(., 'License') or contains(., 'DL') or contains(., 'লাইসেন্স')]")
    QR_CODE = (By.XPATH, "//img[contains(@src, 'qr') or contains(@alt, 'QR')]//ancestor::*[contains(@class, 'qr')] | //*[contains(@class, 'qr-code')]")
    DL_NUMBER = (By.XPATH, "//*[contains(text(), 'DL') or contains(text(), 'License Number')]")
    DOWNLOAD_BUTTON = (By.XPATH, "//button[contains(., 'Download') or contains(., 'ডাউনলোড')]")
    VIEW_LICENSE_BUTTON = (By.XPATH, "//button[contains(., 'View License') or contains(., 'লাইসেন্স দেখুন')]")
    
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
    
    def quick_delay(self):
        """Short delay"""
        time.sleep(1)
    
    def slow_delay(self):
        """Longer delay"""
        time.sleep(2)
    
    def is_license_visible(self):
        """Check if license card or modal is visible"""
        try:
            # Check for license card
            try:
                self.driver.find_element(*self.LICENSE_CARD)
                logger.info("License card visible")
                return True
            except:
                pass
            
            # Check for license modal
            try:
                self.driver.find_element(*self.LICENSE_MODAL)
                logger.info("License modal visible")
                return True
            except:
                pass
            
            # Check for DL number text
            try:
                self.driver.find_element(*self.DL_NUMBER)
                logger.info("License details visible")
                return True
            except:
                pass
            
            logger.warning("License not visible")
            return False
        except Exception as e:
            logger.warning(f"Error checking license visibility: {e}")
            return False
    
    def is_qr_code_visible(self):
        """Check if QR code is visible on license"""
        try:
            self.driver.find_element(*self.QR_CODE)
            logger.info("QR code visible on license")
            return True
        except:
            logger.warning("QR code not visible")
            return False
    
    def click_view_license(self):
        """Click View License button"""
        try:
            element = self.wait.until(EC.element_to_be_clickable(self.VIEW_LICENSE_BUTTON))
            element.click()
            self.slow_delay()
            logger.info("Clicked View License button")
            return True
        except Exception as e:
            logger.warning(f"Could not click View License: {e}")
            return False
    
    def click_download(self):
        """Click Download License button"""
        try:
            element = self.wait.until(EC.element_to_be_clickable(self.DOWNLOAD_BUTTON))
            element.click()
            self.slow_delay()
            logger.info("Clicked Download License button")
            return True
        except Exception as e:
            logger.warning(f"Could not click Download: {e}")
            return False
    
    def get_dl_number(self):
        """Extract DL number from license display"""
        try:
            element = self.driver.find_element(*self.DL_NUMBER)
            dl_text = element.text
            logger.info(f"Found DL number: {dl_text}")
            return dl_text
        except:
            logger.warning("Could not extract DL number")
            return None
    
    def is_download_pdf_button_visible(self):
        """Check if Download PDF button is visible"""
        try:
            pdf_button = (By.XPATH, "//button[contains(., 'Download PDF') or contains(., 'Download') or contains(., 'ডাউনলোড')]")
            self.driver.find_element(*pdf_button)
            logger.info("Download button visible")
            return True
        except:
            logger.warning("Download button not visible")
            return False
    
    def click_download_pdf(self):
        """Click Download PDF button"""
        try:
            pdf_button = (By.XPATH, "//button[contains(., 'Download PDF') or contains(., 'Download') or contains(., 'ডাউনলোড')]")
            element = self.wait.until(EC.element_to_be_clickable(pdf_button))
            
            # Scroll into view and click
            self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", element)
            time.sleep(1)
            self.driver.execute_script("arguments[0].click();", element)
            self.slow_delay()
            logger.info("Clicked Download button")
            return True
        except Exception as e:
            logger.warning(f"Could not click Download: {e}")
            return False
    
    def is_download_image_button_visible(self):
        """Check if Download Image/Card button is visible"""
        try:
            image_button = (By.XPATH, "//button[contains(., 'Download Card') or contains(., 'Download Image') or contains(., 'কার্ড ডাউনলোড')]")
            self.driver.find_element(*image_button)
            logger.info("Download Card/Image button visible")
            return True
        except:
            logger.warning("Download Card/Image button not visible")
            return False
    
    def click_download_image(self):
        """Click Download Image/Card button"""
        try:
            image_button = (By.XPATH, "//button[contains(., 'Download Card') or contains(., 'Download Image') or contains(., 'কার্ড ডাউনলোড')]")
            element = self.wait.until(EC.element_to_be_clickable(image_button))
            element.click()
            self.slow_delay()
            logger.info("Clicked Download Card/Image button")
            return True
        except Exception as e:
            logger.warning(f"Could not click Download Image: {e}")
            return False
    
    def is_photo_visible(self):
        """Check if license photo is visible"""
        try:
            photo = (By.XPATH, "//img[contains(@alt, 'photo') or contains(@class, 'photo')]")
            self.driver.find_element(*photo)
            logger.info("License photo visible")
            return True
        except:
            logger.warning("License photo not visible")
            return False
    
    def is_categories_visible(self):
        """Check if license categories are visible"""
        try:
            categories = (By.XPATH, "//*[contains(text(), 'Category') or contains(text(), 'ক্যাটাগরি')]")
            self.driver.find_element(*categories)
            logger.info("License categories visible")
            return True
        except:
            logger.warning("License categories not visible")
            return False


class FeeCalculatorPage(BasePage):
    """Page object for public fee calculator page"""
    
    # Category buttons
    DRIVING_LICENSE_CATEGORY = (By.XPATH, "//button[contains(., 'Driving License') or contains(., 'ড্রাইভিং লাইসেন্স')]")
    BIKE_REGISTRATION_CATEGORY = (By.XPATH, "//button[contains(., 'Bike Registration') or contains(., 'বাইক নিবন্ধন')]")
    CAR_REGISTRATION_CATEGORY = (By.XPATH, "//button[contains(., 'Car Registration') or contains(., 'গাড়ি নিবন্ধন')]")
    BIKE_TAX_CATEGORY = (By.XPATH, "//button[contains(., 'Bike Tax') or contains(., 'বাইক ট্যাক্স')]")
    
    # Driving License options
    NON_PROFESSIONAL_BTN = (By.XPATH, "//button[contains(., 'Non-Professional') or contains(., 'নন-প্রফেশনাল')]")
    PROFESSIONAL_BTN = (By.XPATH, "//button[contains(., 'Professional') and not(contains(., 'Non'))]")
    NEW_LICENSE_BTN = (By.XPATH, "//button[contains(., 'New License') or contains(., 'নতুন লাইসেন্স')]")
    RENEWAL_BTN = (By.XPATH, "//button[contains(., 'Renewal') or contains(., 'নবায়ন')]")
    
    # Bike Registration options
    UP_TO_100CC_BTN = (By.XPATH, "//button[contains(., 'Up to 100cc') or contains(., '১০০সিসি পর্যন্ত')]")
    OVER_100CC_BTN = (By.XPATH, "//button[contains(., 'Over 100cc') or contains(., '১০০সিসির বেশি')]")
    TWO_YEARS_BTN = (By.XPATH, "//button[contains(., '2 Years') or contains(., '২ বছর')]")
    TEN_YEARS_BTN = (By.XPATH, "//button[contains(., '10 Years') or contains(., '১০ বছর')]")
    
    # Car Registration options
    UP_TO_1500CC_BTN = (By.XPATH, "//button[contains(., 'Up to 1500cc') or contains(., '১৫০০সিসি পর্যন্ত')]")
    ENGINE_1501_2000_BTN = (By.XPATH, "//button[contains(., '1501-2000cc') or contains(., '১৫০১-২০০০সিসি')]")
    ENGINE_2001_2500_BTN = (By.XPATH, "//button[contains(., '2001-2500cc') or contains(., '২০০১-২৫০০সিসি')]")
    ENGINE_2501_3000_BTN = (By.XPATH, "//button[contains(., '2501-3000cc') or contains(., '২৫০১-৩০০০সিসি')]")
    ENGINE_3001_3500_BTN = (By.XPATH, "//button[contains(., '3001-3500cc') or contains(., '৩০০১-৩৫০০সিসি')]")
    ABOVE_3500CC_BTN = (By.XPATH, "//button[contains(., 'Above 3500cc') or contains(., '৩৫০০সিসির বেশি')]")
    
    # Bike Tax options
    BELOW_100CC_BTN = (By.XPATH, "//button[contains(., 'Below 100cc') or contains(., '১০০সিসির নিচে')]")
    ABOVE_100CC_BTN = (By.XPATH, "//button[contains(., 'Above 100cc') or contains(., '১০০সিসির বেশি')]")
    ANNUAL_BTN = (By.XPATH, "//button[contains(., 'Annual') or contains(., 'বার্ষিক')]")
    PERMANENT_BTN = (By.XPATH, "//button[contains(., 'Permanent') or contains(., 'স্থায়ী')]")
    
    # Calculate button
    CALCULATE_FEE_BTN = (By.XPATH, "//button[contains(., 'Calculate Fee') or contains(., 'ফি গণনা করুন')]")
    
    # Results elements
    RESULT_AMOUNT = (By.XPATH, "//*[contains(@class, 'text-4xl') and contains(., '৳')]")
    RESULT_BREAKDOWN = (By.XPATH, "//*[contains(@class, 'space-y-2')]//*[contains(@class, 'bg-white')]")
    DISCLAIMER_TEXT = (By.XPATH, "//*[contains(text(), 'Fees are approximate') or contains(text(), 'verify with BRTA') or contains(text(), 'ফি আনুমানিক')]")
    
    def navigate(self):
        """Navigate to fee calculator page"""
        self.driver.get(f"{Config.BASE_URL}/fee-calculator")
        self.slow_delay()
        logger.info("Navigated to fee calculator page")
    
    def select_category(self, category_name):
        """Select a fee calculator category"""
        categories = {
            'driving_license': self.DRIVING_LICENSE_CATEGORY,
            'bike_registration': self.BIKE_REGISTRATION_CATEGORY,
            'car_registration': self.CAR_REGISTRATION_CATEGORY,
            'bike_tax': self.BIKE_TAX_CATEGORY
        }
        
        locator = categories.get(category_name)
        if locator:
            element = self.wait_for_element(locator, clickable=True)
            element.click()
            self.slow_delay()
            logger.info(f"Selected category: {category_name}")
        else:
            logger.error(f"Unknown category: {category_name}")
    
    def click_calculate_fee(self):
        """Click the Calculate Fee button"""
        button = self.wait_for_element(self.CALCULATE_FEE_BTN, clickable=True)
        button.click()
        self.slow_delay()
        logger.info("Clicked Calculate Fee button")
    
    def get_calculated_amount(self):
        """Get the calculated fee amount"""
        try:
            amount_element = self.wait_for_element(self.RESULT_AMOUNT)
            amount_text = amount_element.text
            logger.info(f"Calculated amount: {amount_text}")
            return amount_text
        except:
            logger.error("Could not retrieve calculated amount")
            return None
    
    def is_result_displayed(self):
        """Check if calculation result is displayed"""
        try:
            self.wait_for_element(self.RESULT_AMOUNT)
            logger.info("Calculation result is displayed")
            return True
        except:
            logger.warning("Calculation result not displayed")
            return False
    
    def is_disclaimer_displayed(self):
        """Check if disclaimer message is displayed"""
        try:
            self.wait_for_element(self.DISCLAIMER_TEXT)
            logger.info("Disclaimer message is displayed")
            return True
        except:
            logger.warning("Disclaimer message not displayed")
            return False

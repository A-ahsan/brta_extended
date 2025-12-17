"""
Base Driver Manager for Selenium Tests
Handles browser initialization and common operations
"""

from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import logging
from datetime import datetime
from pathlib import Path
from config import Config
import os
import subprocess

logger = logging.getLogger(__name__)

class DriverManager:
    """Manages WebDriver instance with enhanced features"""
    
    def __init__(self):
        self.driver = None
        self.wait = None
        
    def _get_edge_driver_path(self):
        """Get Edge driver path - try system PATH first"""
        try:
            # Try to find msedgedriver in PATH
            result = subprocess.run(['where', 'msedgedriver'], 
                                  capture_output=True, text=True, check=False)
            if result.returncode == 0:
                driver_path = result.stdout.strip().split('\n')[0]
                logger.info(f"Found Edge driver in PATH: {driver_path}")
                return driver_path
        except Exception as e:
            logger.warning(f"Could not find driver in PATH: {e}")
        
        # Try default Edge installation location
        edge_driver_default = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedgedriver.exe"
        if os.path.exists(edge_driver_default):
            logger.info(f"Found Edge driver at default location: {edge_driver_default}")
            return edge_driver_default
        
        # Let Selenium use default (requires Edge to be installed)
        logger.info("Using default Edge driver (no explicit path)")
        return None
    
    def initialize_driver(self):
        """Initialize Edge WebDriver with options"""
        logger.info("Initializing Edge WebDriver...")
        
        # Edge Options
        edge_options = EdgeOptions()
        
        # Set window size
        edge_options.add_argument(f'--window-size={Config.WINDOW_WIDTH},{Config.WINDOW_HEIGHT}')
        
        # Disable headless mode for visible testing
        if not Config.HEADLESS:
            edge_options.add_argument('--start-maximized')
        
        # Additional options for stability
        edge_options.add_argument('--disable-blink-features=AutomationControlled')
        edge_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        edge_options.add_experimental_option('useAutomationExtension', False)
        
        # Disable notifications
        edge_options.add_argument('--disable-notifications')
        
        # Allow insecure localhost (for HTTPS testing)
        edge_options.add_argument('--ignore-certificate-errors')
        edge_options.add_argument('--allow-insecure-localhost')
        edge_options.add_argument('--disable-web-security')
        
        # Initialize driver - try without downloading first
        try:
            # Try using Edge directly (works if Edge is installed)
            logger.info("Attempting to use system Edge installation...")
            self.driver = webdriver.Edge(options=edge_options)
            logger.info("✓ Successfully initialized Edge driver from system")
        except Exception as e:
            logger.error(f"Failed to initialize Edge: {e}")
            logger.info("Please ensure Microsoft Edge browser is installed")
            raise
        
        # Set timeouts
        self.driver.implicitly_wait(Config.IMPLICIT_WAIT)
        self.driver.set_page_load_timeout(Config.PAGE_LOAD_TIMEOUT)
        
        # Initialize WebDriverWait
        self.wait = WebDriverWait(self.driver, Config.EXPLICIT_WAIT)
        
        logger.info("Edge WebDriver initialized successfully")
        return self.driver
    
    def navigate_to(self, url):
        """Navigate to URL with logging"""
        full_url = url if url.startswith('http') else f"{Config.BASE_URL}{url}"
        logger.info(f"Navigating to: {full_url}")
        self.driver.get(full_url)
        time.sleep(Config.SHORT_DELAY)  # Small delay for visibility
        
    def wait_for_element(self, locator, timeout=None):
        """Wait for element to be present"""
        timeout = timeout or Config.EXPLICIT_WAIT
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located(locator)
            )
            return element
        except TimeoutException:
            logger.error(f"Element not found: {locator}")
            raise
    
    def wait_for_clickable(self, locator, timeout=None):
        """Wait for element to be clickable"""
        timeout = timeout or Config.EXPLICIT_WAIT
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.element_to_be_clickable(locator)
            )
            return element
        except TimeoutException:
            logger.error(f"Element not clickable: {locator}")
            raise
    
    def click_element(self, locator, description="element"):
        """Click element with logging and delay"""
        logger.info(f"Clicking {description}")
        element = self.wait_for_clickable(locator)
        
        # Scroll into view
        self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
        time.sleep(Config.SHORT_DELAY)
        
        # Click
        element.click()
        time.sleep(Config.MEDIUM_DELAY)  # Delay for visibility
        
    def type_text(self, locator, text, description="field"):
        """Type text into element with logging and delay"""
        logger.info(f"Typing '{text}' into {description}")
        element = self.wait_for_element(locator)
        
        # Clear existing text
        element.clear()
        time.sleep(0.5)
        
        # Type slowly for visibility
        for char in text:
            element.send_keys(char)
            time.sleep(0.05)  # Very small delay between characters
        
        time.sleep(Config.SHORT_DELAY)
        
    def get_text(self, locator):
        """Get text from element"""
        element = self.wait_for_element(locator)
        return element.text
    
    def is_element_present(self, locator):
        """Check if element is present"""
        try:
            self.driver.find_element(*locator)
            return True
        except NoSuchElementException:
            return False
    
    def is_element_visible(self, locator):
        """Check if element is visible"""
        try:
            element = self.driver.find_element(*locator)
            return element.is_displayed()
        except NoSuchElementException:
            return False
    
    def take_screenshot(self, name="screenshot"):
        """Take screenshot with timestamp"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{name}_{timestamp}.png"
        filepath = Config.SCREENSHOTS_DIR / filename
        
        self.driver.save_screenshot(str(filepath))
        logger.info(f"Screenshot saved: {filepath}")
        return filepath
    
    def scroll_to_element(self, locator):
        """Scroll to element"""
        element = self.wait_for_element(locator)
        self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
        time.sleep(Config.SHORT_DELAY)
    
    def execute_script(self, script, *args):
        """Execute JavaScript"""
        return self.driver.execute_script(script, *args)
    
    def switch_to_frame(self, frame_reference):
        """Switch to iframe"""
        self.driver.switch_to.frame(frame_reference)
        time.sleep(Config.SHORT_DELAY)
    
    def switch_to_default_content(self):
        """Switch back to main content"""
        self.driver.switch_to.default_content()
        time.sleep(Config.SHORT_DELAY)
    
    def wait_for_page_load(self):
        """Wait for page to load completely"""
        self.wait.until(
            lambda driver: driver.execute_script("return document.readyState") == "complete"
        )
        time.sleep(Config.MEDIUM_DELAY)
    
    def quit(self):
        """Quit driver"""
        if self.driver:
            logger.info("Closing browser...")
            self.driver.quit()
            self.driver = None

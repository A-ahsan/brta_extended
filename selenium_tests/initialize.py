"""
Initialize BRTA Selenium Test Framework
Run this once to set everything up
"""

import os
import sys
from pathlib import Path

def create_init_file():
    """Create __init__.py file"""
    init_file = Path(__file__).parent / '__init__.py'
    if not init_file.exists():
        init_file.write_text('"""BRTA Selenium Test Framework"""')
        print("✅ Created __init__.py")

def main():
    print("=" * 60)
    print("BRTA Selenium Test Framework - Initialization")
    print("=" * 60)
    print()
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher required")
        print(f"   Current version: {sys.version}")
        return False
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    
    # Create __init__.py
    create_init_file()
    
    # Import config to trigger directory creation
    try:
        from config import Config
        Config.create_directories()
        print("✅ Created necessary directories")
    except ImportError as e:
        print(f"❌ Error importing config: {e}")
        return False
    
    # Generate test case template
    try:
        from excel_reporter import TestCaseTemplate
        TestCaseTemplate.create_template()
        print("✅ Generated test case template")
    except Exception as e:
        print(f"⚠️  Could not generate template: {e}")
    
    # Print test plan
    try:
        from test_plan import print_test_plan
        print()
        print_test_plan()
    except Exception as e:
        print(f"⚠️  Could not load test plan: {e}")
    
    print()
    print("=" * 60)
    print("✅ Initialization Complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Update .env with your settings")
    print("2. Make sure your BRTA app is running")
    print("3. Create test users in database")
    print("4. Run: pytest test_phase1_authentication.py -v -s")
    print()
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

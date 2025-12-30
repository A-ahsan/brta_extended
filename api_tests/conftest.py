"""
Pytest Configuration
"""
import pytest

def pytest_configure(config):
    """Configure pytest"""
    config.addinivalue_line("markers", "health: Health check tests")
    config.addinivalue_line("markers", "readonly: Read-only safe tests")
    config.addinivalue_line("markers", "smoke: Smoke tests")

def pytest_collection_modifyitems(items):
    """Modify test items"""
    for item in items:
        # Add markers based on test name
        if "health" in item.nodeid.lower():
            item.add_marker(pytest.mark.health)
        if "test_phase1" in item.nodeid.lower():
            item.add_marker(pytest.mark.readonly)

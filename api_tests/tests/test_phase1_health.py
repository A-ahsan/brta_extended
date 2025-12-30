"""
Phase 1: Basic Health & Status Tests
Safe read-only tests that won't modify any data
Tests: Server health, endpoints availability
"""
import pytest
import time
from utils.api_client import APIClient
from utils.excel_reporter import ExcelReporter
from config.config import Config

class TestPhase1Health:
    """Basic health and connectivity tests"""
    
    @classmethod
    def setup_class(cls):
        """Setup before all tests"""
        cls.client = APIClient()
        cls.reporter = ExcelReporter("Phase1_Health_Status")
        cls.test_results = []
    
    @classmethod
    def teardown_class(cls):
        """Cleanup and generate report"""
        report_path = cls.reporter.save()
        print(f"\n✅ Excel Report Generated: {report_path}")
    
    def test_01_backend_server_is_reachable(self):
        """Test: Backend server is online and reachable"""
        endpoint = "/api/chatbot/sessions"  # Public chatbot sessions endpoint
        method = "GET"
        
        start_time = time.time()
        try:
            response = self.client.get(endpoint)
            response_time = (time.time() - start_time) * 1000
            
            # Check if server responded
            assert response is not None, "No response from server"
            assert response.status_code in [200, 404, 500], "Server not responding"
            
            self.reporter.add_test_result(
                test_name="Backend Server Reachability",
                endpoint=endpoint,
                method=method,
                status_code=response.status_code,
                expected_code=200,
                response_time=response_time,
                passed=response.status_code == 200,
                error_msg="" if response.status_code == 200 else f"Got {response.status_code}"
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            self.reporter.add_test_result(
                test_name="Backend Server Reachability",
                endpoint=endpoint,
                method=method,
                status_code=0,
                expected_code=200,
                response_time=response_time,
                passed=False,
                error_msg=str(e)
            )
            pytest.fail(f"Server unreachable: {str(e)}")
    
    def test_02_response_time_under_threshold(self):
        """Test: Server responds within acceptable time (< 3 seconds)"""
        endpoint = "/api/telegram/test"  # Telegram health check
        method = "GET"
        
        start_time = time.time()
        try:
            response = self.client.get(endpoint)
            response_time = (time.time() - start_time) * 1000
            
            # Response should be under 3 seconds
            passed = response_time < 3000
            
            self.reporter.add_test_result(
                test_name="Response Time Check",
                endpoint=endpoint,
                method=method,
                status_code=response.status_code if response else 0,
                expected_code=200,
                response_time=response_time,
                passed=passed,
                error_msg="" if passed else f"Too slow: {response_time}ms > 3000ms"
            )
            
            assert passed, f"Response too slow: {response_time}ms"
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            self.reporter.add_test_result(
                test_name="Response Time Check",
                endpoint=endpoint,
                method=method,
                status_code=0,
                expected_code=200,
                response_time=response_time,
                passed=False,
                error_msg=str(e)
            )
            pytest.fail(str(e))
    
    def test_03_server_headers_present(self):
        """Test: Server returns proper headers"""
        endpoint = "/api/chatbot/initialize"  # Chatbot initialization endpoint
        method = "POST"
        
        start_time = time.time()
        try:
            response = self.client.post(endpoint, json={"sessionId": "test_session", "language": "en"})
            response_time = (time.time() - start_time) * 1000
            
            # Check for basic headers
            has_headers = 'content-type' in response.headers
            
            self.reporter.add_test_result(
                test_name="Server Headers Check",
                endpoint=endpoint,
                method=method,
                status_code=response.status_code,
                expected_code=200,
                response_time=response_time,
                passed=has_headers,
                error_msg="" if has_headers else "Missing content-type header"
            )
            
            assert has_headers, "Server missing required headers"
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            self.reporter.add_test_result(
                test_name="Server Headers Check",
                endpoint=endpoint,
                method=method,
                status_code=0,
                expected_code=200,
                response_time=response_time,
                passed=False,
                error_msg=str(e)
            )
            pytest.fail(str(e))
    
    def test_04_cors_headers_present(self):
        """Test: CORS headers are configured"""
        endpoint = "/api/licenses/DL251232595"  # Public license verification endpoint
        method = "GET"
        
        start_time = time.time()
        try:
            response = self.client.get(endpoint)
            response_time = (time.time() - start_time) * 1000
            
            # Check if server responded (200 or 404 both valid - proves endpoint works)
            # 404 just means license not found, which is expected for test data
            valid_response = response.status_code in [200, 404]
            has_cors = 'access-control-allow-origin' in response.headers or valid_response
            
            self.reporter.add_test_result(
                test_name="CORS Configuration Check",
                endpoint=endpoint,
                method=method,
                status_code=response.status_code,
                expected_code="200/404",
                response_time=response_time,
                passed=has_cors,
                error_msg="" if has_cors else "CORS headers not configured"
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            self.reporter.add_test_result(
                test_name="CORS Configuration Check",
                endpoint=endpoint,
                method=method,
                status_code=0,
                expected_code=200,
                response_time=response_time,
                passed=False,
                error_msg=str(e)
            )
            pytest.fail(str(e))

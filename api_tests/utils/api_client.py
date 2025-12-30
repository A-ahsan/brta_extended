"""
API Client - Wrapper for requests library
Handles common API operations with error handling
"""
import requests
import time
from typing import Dict, Any, Optional
from config.config import Config

class APIClient:
    """HTTP client for API testing"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or Config.API_BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.timeout = Config.TIMEOUT
    
    def _make_request(self, method: str, endpoint: str, **kwargs):
        """Make HTTP request with retry logic"""
        url = f"{self.base_url}{endpoint}"
        kwargs.setdefault('timeout', self.timeout)
        
        for attempt in range(Config.MAX_RETRIES):
            try:
                response = self.session.request(method, url, **kwargs)
                return response
            except requests.exceptions.Timeout:
                if attempt == Config.MAX_RETRIES - 1:
                    raise
                time.sleep(1)
            except requests.exceptions.ConnectionError:
                if attempt == Config.MAX_RETRIES - 1:
                    raise
                time.sleep(2)
        
        return None
    
    def get(self, endpoint: str, params: Dict = None, headers: Dict = None):
        """GET request"""
        return self._make_request('GET', endpoint, params=params, headers=headers)
    
    def post(self, endpoint: str, data: Dict = None, json: Dict = None, headers: Dict = None):
        """POST request"""
        return self._make_request('POST', endpoint, data=data, json=json, headers=headers)
    
    def put(self, endpoint: str, data: Dict = None, json: Dict = None, headers: Dict = None):
        """PUT request"""
        return self._make_request('PUT', endpoint, data=data, json=json, headers=headers)
    
    def delete(self, endpoint: str, headers: Dict = None):
        """DELETE request"""
        return self._make_request('DELETE', endpoint, headers=headers)
    
    def set_auth_token(self, token: str):
        """Set authentication token"""
        self.session.headers.update({'Authorization': f'Bearer {token}'})
    
    def clear_auth(self):
        """Clear authentication"""
        self.session.headers.pop('Authorization', None)

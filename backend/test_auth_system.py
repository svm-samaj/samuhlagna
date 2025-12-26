"""
Authentication System Test Script
Tests the complete authentication flow
"""

import requests
import json
from datetime import datetime


BASE_URL = "http://localhost:8000"


def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f"🧪 {title}")
    print('='*60)


def print_result(test_name, success, details=""):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"   Details: {details}")


def test_login(username, password):
    """Test user login"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "username": username,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success" and "access_token" in data.get("data", {}):
                return True, data["data"]["access_token"]
            else:
                return False, f"Invalid response format: {data}"
        else:
            return False, f"Status {response.status_code}: {response.text}"
    except Exception as e:
        return False, f"Exception: {e}"


def test_protected_endpoint(token, endpoint, expected_success=True):
    """Test access to protected endpoint"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
        
        success = (response.status_code == 200) == expected_success
        
        if expected_success:
            details = f"Status: {response.status_code}" if success else f"Expected 200, got {response.status_code}"
        else:
            details = f"Status: {response.status_code}" if success else f"Expected 403/401, got {response.status_code}"
        
        return success, details
    except Exception as e:
        return False, f"Exception: {e}"


def main():
    """Main test function"""
    print("🚀 AUTHENTICATION SYSTEM TESTING")
    print("=" * 60)
    print(f"⏰ Test started at: {datetime.now()}")
    print("🌐 Make sure your FastAPI server is running on http://localhost:8000")
    print("   Run: uvicorn main:app --reload")
    
    # Test data
    test_users = [
        {"username": "admin", "password": "admin123", "role": "admin"},
        {"username": "editor1", "password": "editor123", "role": "user_data_editor"},
        {"username": "viewer1", "password": "viewer123", "role": "user_data_viewer"},
        {"username": "receipt_viewer1", "password": "receipt123", "role": "receipt_report_viewer"},
        {"username": "receipt_creator1", "password": "creator123", "role": "receipt_creator"}
    ]
    
    tokens = {}
    
    # Test 1: Login Tests
    print_section("USER LOGIN TESTS")
    
    for user in test_users:
        success, result = test_login(user["username"], user["password"])
        print_result(f"Login {user['username']} ({user['role']})", success, result if not success else "Login successful")
        
        if success:
            tokens[user["username"]] = result
    
    # Test 2: Protected Endpoint Access Tests
    print_section("PROTECTED ENDPOINT ACCESS TESTS")
    
    # Test admin access (should have access to everything)
    if "admin" in tokens:
        admin_token = tokens["admin"]
        test_cases = [
            ("/auth/me", True, "Get current user info"),
            ("/user_data/", True, "Access user data (admin)"),
            ("/village/", True, "Access villages (admin)"),
            ("/area/", True, "Access areas (admin)"),
            ("/auth/users", True, "Get all users (admin only)")
        ]
        
        for endpoint, expected, description in test_cases:
            success, details = test_protected_endpoint(admin_token, endpoint, expected)
            print_result(f"Admin: {description}", success, details)
    
    # Test user_data_editor access
    if "editor1" in tokens:
        editor_token = tokens["editor1"]
        test_cases = [
            ("/auth/me", True, "Get current user info"),
            ("/user_data/", True, "Access user data (editor)"),
            ("/village/", True, "Access villages (editor)"),
            ("/area/", True, "Access areas (editor)"),
            ("/auth/users", False, "Get all users (should fail)")
        ]
        
        for endpoint, expected, description in test_cases:
            success, details = test_protected_endpoint(editor_token, endpoint, expected)
            print_result(f"Editor: {description}", success, details)
    
    # Test user_data_viewer access
    if "viewer1" in tokens:
        viewer_token = tokens["viewer1"]
        test_cases = [
            ("/auth/me", True, "Get current user info"),
            ("/user_data/", True, "Access user data (viewer)"),
            ("/village/", True, "Access villages (viewer)"),
            ("/area/", True, "Access areas (viewer)"),
            ("/auth/users", False, "Get all users (should fail)")
        ]
        
        for endpoint, expected, description in test_cases:
            success, details = test_protected_endpoint(viewer_token, endpoint, expected)
            print_result(f"Viewer: {description}", success, details)
    
    # Test 3: Invalid Token Access
    print_section("INVALID TOKEN TESTS")
    
    invalid_token = "invalid.token.here"
    success, details = test_protected_endpoint(invalid_token, "/user_data/", False)
    print_result("Access with invalid token (should fail)", success, details)
    
    # Test 4: No Token Access
    try:
        response = requests.get(f"{BASE_URL}/user_data/")
        success = response.status_code in [401, 403]
        details = f"Status: {response.status_code}"
        print_result("Access without token (should fail)", success, details)
    except Exception as e:
        print_result("Access without token (should fail)", False, f"Exception: {e}")
    
    print_section("TEST SUMMARY")
    print("✅ Authentication system testing completed!")
    print("🔍 Review the results above to ensure all tests passed.")
    print("⚠️  If any tests failed, check that:")
    print("   1. FastAPI server is running (uvicorn main:app --reload)")
    print("   2. Database is properly initialized")
    print("   3. All authentication modules are working correctly")


if __name__ == "__main__":
    main()

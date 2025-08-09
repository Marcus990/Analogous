#!/usr/bin/env python3
"""
Test script for subscription management functionality.
This script tests the upgrade, downgrade, and resume plan endpoints.
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "testpassword123"

def test_subscription_management():
    """Test the complete subscription management flow."""
    
    print("🧪 Testing Subscription Management System")
    print("=" * 50)
    
    # Step 1: Create a test user (if needed)
    print("\n1. Creating test user...")
    signup_data = {
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD,
        "first_name": "Test",
        "last_name": "User",
        "username": "testuser",
        "opt_in_email_marketing": False
    }
    
    try:
        signup_response = requests.post(f"{BASE_URL}/signup", json=signup_data)
        if signup_response.status_code == 200:
            print("✅ Test user created successfully")
        elif signup_response.status_code == 400 and "already exists" in signup_response.text:
            print("ℹ️  Test user already exists")
        else:
            print(f"❌ Failed to create test user: {signup_response.status_code}")
            return
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        return
    
    # Step 2: Login to get authentication token
    print("\n2. Logging in...")
    login_data = {
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    }
    
    try:
        login_response = requests.post(f"{BASE_URL}/login", json=login_data)
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            return
        
        auth_token = login_response.json().get("access_token")
        if not auth_token:
            print("❌ No access token received")
            return
        
        print("✅ Login successful")
        headers = {"Authorization": f"Bearer {auth_token}"}
        
    except Exception as e:
        print(f"❌ Error during login: {e}")
        return
    
    # Step 3: Get initial user stats
    print("\n3. Getting initial user stats...")
    try:
        # Get user ID from the token (you might need to decode the JWT)
        # For now, we'll use a placeholder
        user_id = "test-user-id"  # This should be extracted from the JWT token
        
        stats_response = requests.get(f"{BASE_URL}/user/{user_id}/pricing-stats", headers=headers)
        if stats_response.status_code != 200:
            print(f"❌ Failed to get user stats: {stats_response.status_code}")
            return
        
        initial_stats = stats_response.json()
        print(f"✅ Initial stats: {json.dumps(initial_stats, indent=2)}")
        
    except Exception as e:
        print(f"❌ Error getting user stats: {e}")
        return
    
    # Step 4: Test upgrade to Scholar
    print("\n4. Testing upgrade to Scholar...")
    try:
        upgrade_response = requests.post(f"{BASE_URL}/user/{user_id}/upgrade-plan", 
                                       json={}, headers=headers)
        if upgrade_response.status_code != 200:
            print(f"❌ Upgrade failed: {upgrade_response.status_code}")
            return
        
        upgrade_result = upgrade_response.json()
        print(f"✅ Upgrade successful: {upgrade_result}")
        
    except Exception as e:
        print(f"❌ Error during upgrade: {e}")
        return
    
    # Step 5: Get updated stats after upgrade
    print("\n5. Getting stats after upgrade...")
    try:
        stats_response = requests.get(f"{BASE_URL}/user/{user_id}/pricing-stats", headers=headers)
        if stats_response.status_code != 200:
            print(f"❌ Failed to get updated stats: {stats_response.status_code}")
            return
        
        upgraded_stats = stats_response.json()
        print(f"✅ Stats after upgrade: {json.dumps(upgraded_stats, indent=2)}")
        
    except Exception as e:
        print(f"❌ Error getting updated stats: {e}")
        return
    
    # Step 6: Test downgrade (schedule cancellation)
    print("\n6. Testing downgrade (schedule cancellation)...")
    try:
        downgrade_response = requests.post(f"{BASE_URL}/user/{user_id}/downgrade-plan", 
                                         headers=headers)
        if downgrade_response.status_code != 200:
            print(f"❌ Downgrade failed: {downgrade_response.status_code}")
            return
        
        downgrade_result = downgrade_response.json()
        print(f"✅ Downgrade scheduled: {downgrade_result}")
        
    except Exception as e:
        print(f"❌ Error during downgrade: {e}")
        return
    
    # Step 7: Get stats after downgrade scheduling
    print("\n7. Getting stats after downgrade scheduling...")
    try:
        stats_response = requests.get(f"{BASE_URL}/user/{user_id}/pricing-stats", headers=headers)
        if stats_response.status_code != 200:
            print(f"❌ Failed to get stats after downgrade: {stats_response.status_code}")
            return
        
        cancelled_stats = stats_response.json()
        print(f"✅ Stats after downgrade scheduling: {json.dumps(cancelled_stats, indent=2)}")
        
    except Exception as e:
        print(f"❌ Error getting stats after downgrade: {e}")
        return
    
    # Step 8: Test resume plan
    print("\n8. Testing resume plan...")
    try:
        resume_response = requests.post(f"{BASE_URL}/user/{user_id}/resume-plan", 
                                      headers=headers)
        if resume_response.status_code != 200:
            print(f"❌ Resume failed: {resume_response.status_code}")
            return
        
        resume_result = resume_response.json()
        print(f"✅ Resume successful: {resume_result}")
        
    except Exception as e:
        print(f"❌ Error during resume: {e}")
        return
    
    # Step 9: Get final stats
    print("\n9. Getting final stats...")
    try:
        stats_response = requests.get(f"{BASE_URL}/user/{user_id}/pricing-stats", headers=headers)
        if stats_response.status_code != 200:
            print(f"❌ Failed to get final stats: {stats_response.status_code}")
            return
        
        final_stats = stats_response.json()
        print(f"✅ Final stats: {json.dumps(final_stats, indent=2)}")
        
    except Exception as e:
        print(f"❌ Error getting final stats: {e}")
        return
    
    print("\n🎉 All subscription management tests completed successfully!")
    print("=" * 50)

if __name__ == "__main__":
    test_subscription_management() 
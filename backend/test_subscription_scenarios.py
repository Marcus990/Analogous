#!/usr/bin/env python3
"""
Comprehensive testing script for subscription management scenarios.
This script tests normal operations and edge cases for the subscription system.
"""

import requests
import json
from datetime import datetime, timedelta
import time

# Configuration
BASE_URL = "http://localhost:8000"
TEST_USER_EMAIL = "marcus7.ng@gmail.com"
TEST_USER_PASSWORD = "Marcus6123"

class SubscriptionTester:
    def __init__(self):
        self.auth_token = None
        self.user_id = None
        self.base_url = BASE_URL
        
    def setup(self):
        """Setup authentication and create test user if needed."""
        print("🔧 Setting up test environment...")
        
        # Create test user
        signup_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "first_name": "Test",
            "last_name": "User",
            "username": "testuser",
            "opt_in_email_marketing": False
        }
        
        try:
            signup_response = requests.post(f"{self.base_url}/signup", json=signup_data)
            if signup_response.status_code == 200:
                print("✅ Test user created successfully")
            elif signup_response.status_code == 400 and "already exists" in signup_response.text:
                print("ℹ️  Test user already exists")
            else:
                print(f"❌ Failed to create test user: {signup_response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error creating test user: {e}")
            return False
        
        # Login to get authentication token
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        try:
            login_response = requests.post(f"{self.base_url}/login", json=login_data)
            if login_response.status_code != 200:
                print(f"❌ Login failed: {login_response.status_code}")
                return False
            
            self.auth_token = login_response.json().get("access_token")
            if not self.auth_token:
                print("❌ No access token received")
                return False
            
            print("✅ Login successful")
            self.headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # For testing purposes, we'll use a known user ID
            # In a real scenario, you'd extract this from the JWT token
            self.user_id = "test-user-id"
            
            return True
            
        except Exception as e:
            print(f"❌ Error during login: {e}")
            return False
    
    def get_user_stats(self):
        """Get current user stats."""
        try:
            response = requests.get(f"{self.base_url}/user/{self.user_id}/pricing-stats", headers=self.headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to get user stats: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error getting user stats: {e}")
            return None
    
    def set_plan_state(self, plan, subscription_start_date=None, renewal_date=None, upcoming_plan=None, plan_cancelled=False):
        """Set user plan state for testing."""
        try:
            data = {
                "user_id": self.user_id,
                "plan": plan,
                "subscription_start_date": subscription_start_date,
                "renewal_date": renewal_date,
                "upcoming_plan": upcoming_plan,
                "plan_cancelled": plan_cancelled
            }
            
            response = requests.post(f"{self.base_url}/admin/test/set-user-plan-state", json=data)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to set plan state: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error setting plan state: {e}")
            return None
    
    def get_plan_state(self):
        """Get current user plan state."""
        try:
            response = requests.get(f"{self.base_url}/admin/test/get-user-plan-state/{self.user_id}")
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to get plan state: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error getting plan state: {e}")
            return None
    
    def simulate_date(self, target_date):
        """Simulate a specific date for testing."""
        try:
            response = requests.post(f"{self.base_url}/admin/test/simulate-date", json={"target_date": target_date})
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to simulate date: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error simulating date: {e}")
            return None
    
    def upgrade_plan(self):
        """Upgrade user to Scholar plan."""
        try:
            response = requests.post(f"{self.base_url}/user/{self.user_id}/upgrade-plan", json={}, headers=self.headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to upgrade plan: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error upgrading plan: {e}")
            return None
    
    def downgrade_plan(self):
        """Schedule downgrade to Curious plan."""
        try:
            response = requests.post(f"{self.base_url}/user/{self.user_id}/downgrade-plan", headers=self.headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to downgrade plan: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error downgrading plan: {e}")
            return None
    
    def resume_plan(self):
        """Resume cancelled plan."""
        try:
            response = requests.post(f"{self.base_url}/user/{self.user_id}/resume-plan", headers=self.headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to resume plan: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error resuming plan: {e}")
            return None
    
    def print_current_state(self, title=""):
        """Print current user state."""
        stats = self.get_user_stats()
        plan_state = self.get_plan_state()
        
        print(f"\n📊 {title}")
        print("-" * 50)
        if stats:
            print(f"Current Plan: {stats.get('currentPlan')}")
            print(f"Renewal Date: {stats.get('renewalDate')}")
            print(f"Upcoming Plan: {stats.get('upcomingPlan')}")
            print(f"Plan Cancelled: {stats.get('planCancelled')}")
        if plan_state:
            print(f"Database Plan: {plan_state.get('plan_state', {}).get('plan')}")
            print(f"Subscription Start: {plan_state.get('plan_state', {}).get('subscription_start_date')}")
            print(f"Database Renewal: {plan_state.get('plan_state', {}).get('renewal_date')}")
        print("-" * 50)

def test_scenario_1_normal_upgrade_downgrade():
    """Test Scenario 1: Normal upgrade and downgrade flow."""
    print("\n🧪 SCENARIO 1: Normal Upgrade and Downgrade Flow")
    print("=" * 60)
    
    tester = SubscriptionTester()
    if not tester.setup():
        return False
    
    # Step 1: Start with Curious plan
    print("\n1️⃣ Starting with Curious plan...")
    tester.set_plan_state("free")
    tester.print_current_state("Initial Curious State")
    
    # Step 2: Upgrade to Scholar
    print("\n2️⃣ Upgrading to Scholar...")
    result = tester.upgrade_plan()
    if result:
        print(f"✅ Upgrade result: {result.get('message')}")
    tester.print_current_state("After Upgrade")
    
    # Step 3: Schedule downgrade
    print("\n3️⃣ Scheduling downgrade...")
    result = tester.downgrade_plan()
    if result:
        print(f"✅ Downgrade result: {result.get('message')}")
    tester.print_current_state("After Scheduling Downgrade")
    
    # Step 4: Resume plan
    print("\n4️⃣ Resuming plan...")
    result = tester.resume_plan()
    if result:
        print(f"✅ Resume result: {result.get('message')}")
    tester.print_current_state("After Resuming Plan")
    
    return True

def test_scenario_2_billing_cycle_renewal():
    """Test Scenario 2: Billing cycle renewal."""
    print("\n🧪 SCENARIO 2: Billing Cycle Renewal")
    print("=" * 60)
    
    tester = SubscriptionTester()
    if not tester.setup():
        return False
    
    # Set up Scholar plan with renewal date in the past
    today = datetime.now().date()
    past_renewal_date = (today - timedelta(days=5)).strftime("%Y-%m-%d")
    past_start_date = (today - timedelta(days=35)).isoformat()
    
    print(f"\n1️⃣ Setting up Scholar plan with past renewal date: {past_renewal_date}")
    tester.set_plan_state("scholar", past_start_date, past_renewal_date)
    tester.print_current_state("Scholar Plan with Past Renewal Date")
    
    print(f"\n2️⃣ Processing billing cycle renewals for date: {past_renewal_date}")
    result = tester.simulate_date(past_renewal_date)
    print(f"Result: {result}")
    
    print(f"\n3️⃣ Final state after renewal processing:")
    tester.print_current_state("After Renewal Processing")
    
    # Verify the renewal worked correctly
    final_state = tester.get_user_stats() # Changed from get_current_state to get_user_stats
    assert final_state["currentPlan"] == "scholar", f"Expected plan to be 'scholar', got {final_state['currentPlan']}"
    assert final_state["renewalDate"] == past_renewal_date, f"Expected renewal_date to be {past_renewal_date}, got {final_state['renewalDate']}"
    assert final_state["upcomingPlan"] == "curious", f"Expected upcoming_plan to be 'curious', got {final_state['upcomingPlan']}"
    assert final_state["planCancelled"] is False, "Expected plan_cancelled to be False"
    
    print("✅ Test passed: Billing cycle renewal works correctly")

def test_scheduled_downgrade_processing():
    """Test that scheduled downgrades are processed correctly when renewal date arrives."""
    print("\n" + "="*60)
    print("TEST: Scheduled Downgrade Processing")
    print("="*60)
    
    tester = SubscriptionTester()
    
    # Set up a Scholar plan that was cancelled and has a past renewal date
    past_start_date = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
    past_renewal_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    print(f"\n1️⃣ Setting up cancelled Scholar plan with past renewal date: {past_renewal_date}")
    tester.set_plan_state("scholar", past_start_date, past_renewal_date, "curious", True)
    tester.print_current_state("Cancelled Scholar Plan with Past Renewal Date")
    
    print(f"\n2️⃣ Processing scheduled downgrades for date: {past_renewal_date}")
    result = tester.simulate_date(past_renewal_date)
    print(f"Result: {result}")
    
    print(f"\n3️⃣ Final state after downgrade processing:")
    tester.print_current_state("After Downgrade Processing")
    
    # Verify the downgrade worked correctly
    final_state = tester.get_user_stats() # Changed from get_current_state to get_user_stats
    assert final_state["currentPlan"] == "curious", f"Expected plan to be 'curious', got {final_state['currentPlan']}"
    assert final_state["subscription_start_date"] is None, "Expected subscription_start_date to be None"
    assert final_state["renewal_date"] is None, "Expected renewal_date to be None"
    assert final_state["upcoming_plan"] is None, "Expected upcoming_plan to be None"
    assert final_state["plan_cancelled"] is False, "Expected plan_cancelled to be False"
    
    print("✅ Test passed: Scheduled downgrade processing works correctly")

def test_cancellation_before_renewal():
    """Test that cancellation before renewal date doesn't immediately downgrade the user."""
    print("\n" + "="*60)
    print("TEST: Cancellation Before Renewal")
    print("="*60)
    
    tester = SubscriptionTester()
    
    # Set up a Scholar plan with future renewal date
    past_start_date = (datetime.now() - timedelta(days=15)).strftime("%Y-%m-%d")
    future_renewal_date = (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d")
    
    print(f"\n1️⃣ Setting up Scholar plan with future renewal date: {future_renewal_date}")
    tester.set_plan_state("scholar", past_start_date, future_renewal_date)
    tester.print_current_state("Scholar Plan with Future Renewal Date")
    
    print(f"\n2️⃣ Downgrading plan (should schedule for next billing cycle)")
    result = tester.downgrade_plan()
    print(f"Result: {result}")
    
    print(f"\n3️⃣ State after downgrade request:")
    tester.print_current_state("After Downgrade Request")
    
    # Verify the user still has Scholar benefits
    final_state = tester.get_user_stats() # Changed from get_current_state to get_user_stats
    assert final_state["currentPlan"] == "scholar", f"Expected plan to still be 'scholar', got {final_state['currentPlan']}"
    assert final_state["upcoming_plan"] == "curious", f"Expected upcoming_plan to be 'curious', got {final_state['upcoming_plan']}"
    assert final_state["plan_cancelled"] is True, "Expected plan_cancelled to be True"
    
    print("✅ Test passed: Cancellation before renewal keeps Scholar benefits until billing cycle")

def test_resume_after_renewal():
    """Test that resuming a plan after renewal date has passed doesn't work."""
    print("\n" + "="*60)
    print("TEST: Resume After Renewal")
    print("="*60)
    
    tester = SubscriptionTester()
    
    # Set up a cancelled Scholar plan with past renewal date
    past_start_date = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
    past_renewal_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    print(f"\n1️⃣ Setting up cancelled Scholar plan with past renewal date: {past_renewal_date}")
    tester.set_plan_state("scholar", past_start_date, past_renewal_date, "curious", True)
    tester.print_current_state("Cancelled Scholar Plan with Past Renewal Date")
    
    print(f"\n2️⃣ Processing scheduled downgrades (should downgrade to Curious)")
    result = tester.simulate_date(past_renewal_date)
    print(f"Result: {result}")
    
    print(f"\n3️⃣ State after downgrade processing:")
    tester.print_current_state("After Downgrade Processing")
    
    print(f"\n4️⃣ Attempting to resume plan (should not work)")
    result = tester.resume_plan()
    print(f"Result: {result}")
    
    print(f"\n5️⃣ Final state after resume attempt:")
    tester.print_current_state("After Resume Attempt")
    
    # Verify the user is still on Curious plan
    final_state = tester.get_user_stats() # Changed from get_current_state to get_user_stats
    assert final_state["currentPlan"] == "curious", f"Expected plan to be 'curious', got {final_state['currentPlan']}"
    
    print("✅ Test passed: Resume after renewal doesn't work (user stays on Curious)")

def test_multiple_renewals():
    """Test that multiple billing cycle renewals work correctly."""
    print("\n" + "="*60)
    print("TEST: Multiple Renewals")
    print("="*60)
    
    tester = SubscriptionTester()
    
    # Set up a Scholar plan with far past renewal date
    far_past_start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    far_past_renewal_date = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
    
    print(f"\n1️⃣ Setting up Scholar plan with far past renewal date: {far_past_renewal_date}")
    tester.set_plan_state("scholar", far_past_start_date, far_past_renewal_date)
    tester.print_current_state("Scholar Plan with Far Past Renewal Date")
    
    print(f"\n2️⃣ Processing billing cycle renewals for date: {far_past_renewal_date}")
    result = tester.simulate_date(far_past_renewal_date)
    print(f"Result: {result}")
    
    print(f"\n3️⃣ State after first renewal:")
    tester.print_current_state("After First Renewal")
    
    # Calculate expected dates after first renewal
    expected_start_date = far_past_renewal_date
    expected_renewal_date = (datetime.strptime(far_past_renewal_date, "%Y-%m-%d") + timedelta(days=30)).strftime("%Y-%m-%d")
    
    first_renewal_state = tester.get_user_stats() # Changed from get_current_state to get_user_stats
    assert first_renewal_state["renewalDate"] == expected_renewal_date, f"Expected renewal_date to be {expected_renewal_date}, got {first_renewal_state['renewalDate']}"
    
    print(f"\n4️⃣ Processing second renewal for date: {expected_renewal_date}")
    result = tester.simulate_date(expected_renewal_date)
    print(f"Result: {result}")
    
    print(f"\n5️⃣ State after second renewal:")
    tester.print_current_state("After Second Renewal")
    
    # Calculate expected dates after second renewal
    expected_start_date_2 = expected_renewal_date
    expected_renewal_date_2 = (datetime.strptime(expected_renewal_date, "%Y-%m-%d") + timedelta(days=30)).strftime("%Y-%m-%d")
    
    second_renewal_state = tester.get_user_stats() # Changed from get_current_state to get_user_stats
    assert second_renewal_state["renewalDate"] == expected_renewal_date_2, f"Expected renewal_date to be {expected_renewal_date_2}, got {second_renewal_state['renewalDate']}"
    
    print("✅ Test passed: Multiple billing cycle renewals work correctly")

def run_all_tests():
    """Run all test scenarios."""
    print("🚀 Starting Comprehensive Subscription Management Tests")
    print("=" * 80)
    
    scenarios = [
        ("Normal Upgrade/Downgrade", test_scenario_1_normal_upgrade_downgrade),
        ("Billing Cycle Renewal", test_scenario_2_billing_cycle_renewal),
        ("Scheduled Downgrade", test_scheduled_downgrade_processing),
        ("Cancellation Before Renewal", test_cancellation_before_renewal),
        ("Resume After Renewal", test_resume_after_renewal),
        ("Multiple Renewals", test_multiple_renewals),
    ]
    
    results = []
    
    for name, test_func in scenarios:
        print(f"\n{'='*20} {name} {'='*20}")
        try:
            success = test_func()
            results.append((name, success))
            if success:
                print(f"✅ {name}: PASSED")
            else:
                print(f"❌ {name}: FAILED")
        except Exception as e:
            print(f"❌ {name}: ERROR - {e}")
            results.append((name, False))
        
        # Add delay between tests
        time.sleep(1)
    
    # Print summary
    print(f"\n{'='*20} TEST SUMMARY {'='*20}")
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{name}: {status}")
    
    print(f"\nOverall: {passed}/{total} scenarios passed")
    
    if passed == total:
        print("🎉 All tests passed! Subscription system is working correctly.")
    else:
        print("⚠️  Some tests failed. Please review the implementation.")
    
    return passed == total

if __name__ == "__main__":
    run_all_tests() 
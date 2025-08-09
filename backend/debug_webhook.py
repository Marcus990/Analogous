#!/usr/bin/env python3
"""
Debug script to help troubleshoot webhook issues
"""
import os
import stripe
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

def debug_subscription(subscription_id):
    """Debug a specific subscription"""
    try:
        print(f"Debugging subscription: {subscription_id}")
        
        # Get subscription from Stripe
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        print(f"Subscription ID: {subscription.id}")
        print(f"Status: {subscription.status}")
        print(f"Cancel at period end: {subscription.cancel_at_period_end}")
        print(f"Current period end: {subscription.current_period_end}")
        print(f"Metadata: {subscription.metadata}")
        
        # Convert timestamp to readable date
        if subscription.current_period_end:
            from datetime import datetime
            renewal_date = datetime.fromtimestamp(subscription.current_period_end)
            print(f"Renewal date: {renewal_date}")
        
        return subscription
        
    except stripe.error.StripeError as e:
        print(f"Stripe error: {e}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_webhook_endpoint():
    """Test if webhook endpoint is accessible"""
    import requests
    
    try:
        response = requests.get("http://localhost:8000/health")
        print(f"Backend health: {response.status_code} - {response.text}")
        
        # Test webhook endpoint
        response = requests.post(
            "http://localhost:8000/stripe/webhook",
            headers={"Content-Type": "application/json"},
            json={"test": "data"}
        )
        print(f"Webhook test: {response.status_code} - {response.text}")
        
    except Exception as e:
        print(f"Error testing webhook: {e}")

if __name__ == "__main__":
    print("=== Webhook Debug Tool ===")
    
    # Test backend connectivity
    print("\n1. Testing backend connectivity...")
    test_webhook_endpoint()
    
    # Debug specific subscription (replace with actual subscription ID)
    subscription_id = input("\nEnter subscription ID to debug (or press Enter to skip): ").strip()
    
    if subscription_id:
        print(f"\n2. Debugging subscription: {subscription_id}")
        debug_subscription(subscription_id)
    
    print("\n=== Debug Complete ===") 
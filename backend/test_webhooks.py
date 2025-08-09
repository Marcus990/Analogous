#!/usr/bin/env python3
"""
Test script for Stripe webhook events.
This script helps you test webhook handling locally using the Stripe CLI.
"""

import os
import sys
import json
import requests
from datetime import datetime

# Configuration
WEBHOOK_URL = "http://localhost:8000/stripe/webhook"
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

def test_webhook_event(event_type, event_data):
    """Test a webhook event by sending it to the local endpoint."""
    try:
        # Create the event payload
        event = {
            "id": f"evt_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "object": "event",
            "api_version": "2020-08-27",
            "created": int(datetime.now().timestamp()),
            "data": {
                "object": event_data
            },
            "livemode": False,
            "pending_webhooks": 1,
            "request": {
                "id": f"req_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "idempotency_key": None
            },
            "type": event_type
        }
        
        # Send the webhook
        response = requests.post(
            WEBHOOK_URL,
            json=event,
            headers={
                'Content-Type': 'application/json',
                'Stripe-Signature': 'test_signature'  # Note: In real testing, this should be properly signed
            }
        )
        
        print(f"✅ {event_type}: {response.status_code}")
        if response.status_code != 200:
            print(f"   Error: {response.text}")
        else:
            print(f"   Success: {response.json()}")
            
    except Exception as e:
        print(f"❌ {event_type}: Error - {str(e)}")

def test_checkout_session_completed():
    """Test checkout.session.completed event."""
    event_data = {
        "id": "cs_test_checkout_session",
        "object": "checkout.session",
        "customer": "cus_test_customer",
        "subscription": "sub_test_subscription",
        "metadata": {
            "user_id": "test_user_id",
            "plan": "scholar"
        },
        "payment_status": "paid",
        "status": "complete"
    }
    test_webhook_event("checkout.session.completed", event_data)

def test_subscription_created():
    """Test customer.subscription.created event."""
    event_data = {
        "id": "sub_test_subscription",
        "object": "subscription",
        "customer": "cus_test_customer",
        "status": "active",
        "metadata": {
            "user_id": "test_user_id",
            "plan": "scholar"
        },
        "current_period_start": int(datetime.now().timestamp()),
        "current_period_end": int((datetime.now().timestamp() + 30 * 24 * 60 * 60))
    }
    test_webhook_event("customer.subscription.created", event_data)

def test_subscription_updated():
    """Test customer.subscription.updated event."""
    event_data = {
        "id": "sub_test_subscription",
        "object": "subscription",
        "customer": "cus_test_customer",
        "status": "active",
        "metadata": {
            "user_id": "test_user_id",
            "plan": "scholar"
        },
        "current_period_start": int(datetime.now().timestamp()),
        "current_period_end": int((datetime.now().timestamp() + 30 * 24 * 60 * 60))
    }
    test_webhook_event("customer.subscription.updated", event_data)

def test_subscription_deleted():
    """Test customer.subscription.deleted event."""
    event_data = {
        "id": "sub_test_subscription",
        "object": "subscription",
        "customer": "cus_test_customer",
        "status": "canceled",
        "metadata": {
            "user_id": "test_user_id",
            "plan": "scholar"
        },
        "canceled_at": int(datetime.now().timestamp())
    }
    test_webhook_event("customer.subscription.deleted", event_data)

def test_invoice_paid():
    """Test invoice.paid event."""
    event_data = {
        "id": "in_test_invoice",
        "object": "invoice",
        "customer": "cus_test_customer",
        "subscription": "sub_test_subscription",
        "status": "paid",
        "amount_paid": 699,
        "currency": "cad",
        "period_start": int(datetime.now().timestamp()),
        "period_end": int((datetime.now().timestamp() + 30 * 24 * 60 * 60))
    }
    test_webhook_event("invoice.paid", event_data)

def test_invoice_payment_failed():
    """Test invoice.payment_failed event."""
    event_data = {
        "id": "in_test_invoice",
        "object": "invoice",
        "customer": "cus_test_customer",
        "subscription": "sub_test_subscription",
        "status": "open",
        "attempt_count": 1,
        "next_payment_attempt": int((datetime.now().timestamp() + 24 * 60 * 60)),
        "amount_due": 699,
        "currency": "cad"
    }
    test_webhook_event("invoice.payment_failed", event_data)

def main():
    """Run all webhook tests."""
    print("🧪 Testing Stripe Webhook Events")
    print("=" * 50)
    
    # Check if server is running
    try:
        response = requests.get("http://localhost:8000/health")
        if response.status_code != 200:
            print("❌ Backend server is not running. Please start it first.")
            return
    except:
        print("❌ Backend server is not running. Please start it first.")
        return
    
    print("✅ Backend server is running")
    print()
    
    # Run tests
    test_checkout_session_completed()
    test_subscription_created()
    test_subscription_updated()
    test_subscription_deleted()
    test_invoice_paid()
    test_invoice_payment_failed()
    
    print()
    print("🎉 Webhook testing completed!")
    print()
    print("Note: These are simplified test events. For proper testing, use the Stripe CLI:")
    print("   stripe listen --forward-to localhost:8000/stripe/webhook")

if __name__ == "__main__":
    main() 
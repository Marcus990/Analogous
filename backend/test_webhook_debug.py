#!/usr/bin/env python3
"""
Test script to debug webhook issues
"""
import requests
import json

def test_webhook_endpoint():
    """Test if the webhook endpoint is accessible"""
    try:
        response = requests.get("http://localhost:8000/health")
        print(f"Health check: {response.status_code} - {response.text}")
        
        # Test webhook endpoint with invalid data (should return 400)
        response = requests.post(
            "http://localhost:8000/stripe/webhook",
            headers={"Content-Type": "application/json"},
            data=json.dumps({"test": "data"})
        )
        print(f"Webhook test: {response.status_code} - {response.text}")
        
    except Exception as e:
        print(f"Error testing webhook: {e}")

if __name__ == "__main__":
    test_webhook_endpoint() 
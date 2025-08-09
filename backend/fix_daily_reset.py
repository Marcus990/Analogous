#!/usr/bin/env python3
"""
Script to test and fix daily reset issues for users.
"""

import os
import sys
from datetime import datetime, date
from supabase import create_client, Client

# Initialize Supabase client
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PRIVATE_KEY")
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def should_reset_daily_count(daily_reset_date, user_current_date):
    """
    Determine if the daily count should be reset based on the stored reset date and current date.
    Returns True if reset is needed, False otherwise.
    """
    if not daily_reset_date:
        return True
    
    try:
        # Parse the stored date - handle multiple formats
        if isinstance(daily_reset_date, str):
            # Try different date formats
            for fmt in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S.%fZ"]:
                try:
                    parsed_date = datetime.strptime(daily_reset_date, fmt).date()
                    break
                except ValueError:
                    continue
            else:
                # If none of the formats work, try isoformat parsing
                try:
                    parsed_date = datetime.fromisoformat(daily_reset_date.replace('Z', '+00:00')).date()
                except (ValueError, TypeError):
                    print(f"Failed to parse daily_reset_date: {daily_reset_date}")
                    return True
        elif isinstance(daily_reset_date, datetime):
            parsed_date = daily_reset_date.date()
        else:
            print(f"Unexpected daily_reset_date type: {type(daily_reset_date)}")
            return True
        
        # Compare dates
        should_reset = parsed_date < user_current_date
        print(f"Daily reset check - Parsed reset date: {parsed_date}, Current date: {user_current_date}, Should reset: {should_reset}")
        return should_reset
        
    except Exception as e:
        print(f"Error in should_reset_daily_count: {e}")
        return True

def check_user_daily_reset(user_id: str):
    """
    Check a user's daily reset status and fix if needed.
    """
    try:
        # Get user data
        user_response = supabase_client.table("user_information").select(
            "daily_analogies_generated", "daily_reset_date", "plan"
        ).eq("id", user_id).single().execute()
        
        if not user_response.data:
            print(f"User {user_id} not found")
            return
        
        user_data = user_response.data
        current_date = datetime.now().date()
        
        print(f"User ID: {user_id}")
        print(f"Current date: {current_date}")
        print(f"Daily reset date: {user_data.get('daily_reset_date')}")
        print(f"Daily analogies generated: {user_data.get('daily_analogies_generated', 0)}")
        print(f"Plan: {user_data.get('plan')}")
        
        # Check if reset is needed
        should_reset = should_reset_daily_count(user_data.get("daily_reset_date"), current_date)
        print(f"Should reset: {should_reset}")
        
        if should_reset:
            print("Resetting daily count...")
            reset_response = supabase_client.table("user_information").update({
                "daily_reset_date": current_date.isoformat(),
                "daily_analogies_generated": 0
            }).eq("id", user_id).execute()
            
            if reset_response.data:
                print("✅ Daily count reset successfully!")
                print(f"New reset date: {current_date.isoformat()}")
                print(f"New daily count: 0")
            else:
                print("❌ Failed to reset daily count")
        else:
            print("✅ No reset needed")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python fix_daily_reset.py <user_id>")
        sys.exit(1)
    
    user_id = sys.argv[1]
    check_user_daily_reset(user_id) 
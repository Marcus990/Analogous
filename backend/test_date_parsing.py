#!/usr/bin/env python3
"""
Test script to debug date parsing issues.
"""

from datetime import datetime, date

def test_date_parsing():
    # Test the date that's causing issues
    test_date_str = "2025-07-31"  # This is what the user reported
    
    print(f"Testing date parsing for: {test_date_str}")
    print(f"Current date: {datetime.now().date()}")
    
    # Try different parsing methods
    try:
        # Method 1: Simple strptime
        parsed_date = datetime.strptime(test_date_str, "%Y-%m-%d").date()
        print(f"Method 1 (strptime): {parsed_date}")
    except Exception as e:
        print(f"Method 1 failed: {e}")
    
    try:
        # Method 2: isoformat
        parsed_date = datetime.fromisoformat(test_date_str).date()
        print(f"Method 2 (isoformat): {parsed_date}")
    except Exception as e:
        print(f"Method 2 failed: {e}")
    
    # Test comparison
    current_date = datetime.now().date()
    parsed_date = datetime.strptime(test_date_str, "%Y-%m-%d").date()
    
    print(f"\nComparison:")
    print(f"Parsed date: {parsed_date}")
    print(f"Current date: {current_date}")
    print(f"Parsed < Current: {parsed_date < current_date}")
    print(f"Parsed == Current: {parsed_date == current_date}")
    print(f"Parsed > Current: {parsed_date > current_date}")

if __name__ == "__main__":
    test_date_parsing() 
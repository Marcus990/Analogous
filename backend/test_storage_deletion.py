#!/usr/bin/env python3
"""
Test script for storage deletion functionality.
This script tests the delete_analogy_images_from_storage function.
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.helpers import delete_analogy_images_from_storage, cleanup_orphaned_storage_images

# Load environment variables
load_dotenv()

async def test_storage_deletion():
    """Test the storage deletion functionality."""
    
    print("Testing storage deletion functionality...")
    
    # Test with a non-existent analogy ID (should handle gracefully)
    print("\n1. Testing with non-existent analogy ID...")
    result = await delete_analogy_images_from_storage("non-existent-id")
    print(f"Result: {result}")
    
    # Test orphaned image cleanup
    print("\n2. Testing orphaned image cleanup...")
    cleanup_result = await cleanup_orphaned_storage_images()
    print(f"Cleanup result: {cleanup_result}")
    
    print("\nStorage deletion tests completed!")

if __name__ == "__main__":
    asyncio.run(test_storage_deletion()) 
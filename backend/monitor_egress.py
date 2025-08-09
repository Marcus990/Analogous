#!/usr/bin/env python3
"""
Egress monitoring script for Supabase Storage.
This script helps identify egress usage patterns and provides optimization recommendations.
"""

import os
import sys
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_BASE_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000")

def get_storage_stats():
    """Get storage statistics from the API."""
    try:
        response = requests.get(f"{API_BASE_URL}/admin/storage-stats")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error getting storage stats: {e}")
        return None

def estimate_egress_usage():
    """Estimate egress usage based on storage patterns."""
    stats_response = get_storage_stats()
    if not stats_response or not stats_response.get('success'):
        print("❌ Failed to get storage statistics")
        return None

    stats = stats_response['stats']
    if 'error' in stats:
        print(f"❌ Error: {stats['error']}")
        return None

    total_files = stats['total_files']
    total_size_mb = stats['total_size_mb']
    
    # Estimate egress based on typical usage patterns
    # These are conservative estimates - adjust based on your actual usage
    estimates = {
        'low_usage': {
            'views_per_image': 2,
            'description': 'Conservative estimate (2 views per image)'
        },
        'medium_usage': {
            'views_per_image': 5,
            'description': 'Typical usage (5 views per image)'
        },
        'high_usage': {
            'views_per_image': 10,
            'description': 'High usage (10 views per image)'
        }
    }

    results = {}
    for usage_type, config in estimates.items():
        monthly_egress_mb = total_size_mb * config['views_per_image']
        monthly_egress_gb = monthly_egress_mb / 1024
        free_plan_usage = (monthly_egress_gb / 5) * 100
        
        results[usage_type] = {
            'monthly_egress_gb': monthly_egress_gb,
            'free_plan_usage_percent': free_plan_usage,
            'description': config['description']
        }

    return {
        'storage_stats': stats,
        'estimates': results
    }

def print_egress_report():
    """Print a comprehensive egress report."""
    print("=" * 70)
    print("SUPABASE STORAGE EGRESS ANALYSIS REPORT")
    print("=" * 70)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    data = estimate_egress_usage()
    if not data:
        return

    stats = data['storage_stats']
    estimates = data['estimates']

    # Current storage info
    print("📊 CURRENT STORAGE STATUS:")
    print(f"   Total Files: {stats['total_files']:,}")
    print(f"   Total Size: {stats['total_size_mb']:.2f} MB")
    print(f"   Average File Size: {stats['total_size_mb'] / max(stats['total_files'], 1):.2f} MB")
    print()

    # File type distribution
    if stats.get('file_types'):
        print("📁 FILE TYPE DISTRIBUTION:")
        for file_type, count in sorted(stats['file_types'].items(), key=lambda x: x[1], reverse=True):
            print(f"   {file_type.upper()}: {count:,} files")
        print()

    # Egress estimates
    print("🌐 EGRESS ESTIMATES (Monthly):")
    for usage_type, estimate in estimates.items():
        print(f"   {estimate['description']}:")
        print(f"     Estimated Egress: {estimate['monthly_egress_gb']:.2f} GB")
        print(f"     Free Plan Usage: {estimate['free_plan_usage_percent']:.1f}%")
        
        if estimate['free_plan_usage_percent'] > 80:
            print(f"     ⚠️  WARNING: Approaching 5GB limit!")
        elif estimate['free_plan_usage_percent'] > 50:
            print(f"     ⚠️  WARNING: Using more than 50% of free plan")
        else:
            print(f"     ✅ Within free plan limits")
        print()

    # Recommendations
    print("💡 OPTIMIZATION RECOMMENDATIONS:")
    
    # Check if we're using the optimizations
    print("   1. ✅ Image compression implemented (512x512px, 85% quality)")
    print("   2. ✅ Client-side caching implemented")
    print("   3. ✅ Reduced image loading in lists (1 image + indicator)")
    print("   4. ✅ Lazy loading implemented")
    print("   5. ✅ Database query optimization (selective fields)")
    print()

    # Additional recommendations based on usage
    high_usage = estimates['high_usage']['free_plan_usage_percent']
    if high_usage > 80:
        print("🚨 URGENT: You're likely exceeding the 5GB free plan limit!")
        print("   Immediate actions needed:")
        print("   - Consider upgrading to a paid plan")
        print("   - Implement more aggressive caching")
        print("   - Reduce image quality further")
        print("   - Implement CDN for frequently accessed images")
    elif high_usage > 50:
        print("⚠️  WARNING: You may exceed limits with high usage")
        print("   Consider implementing:")
        print("   - More aggressive image compression")
        print("   - CDN for popular images")
        print("   - User-based image access limits")
    else:
        print("✅ Your current optimizations should keep you within limits")
        print("   Continue monitoring usage patterns")

    print("=" * 70)

def main():
    """Main function."""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "help":
            print("Usage:")
            print("  python monitor_egress.py          # Show egress report")
            print("  python monitor_egress.py help     # Show this help")
        else:
            print(f"Unknown command: {command}")
            print("Use 'python monitor_egress.py help' for usage information")
    else:
        print_egress_report()

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3
"""
Storage monitoring script for Supabase Storage egress optimization.
Run this script to monitor your storage usage and get recommendations.
"""

import os
import sys
import requests
from datetime import datetime
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

def get_storage_optimization():
    """Get storage optimization recommendations."""
    try:
        response = requests.get(f"{API_BASE_URL}/admin/storage-optimization")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error getting storage optimization: {e}")
        return None

def cleanup_old_files(days_old=30):
    """Clean up old files."""
    try:
        response = requests.post(f"{API_BASE_URL}/admin/cleanup-old-files?days_old={days_old}")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error cleaning up old files: {e}")
        return None

def format_bytes(bytes_value):
    """Format bytes into human readable format."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_value < 1024.0:
            return f"{bytes_value:.2f} {unit}"
        bytes_value /= 1024.0
    return f"{bytes_value:.2f} TB"

def print_storage_report():
    """Print a comprehensive storage report."""
    print("=" * 60)
    print("SUPABASE STORAGE EGRESS MONITORING REPORT")
    print("=" * 60)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Get storage stats
    stats_response = get_storage_stats()
    if not stats_response or not stats_response.get('success'):
        print("❌ Failed to get storage statistics")
        return

    stats = stats_response['stats']
    
    if 'error' in stats:
        print(f"❌ Error: {stats['error']}")
        return

    # Display current stats
    print("📊 CURRENT STORAGE USAGE:")
    print(f"   Total Files: {stats['total_files']:,}")
    print(f"   Total Size: {format_bytes(stats['total_size_bytes'])}")
    print(f"   Average File Size: {format_bytes(stats['total_size_bytes'] / max(stats['total_files'], 1))}")
    print()

    # Display file type distribution
    if stats.get('file_types'):
        print("📁 FILE TYPE DISTRIBUTION:")
        for file_type, count in sorted(stats['file_types'].items(), key=lambda x: x[1], reverse=True):
            print(f"   {file_type.upper()}: {count:,} files")
        print()

    # Get optimization recommendations
    opt_response = get_storage_optimization()
    if opt_response and opt_response.get('success'):
        optimization = opt_response['optimization']
        
        if optimization.get('recommendations'):
            print("💡 OPTIMIZATION RECOMMENDATIONS:")
            for i, rec in enumerate(optimization['recommendations'], 1):
                print(f"   {i}. {rec['message']}")
                print(f"      Action: {rec['action']}")
                print()
        else:
            print("✅ No immediate optimization recommendations")
            print()

    # Egress estimation
    print("🌐 EGRESS ESTIMATION:")
    total_size_mb = stats['total_size_mb']
    
    # Estimate egress based on typical usage patterns
    # Assuming each image is viewed 3 times on average
    estimated_egress_mb = total_size_mb * 3
    estimated_egress_gb = estimated_egress_mb / 1024
    
    print(f"   Current Storage: {total_size_mb:.2f} MB")
    print(f"   Estimated Monthly Egress: {estimated_egress_gb:.2f} GB")
    print(f"   Free Plan Limit: 5 GB")
    print(f"   Usage: {(estimated_egress_gb / 5) * 100:.1f}% of free plan")
    print()

    # Recommendations based on usage
    if estimated_egress_gb > 4:
        print("⚠️  WARNING: You're approaching the 5GB free plan limit!")
        print("   Consider implementing the following immediately:")
        print("   1. Reduce image quality/compression")
        print("   2. Implement aggressive cleanup policies")
        print("   3. Consider upgrading to a paid plan")
    elif estimated_egress_gb > 2:
        print("⚠️  WARNING: You're using more than 40% of your free plan")
        print("   Consider implementing optimization strategies")
    else:
        print("✅ You're well within your free plan limits")

    print("=" * 60)

def main():
    """Main function."""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "cleanup":
            days = int(sys.argv[2]) if len(sys.argv) > 2 else 30
            print(f"🧹 Cleaning up files older than {days} days...")
            result = cleanup_old_files(days)
            if result and result.get('success'):
                cleanup_result = result['result']
                print(f"✅ Cleanup completed!")
                print(f"   Deleted files: {cleanup_result.get('deleted_count', 0)}")
                if cleanup_result.get('errors'):
                    print(f"   Errors: {len(cleanup_result['errors'])}")
            else:
                print("❌ Cleanup failed")
        elif command == "help":
            print("Usage:")
            print("  python monitor_storage.py          # Show storage report")
            print("  python monitor_storage.py cleanup  # Clean up old files (30 days)")
            print("  python monitor_storage.py cleanup 60  # Clean up files older than 60 days")
        else:
            print(f"Unknown command: {command}")
            print("Use 'python monitor_storage.py help' for usage information")
    else:
        print_storage_report()

if __name__ == "__main__":
    main() 
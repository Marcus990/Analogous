"""
Storage management utilities for optimizing Supabase Storage usage and reducing egress.
"""

import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
from supabase import create_client, Client

# Initialize Supabase client
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PRIVATE_KEY")
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class StorageManager:
    """Manages Supabase Storage operations with optimization features."""
    
    def __init__(self, bucket_name: str = "analogy-images"):
        self.bucket_name = bucket_name
        self.cache = {}
        self.cache_ttl = 3600  # 1 hour cache TTL
    
    def get_storage_usage_stats(self) -> Dict:
        """
        Get storage usage statistics to monitor egress.
        
        Returns:
            Dict containing storage statistics
        """
        try:
            # List all files in the bucket
            files = supabase_client.storage.from_(self.bucket_name).list()
            
            total_files = len(files) if files else 0
            total_size = 0
            file_types = {}
            
            for file_info in files or []:
                size = file_info.get('metadata', {}).get('size', 0)
                total_size += size
                
                # Count file types
                name = file_info.get('name', '')
                ext = name.split('.')[-1].lower() if '.' in name else 'unknown'
                file_types[ext] = file_types.get(ext, 0) + 1
            
            return {
                'total_files': total_files,
                'total_size_bytes': total_size,
                'total_size_mb': round(total_size / (1024 * 1024), 2),
                'file_types': file_types,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error getting storage stats: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def cleanup_old_files(self, days_old: int = 30) -> Dict:
        """
        Clean up files older than specified days.
        
        Args:
            days_old (int): Number of days after which files should be deleted
            
        Returns:
            Dict containing cleanup results
        """
        try:
            files = supabase_client.storage.from_(self.bucket_name).list()
            cutoff_date = datetime.now() - timedelta(days=days_old)
            
            deleted_files = []
            errors = []
            
            for file_info in files or []:
                created_at = file_info.get('created_at')
                if created_at:
                    file_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    if file_date < cutoff_date:
                        try:
                            file_name = file_info.get('name')
                            supabase_client.storage.from_(self.bucket_name).remove([file_name])
                            deleted_files.append(file_name)
                        except Exception as e:
                            errors.append(f"Failed to delete {file_info.get('name')}: {e}")
            
            return {
                'deleted_files': deleted_files,
                'deleted_count': len(deleted_files),
                'errors': errors,
                'cutoff_date': cutoff_date.isoformat()
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def get_duplicate_files(self) -> List[Tuple[str, List[str]]]:
        """
        Find potential duplicate files based on size and metadata.
        
        Returns:
            List of tuples containing (file_size, [file_names])
        """
        try:
            files = supabase_client.storage.from_(self.bucket_name).list()
            
            # Group files by size
            size_groups = {}
            for file_info in files or []:
                size = file_info.get('metadata', {}).get('size', 0)
                name = file_info.get('name', '')
                
                if size not in size_groups:
                    size_groups[size] = []
                size_groups[size].append(name)
            
            # Return groups with more than one file
            duplicates = [(size, names) for size, names in size_groups.items() 
                         if len(names) > 1 and size > 0]
            
            return duplicates
            
        except Exception as e:
            print(f"Error finding duplicates: {e}")
            return []
    
    def optimize_storage_settings(self) -> Dict:
        """
        Apply storage optimization settings.
        
        Returns:
            Dict containing optimization results
        """
        recommendations = []
        
        # Get current stats
        stats = self.get_storage_usage_stats()
        
        if 'error' not in stats:
            total_size_mb = stats.get('total_size_mb', 0)
            
            # Check if total size is getting large
            if total_size_mb > 100:  # 100MB threshold
                recommendations.append({
                    'type': 'warning',
                    'message': f'Storage size is {total_size_mb}MB. Consider implementing cleanup policies.',
                    'action': 'Implement automatic cleanup for old files'
                })
            
            # Check file type distribution
            file_types = stats.get('file_types', {})
            if file_types.get('png', 0) > file_types.get('jpg', 0):
                recommendations.append({
                    'type': 'optimization',
                    'message': 'More PNG files than JPG. Consider converting PNGs to optimized JPGs.',
                    'action': 'Convert PNG files to JPG with compression'
                })
        
        return {
            'recommendations': recommendations,
            'current_stats': stats,
            'timestamp': datetime.now().isoformat()
        }

# Global storage manager instance
storage_manager = StorageManager() 
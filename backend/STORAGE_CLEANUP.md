# Storage Cleanup Documentation

This document describes the storage cleanup functionality that automatically deletes images from Supabase Storage when analogies are deleted.

## Overview

When users delete analogies from their history, the system now automatically cleans up the associated images from the Supabase Storage bucket (`analogy-images`) to prevent storage bloat and unnecessary costs.

## Implementation Details

### Automatic Cleanup

The main deletion endpoint (`DELETE /analogy/{analogy_id}`) now includes automatic storage cleanup:

1. **Fetch Image Records**: Retrieves all image records associated with the analogy from the `analogy_images` table
2. **Delete from Storage**: Deletes each image file from the Supabase Storage bucket
3. **Delete Analogy**: Deletes the analogy record (which cascades to related records)
4. **Error Handling**: Continues with analogy deletion even if some storage deletions fail

### Key Functions

#### `delete_analogy_images_from_storage(analogy_id: str) -> bool`

Deletes all images associated with a specific analogy from Supabase Storage.

**Features:**
- Handles both file paths and URLs
- Skips fallback images (static assets)
- Continues processing even if individual deletions fail
- Provides detailed logging

#### `cleanup_orphaned_storage_images() -> dict`

Utility function to clean up orphaned images (files in storage without database records).

**Features:**
- Compares storage files with database records
- Identifies and deletes orphaned files
- Returns detailed cleanup statistics

#### `delete_all_analogy_images_from_storage(analogy_ids: list[str]) -> dict`

Bulk deletion function for cleaning up multiple analogies at once.

## API Endpoints

### DELETE /analogy/{analogy_id}

**Updated Behavior:**
- Now automatically deletes associated images from storage
- Returns success even if some storage deletions fail
- Maintains backward compatibility

### POST /admin/cleanup-orphaned-images

**New Maintenance Endpoint:**
- Cleans up orphaned images in storage
- Returns detailed cleanup statistics
- Should be run periodically for maintenance

**Response Example:**
```json
{
  "status": "success",
  "message": "Orphaned image cleanup completed",
  "results": {
    "total_storage_files": 150,
    "total_db_records": 145,
    "orphaned_files": 5,
    "deleted_files": 5,
    "errors": 0
  }
}
```

## Error Handling

The system is designed to be resilient:

1. **Individual File Failures**: If a single image fails to delete, the process continues with other images
2. **Storage API Failures**: If storage operations fail, the analogy deletion still proceeds
3. **Invalid File Names**: Invalid or malformed file names are skipped with logging
4. **Fallback Images**: Static fallback images are automatically skipped

## Testing

Run the test script to verify functionality:

```bash
cd backend
python test_storage_deletion.py
```

## Maintenance

### Regular Cleanup

Run the orphaned image cleanup endpoint periodically:

```bash
curl -X POST http://localhost:8000/admin/cleanup-orphaned-images
```

### Monitoring

Monitor the logs for:
- Storage deletion success/failure rates
- Orphaned file counts
- Error patterns

## Security Considerations

- The cleanup endpoint (`/admin/cleanup-orphaned-images`) should be protected in production
- Only authorized administrators should have access to maintenance endpoints
- All operations are logged for audit purposes

## Performance Impact

- Storage deletion adds minimal overhead to analogy deletion
- Bulk operations are available for large-scale cleanup
- Operations are asynchronous and non-blocking

## Troubleshooting

### Common Issues

1. **Storage API Errors**: Check Supabase credentials and bucket permissions
2. **File Not Found**: Files may have been manually deleted or moved
3. **Permission Denied**: Verify storage bucket access rights

### Debugging

Enable detailed logging by checking the console output for:
- File deletion attempts and responses
- Error messages and stack traces
- Cleanup statistics

## Future Enhancements

Potential improvements:
- Scheduled automatic cleanup jobs
- Storage usage monitoring and alerts
- Batch processing for large datasets
- Integration with monitoring systems 
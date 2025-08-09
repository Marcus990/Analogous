import json
import re
import os
import uuid
import httpx
import replicate
from dotenv import load_dotenv
import tempfile
from supabase import create_client, Client
from PIL import Image
import io
from functools import lru_cache
import hashlib
import time

# Load environment variables
load_dotenv()

# Initialize Replicate client
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

# Initialize Supabase client
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PRIVATE_KEY")
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

FALLBACK_IMAGES = [
    "/static/assets/default_image0.jpeg",
    "/static/assets/default_image1.jpeg",
    "/static/assets/default_image2.jpeg",
]

# Simple cache for signed URLs to reduce repeated API calls
_signed_url_cache = {}

def get_cached_signed_url(file_path: str, expires_in: int = 3600) -> str:
    """
    Get a cached signed URL or generate a new one.
    
    Args:
        file_path (str): The file path in storage
        expires_in (int): URL expiration time in seconds
        
    Returns:
        str: Signed URL
    """
    cache_key = f"{file_path}_{expires_in}"
    
    # Check if we have a cached URL that's still valid
    if cache_key in _signed_url_cache:
        cached_url, cached_time = _signed_url_cache[cache_key]
        # Check if URL is still valid (with 5 minute buffer)
        if time.time() < cached_time + expires_in - 300:
            return cached_url
    
    # Generate new signed URL
    try:
        if file_path.startswith("analogy-images/"):
            file_name = file_path.replace("analogy-images/", "")
            signed_url_response = supabase_client.storage.from_("analogy-images").create_signed_url(
                path=file_name,
                expires_in=expires_in
            )
            signed_url = signed_url_response.get('signedURL') or signed_url_response.get('signedUrl')
            if signed_url:
                # Cache the URL with current timestamp
                _signed_url_cache[cache_key] = (signed_url, time.time())
                return signed_url
    except Exception as e:
        print(f"Error generating signed URL for {file_path}: {e}")
    
    return FALLBACK_IMAGES[0]

def optimize_image(image_data: bytes, max_size: tuple = (512, 512), quality: int = 85) -> bytes:
    """
    Optimize image by resizing and compressing to reduce file size.
    
    Args:
        image_data (bytes): Raw image data
        max_size (tuple): Maximum width and height (default: 512x512)
        quality (int): JPEG quality (1-100, default: 85)
        
    Returns:
        bytes: Optimized image data
    """
    try:
        # Open image from bytes
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary (for JPEG compatibility)
        if image.mode in ('RGBA', 'LA', 'P'):
            image = image.convert('RGB')
        
        # Resize if larger than max_size while maintaining aspect ratio
        if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Save optimized image to bytes
        output_buffer = io.BytesIO()
        image.save(output_buffer, format='JPEG', quality=quality, optimize=True)
        output_buffer.seek(0)
        
        return output_buffer.getvalue()
        
    except Exception as e:
        print(f"Error optimizing image: {e}")
        return image_data  # Return original if optimization fails

async def generate_image_replicate(prompt: str, fallback_index: int, negative_prompt: str = "", timeout: float = 20.0) -> str:
    print(f"Replicate API Token: {REPLICATE_API_TOKEN}")
    if not REPLICATE_API_TOKEN:
        print("Missing Replicate API token. Using fallback.")
        return FALLBACK_IMAGES[fallback_index]

    try:
        # Set the API token for replicate
        os.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_TOKEN
        
        # Run the SDXL model on Replicate
        # Using the stable-diffusion-xl model
        output = replicate.run(
            "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
            input={
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "width": 768, # do 1024 x 1024 for better quality
                "height": 768,
                "num_outputs": 1,
                "scheduler": "K_EULER",
                "num_inference_steps": 30,
                "guidance_scale": 7.5,
                "refine": "expert_ensemble_refiner",
                "apply_watermark": False,
            }
        )
        
        if not output or len(output) == 0:
            print(f"Replicate returned no output for prompt [{prompt[:40]}...]")
            return FALLBACK_IMAGES[fallback_index]
        
        # Get the first (and only) image URL
        image_url = str(output[0])
        
        # Download the image
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(image_url)
            response.raise_for_status()
            image_data = response.content
            
            # Optimize the image to reduce file size
            print(f"Original image size: {len(image_data)} bytes")
            optimized_image_data = optimize_image(image_data, max_size=(512, 512), quality=85)
            print(f"Optimized image size: {len(optimized_image_data)} bytes")
            print(f"Size reduction: {((len(image_data) - len(optimized_image_data)) / len(image_data) * 100):.1f}%")
            
            # Create a temporary file to store the optimized image
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                temp_file.write(optimized_image_data)
                temp_file_path = temp_file.name
            
            try:
                # Upload to Supabase Storage
                file_name = f"{uuid.uuid4()}.jpg"
                
                # Upload the image to Supabase Storage
                with open(temp_file_path, 'rb') as f:
                    upload_response = supabase_client.storage.from_("analogy-images").upload(
                        path=file_name,
                        file=f,
                        file_options={"content-type": "image/jpeg"}
                    )
                
                # For private buckets, we need to store the file path and generate signed URLs when needed
                # Store the file path instead of a public URL
                file_path = f"analogy-images/{file_name}"
                
                print(f"Successfully uploaded image to Supabase Storage: {file_path}")
                print(f"File name: {file_name}")
                print(f"Bucket: analogy-images")
                print(f"File path: {file_path}")
                
                # Return the file path - we'll generate signed URLs when serving images
                return file_path
                
            finally:
                # Clean up the temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
            
    except Exception as e:
        print(f"Replicate image generation error for prompt [{prompt[:40]}...]: {e}")
        return FALLBACK_IMAGES[fallback_index]

async def insert_analogy_image(analogy_id: str, user_id: str, image_url: str, image_index: int, prompt: str, negative_prompt: str = "") -> bool:
    """
    Insert a record into the analogy_images table.
    
    Args:
        analogy_id (str): The ID of the analogy
        user_id (str): The ID of the user
        image_url (str): The Supabase Storage public URL
        image_index (int): The index of the image (0, 1, or 2)
        prompt (str): The prompt used to generate the image
        negative_prompt (str): The negative prompt used (optional)
        
    Returns:
        bool: True if successfully inserted, False otherwise
    """
    try:
        # Insert the image record into the analogy_images table
        insert_response = supabase_client.table("analogy_images").insert({
            "analogy_id": analogy_id,
            "user_id": user_id,
            "image_url": image_url,
            "image_index": image_index,
            "prompt": prompt,
            "negative_prompt": negative_prompt,
        }).execute()
        
        if insert_response.data:
            print(f"Successfully inserted analogy image record for analogy {analogy_id}, image {image_index}")
            return True
        else:
            print(f"Failed to insert analogy image record for analogy {analogy_id}, image {image_index}")
            return False
            
    except Exception as e:
        print(f"Error inserting analogy image record: {e}")
        return False

def get_fallback_images_for_analogy() -> list[str]:
    """
    Get the fallback images for an analogy.
    
    Returns:
        list[str]: List of fallback image URLs
    """
    return [
        "/static/assets/default_image0.jpeg",
        "/static/assets/default_image1.jpeg",
        "/static/assets/default_image2.jpeg"
    ]

def convert_public_url_to_file_path(public_url: str) -> str:
    """
    Convert a public Supabase Storage URL to a file path for private bucket access.
    
    Args:
        public_url (str): The public URL (e.g., "https://.../storage/v1/object/public/analogy-images/filename.jpg")
        
    Returns:
        str: File path (e.g., "analogy-images/filename.jpg") or original URL if conversion fails
    """
    try:
        if not public_url or not public_url.startswith("http"):
            return public_url
        
        # Extract the file name from the public URL
        if "/analogy-images/" in public_url:
            file_name = public_url.split("/analogy-images/")[-1]
            # Remove any query parameters
            file_name = file_name.split("?")[0]
            return f"analogy-images/{file_name}"
        
        return public_url
        
    except Exception as e:
        print(f"Error converting public URL to file path: {e}")
        return public_url

def fix_supabase_storage_url(image_url: str) -> str:
    """
    Fix Supabase Storage URL if it's malformed.
    For private buckets, generate signed URLs.
    
    Args:
        image_url (str): The potentially malformed image URL or file path
        
    Returns:
        str: Fixed image URL or fallback
    """
    try:
        print(f"Fixing Supabase Storage URL: {image_url}")
        
        # If it's already a valid URL, check if it's a public Supabase URL that needs conversion
        if image_url.startswith("http"):
            # Check if it's a public Supabase Storage URL that needs to be converted to a signed URL
            if "/storage/v1/object/public/analogy-images/" in image_url:
                print(f"Converting public URL to file path: {image_url}")
                file_path = convert_public_url_to_file_path(image_url)
                print(f"Converted to file path: {file_path}")
                # Continue processing as file path
                image_url = file_path
            else:
                print(f"URL already valid: {image_url}")
                return image_url
        
        # If it's a file path (e.g., "analogy-images/filename.jpg"), generate a signed URL
        if "/" in image_url and (image_url.endswith(".jpg") or image_url.endswith(".jpeg") or image_url.endswith(".png")):
            try:
                # Extract bucket and file path
                if image_url.startswith("analogy-images/"):
                    # Use cached signed URL to reduce API calls
                    signed_url = get_cached_signed_url(image_url, expires_in=3600)
                    if signed_url and signed_url != FALLBACK_IMAGES[0]:
                        print(f"Using cached signed URL: {signed_url}")
                        return signed_url
                    else:
                        print(f"Failed to get signed URL for {image_url}")
                        return FALLBACK_IMAGES[0]
                else:
                    print(f"Unknown file path format: {image_url}")
                    return FALLBACK_IMAGES[0]
            except Exception as e:
                print(f"Error generating signed URL for {image_url}: {e}")
                return FALLBACK_IMAGES[0]
        
        # If it's just a file name, construct the file path first
        if image_url.endswith(".jpg") or image_url.endswith(".jpeg") or image_url.endswith(".png"):
            try:
                # Generate a signed URL for the file
                signed_url_response = supabase_client.storage.from_("analogy-images").create_signed_url(
                    path=image_url,
                    expires_in=3600  # 1 hour expiration
                )
                # Extract the signed URL from the response
                signed_url = signed_url_response.get('signedURL') or signed_url_response.get('signedUrl')
                if signed_url:
                    print(f"Generated signed URL for filename: {signed_url}")
                    return signed_url
                else:
                    print(f"Failed to extract signed URL from response: {signed_url_response}")
                    return FALLBACK_IMAGES[0]
            except Exception as e:
                print(f"Error generating signed URL for filename {image_url}: {e}")
                return FALLBACK_IMAGES[0]
        
        # If we can't fix it, return fallback
        print(f"Could not fix malformed URL: {image_url}")
        return FALLBACK_IMAGES[0]  # Return first fallback image
        
    except Exception as e:
        print(f"Error fixing Supabase Storage URL {image_url}: {e}")
        return FALLBACK_IMAGES[0]

async def delete_analogy_images_from_storage(analogy_id: str) -> bool:
    """
    Delete all images associated with an analogy from Supabase Storage.
    
    Args:
        analogy_id (str): The ID of the analogy whose images should be deleted
        
    Returns:
        bool: True if successfully deleted or no images found, False if error occurred
    """
    try:
        print(f"Deleting images from storage for analogy: {analogy_id}")
        
        # First, get all image records for this analogy
        images_result = supabase_client.table("analogy_images").select("image_url").eq("analogy_id", analogy_id).execute()
        
        if not images_result.data:
            print(f"No image records found for analogy {analogy_id}")
            return True
        
        deleted_count = 0
        error_count = 0
        skipped_count = 0
        
        for image_record in images_result.data:
            image_url = image_record.get("image_url")
            if not image_url:
                skipped_count += 1
                continue
            
            # Skip fallback images (they're not in storage)
            if image_url.startswith("/static/assets/"):
                print(f"Skipping fallback image: {image_url}")
                skipped_count += 1
                continue
                
            try:
                # Convert URL to file path if needed
                file_path = convert_public_url_to_file_path(image_url)
                
                # Extract just the filename from the file path
                if file_path.startswith("analogy-images/"):
                    file_name = file_path.replace("analogy-images/", "")
                else:
                    # If it's not in the expected format, try to extract filename from URL
                    if "/" in image_url:
                        file_name = image_url.split("/")[-1].split("?")[0]  # Remove query params
                    else:
                        file_name = image_url
                
                # Skip if filename is empty or invalid
                if not file_name or file_name == "analogy-images/":
                    print(f"Skipping invalid filename: {file_name}")
                    skipped_count += 1
                    continue
                
                print(f"Attempting to delete file: {file_name} from analogy-images bucket")
                
                # Delete the file from Supabase Storage
                delete_response = supabase_client.storage.from_("analogy-images").remove([file_name])
                
                print(f"Delete response for {file_name}: {delete_response}")
                deleted_count += 1
                
            except Exception as e:
                print(f"Error deleting image {image_url} from storage: {e}")
                error_count += 1
                # Continue with other images even if one fails
        
        print(f"Storage cleanup complete for analogy {analogy_id}: {deleted_count} deleted, {error_count} errors, {skipped_count} skipped")
        
        # Return True if we successfully processed all images (even if some deletions failed)
        return True
        
    except Exception as e:
        print(f"Error in delete_analogy_images_from_storage for analogy {analogy_id}: {e}")
        return False

async def delete_all_analogy_images_from_storage(analogy_ids: list[str]) -> dict:
    """
    Delete all images associated with multiple analogies from Supabase Storage.
    This is useful for bulk cleanup operations.
    
    Args:
        analogy_ids (list[str]): List of analogy IDs whose images should be deleted
        
    Returns:
        dict: Summary of deletion results
    """
    try:
        print(f"Bulk deleting images from storage for {len(analogy_ids)} analogies")
        
        total_deleted = 0
        total_errors = 0
        total_skipped = 0
        failed_analogies = []
        
        for analogy_id in analogy_ids:
            try:
                success = await delete_analogy_images_from_storage(analogy_id)
                if not success:
                    failed_analogies.append(analogy_id)
                    total_errors += 1
                else:
                    total_deleted += 1
            except Exception as e:
                print(f"Error processing analogy {analogy_id}: {e}")
                failed_analogies.append(analogy_id)
                total_errors += 1
        
        result = {
            "total_processed": len(analogy_ids),
            "successful_deletions": total_deleted,
            "failed_deletions": total_errors,
            "failed_analogies": failed_analogies
        }
        
        print(f"Bulk storage cleanup complete: {result}")
        return result
        
    except Exception as e:
        print(f"Error in bulk delete_analogy_images_from_storage: {e}")
        return {
            "total_processed": len(analogy_ids),
            "successful_deletions": 0,
            "failed_deletions": len(analogy_ids),
            "failed_analogies": analogy_ids,
            "error": str(e)
        }

async def cleanup_orphaned_storage_images() -> dict:
    """
    Clean up orphaned images in Supabase Storage that don't have corresponding database records.
    This is useful for maintenance and cleanup operations.
    
    Returns:
        dict: Summary of cleanup results
    """
    try:
        print("Starting cleanup of orphaned storage images")
        
        # Get all image records from the database
        db_images_result = supabase_client.table("analogy_images").select("image_url").execute()
        
        if not db_images_result.data:
            print("No image records found in database")
            return {
                "total_storage_files": 0,
                "total_db_records": 0,
                "orphaned_files": 0,
                "deleted_files": 0,
                "errors": 0
            }
        
        # Extract file names from database records
        db_file_names = set()
        for record in db_images_result.data:
            image_url = record.get("image_url")
            if image_url and not image_url.startswith("/static/assets/"):
                file_path = convert_public_url_to_file_path(image_url)
                if file_path.startswith("analogy-images/"):
                    file_name = file_path.replace("analogy-images/", "")
                    if file_name:
                        db_file_names.add(file_name)
        
        print(f"Found {len(db_file_names)} unique files referenced in database")
        
        # List all files in storage bucket
        try:
            storage_files_result = supabase_client.storage.from_("analogy-images").list()
            storage_files = storage_files_result if storage_files_result else []
        except Exception as e:
            print(f"Error listing storage files: {e}")
            return {
                "total_storage_files": 0,
                "total_db_records": len(db_images_result.data),
                "orphaned_files": 0,
                "deleted_files": 0,
                "errors": 1,
                "error": str(e)
            }
        
        print(f"Found {len(storage_files)} files in storage bucket")
        
        # Find orphaned files (files in storage but not in database)
        orphaned_files = []
        for file_info in storage_files:
            file_name = file_info.get("name")
            if file_name and file_name not in db_file_names:
                orphaned_files.append(file_name)
        
        print(f"Found {len(orphaned_files)} orphaned files")
        
        # Delete orphaned files
        deleted_count = 0
        error_count = 0
        
        for file_name in orphaned_files:
            try:
                print(f"Deleting orphaned file: {file_name}")
                delete_response = supabase_client.storage.from_("analogy-images").remove([file_name])
                print(f"Delete response for {file_name}: {delete_response}")
                deleted_count += 1
            except Exception as e:
                print(f"Error deleting orphaned file {file_name}: {e}")
                error_count += 1
        
        result = {
            "total_storage_files": len(storage_files),
            "total_db_records": len(db_images_result.data),
            "orphaned_files": len(orphaned_files),
            "deleted_files": deleted_count,
            "errors": error_count
        }
        
        print(f"Orphaned file cleanup complete: {result}")
        return result
        
    except Exception as e:
        print(f"Error in cleanup_orphaned_storage_images: {e}")
        return {
            "total_storage_files": 0,
            "total_db_records": 0,
            "orphaned_files": 0,
            "deleted_files": 0,
            "errors": 1,
            "error": str(e)
        }

def validate_username_format(username: str) -> dict:
    """
    Validate username format according to the specified rules.
    
    Args:
        username (str): The username to validate
        
    Returns:
        dict: Validation result with 'valid' boolean and 'error' message if invalid
    """
    if not username:
        return {"valid": False, "error": "Username is required"}
    
    if len(username) < 3:
        return {"valid": False, "error": "Username must be at least 3 characters long"}
    
    if len(username) > 30:
        return {"valid": False, "error": "Username must be no more than 30 characters long"}
    
    # Check for valid characters: lowercase letters, numbers, and underscores only
    import re
    if not re.match(r'^[a-z0-9_]+$', username):
        return {"valid": False, "error": "Username can only contain lowercase letters, numbers, and underscores"}
    
    return {"valid": True, "error": None}

async def check_username_uniqueness(username: str) -> dict:
    """
    Check if a username is unique in the database.
    
    Args:
        username (str): The username to check
        
    Returns:
        dict: Result with 'available' boolean and 'error' message if unavailable
    """
    try:
        # First validate the format
        format_validation = validate_username_format(username)
        if not format_validation["valid"]:
            return {"available": False, "error": format_validation["error"]}
        
        # Check for uniqueness in the database
        result = supabase_client.table("user_information").select("username").eq("username", username).execute()
        
        if result.data and len(result.data) > 0:
            return {"available": False, "error": "Username is already taken"}
        
        return {"available": True, "error": None}
        
    except Exception as e:
        print(f"Error checking username uniqueness: {e}")
        return {"available": False, "error": "Error checking username availability"}

async def check_email_uniqueness(email: str) -> dict:
    """
    Check if an email is unique in the database.
    
    Args:
        email (str): The email to check
        
    Returns:
        dict: Result with 'available' boolean and 'error' message if unavailable
    """
    try:
        # Check for uniqueness in the database
        result = supabase_client.table("user_information").select("email").eq("email", email.lower()).execute()
        
        if result.data and len(result.data) > 0:
            return {"available": False, "error": "An account with this email already exists"}
        
        return {"available": True, "error": None}
        
    except Exception as e:
        print(f"Error checking email uniqueness: {e}")
        return {"available": False, "error": "Error checking email availability"}
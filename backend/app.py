from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
import asyncio
import httpx
import uuid
import time
import traceback
import json
from datetime import datetime, date, timezone, timedelta
from dotenv import load_dotenv
import google.generativeai as genai
import supabase
from supabase import create_client, Client
import pytz
import random
import jwt
from typing import Optional
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import stripe

from utils.prompts import ANALOGY_PROMPT, COMIC_STYLE_PREFIX
from utils.helpers import generate_image_replicate, insert_analogy_image, get_fallback_images_for_analogy, fix_supabase_storage_url, delete_analogy_images_from_storage, cleanup_orphaned_storage_images
from utils.storage_manager import storage_manager
from stripe_config import stripe, STRIPE_PUBLISHABLE_KEY, SCHOLAR_PRICE_ID, CURRENCY

# Load environment variables
load_dotenv()

# Initialize Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Authentication helper functions
async def verify_jwt_token(authorization: Optional[str] = None) -> Optional[str]:
    """
    Verify JWT token from Supabase and return user ID if valid.
    
    Args:
        authorization: Authorization header value (Bearer token)
        
    Returns:
        user_id: The user ID if token is valid, None otherwise
    """
    print(f"verify_jwt_token - Authorization: {authorization}")
    
    if not authorization or not authorization.startswith("Bearer "):
        print("verify_jwt_token - No authorization header or doesn't start with Bearer")
        return None
    
    token = authorization.replace("Bearer ", "")
    print(f"verify_jwt_token - Token length: {len(token)}")
    
    try:
        # Use Supabase client's built-in JWT verification
        # This is the recommended way to verify Supabase JWT tokens
        user = supabase_client.auth.get_user(token)
        print(f"verify_jwt_token - Supabase user verification successful")
        print(f"verify_jwt_token - User ID: {user.user.id}")
        return user.user.id
        
    except Exception as e:
        print(f"verify_jwt_token - Token verification failed: {e}")
        print(f"verify_jwt_token - Exception type: {type(e)}")
        import traceback
        traceback.print_exc()
        return None

async def get_current_user(request: Request) -> str:
    """
    Dependency function to get the current authenticated user.
    
    Args:
        request: FastAPI request object
        
    Returns:
        user_id: The authenticated user's ID
        
    Raises:
        HTTPException: If user is not authenticated
    """
    authorization = request.headers.get("Authorization")
    print(f"get_current_user - Authorization header: {authorization}")
    
    user_id = await verify_jwt_token(authorization)
    print(f"get_current_user - Verified user_id: {user_id}")
    
    if not user_id:
        print("get_current_user - No user_id returned from verify_jwt_token")
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in to continue."
        )
    
    return user_id

# Timezone utility functions
def get_user_timezone(timezone_str: str):
    """
    Get a timezone object from a timezone string.
    Falls back to UTC if the timezone is invalid.
    """
    try:
        return pytz.timezone(timezone_str)
    except pytz.exceptions.UnknownTimeZoneError:
        print(f"Unknown timezone: {timezone_str}, falling back to UTC")
        return pytz.UTC

def convert_utc_to_user_timezone(utc_datetime: datetime, timezone_str: str):
    """
    Convert a UTC datetime to the user's local timezone.
    """
    user_tz = get_user_timezone(timezone_str)
    if utc_datetime.tzinfo is None:
        utc_datetime = utc_datetime.replace(tzinfo=pytz.UTC)
    return utc_datetime.astimezone(user_tz)

def get_user_current_date(timezone_str: str):
    """
    Get the current date in the user's timezone.
    """
    user_tz = get_user_timezone(timezone_str)
    return datetime.now(user_tz).date()

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

async def reset_daily_count_if_needed(user_id: str, user_data: dict, timezone_str: str):
    """
    Reset the daily count if it's a new day. Returns the current daily count.
    """
    user_current_date = get_user_current_date(timezone_str)
    daily_reset_date = user_data.get("daily_reset_date")
    current_daily_count = user_data.get("daily_analogies_generated", 0) or 0
    
    if should_reset_daily_count(daily_reset_date, user_current_date):
        print(f"Resetting daily count for new day. User current date: {user_current_date}, Daily reset date: {daily_reset_date}")
        # Update the reset date in database FIRST
        reset_response = supabase_client.table("user_information").update({
            "daily_reset_date": user_current_date.isoformat(),
            "daily_analogies_generated": 0
        }).eq("id", user_id).execute()
        print(f"Daily reset response: {reset_response.data}")
        
        if reset_response.data:
            # Fetch fresh data from database after reset
            fresh_user_response = supabase_client.table("user_information").select(
                "daily_analogies_generated"
            ).eq("id", user_id).single().execute()
            
            if fresh_user_response.data:
                current_daily_count = fresh_user_response.data.get("daily_analogies_generated", 0) or 0
                print(f"Daily count reset to: {current_daily_count}")
            else:
                print("Failed to fetch fresh daily count after reset")
        else:
            print("Failed to reset daily count in database")
    else:
        print(f"Using existing daily count: {current_daily_count}. Daily reset date: {daily_reset_date}")
    
    return current_daily_count

async def check_and_reset_daily_count(user_id: str, timezone_str: str = "UTC"):
    """
    Check and reset daily count if needed. This function fetches user data and calls reset logic.
    Can be called from login, generate analogy, or regenerate analogy endpoints.
    """
    try:
        # Fetch user data
        user_response = supabase_client.table("user_information").select(
            "daily_analogies_generated", "daily_reset_date", "plan"
        ).eq("id", user_id).single().execute()
        
        if not user_response.data:
            print(f"User {user_id} not found for daily reset check")
            return None
        
        user_data = user_response.data
        
        # Call the reset logic
        current_daily_count = await reset_daily_count_if_needed(user_id, user_data, timezone_str)
        
        return {
            "current_daily_count": current_daily_count,
            "plan": user_data.get("plan"),
            "daily_reset_date": user_data.get("daily_reset_date")
        }
        
    except Exception as e:
        print(f"Error in check_and_reset_daily_count for user {user_id}: {e}")
        return None

def convert_user_date_to_utc_range(user_date: date, timezone_str: str):
    """
    Convert a user's local date to UTC date range for database queries.
    Returns (utc_start_date, utc_end_date) as date objects.
    """
    user_tz = get_user_timezone(timezone_str)
    
    # Create datetime objects in user's timezone
    user_start = datetime.combine(user_date, datetime.min.time())
    user_end = datetime.combine(user_date, datetime.max.time())
    
    # Convert to UTC
    utc_start = user_tz.localize(user_start).astimezone(pytz.UTC)
    utc_end = user_tz.localize(user_end).astimezone(pytz.UTC)
    
    return utc_start.date(), utc_end.date()

def convert_user_month_to_utc_range(first_day: date, last_day: date, timezone_str: str):
    """
    Convert a user's month range to UTC date range for database queries.
    Returns (utc_start_date, utc_end_date) as date objects.
    """
    user_tz = get_user_timezone(timezone_str)
    
    # Create datetime objects in user's timezone for first and last day
    user_start = datetime.combine(first_day, datetime.min.time())
    user_end = datetime.combine(last_day, datetime.max.time())
    
    # Convert to UTC
    utc_start = user_tz.localize(user_start).astimezone(pytz.UTC)
    utc_end = user_tz.localize(user_end).astimezone(pytz.UTC)
    
    return utc_start.date(), utc_end.date()

# Initialize Supabase client
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PRIVATE_KEY")
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Negative Prompt for Replicate SDXL Generations
NEGATIVE_PROMPT = "text, captions, speech bubbles, watermark, low detail, blurry, duplicate face, extra limbs, extra fingers"

# Initialize FastAPI app
app = FastAPI(title="Analogous API", version="1.0.0")

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Mount static files for serving fallback images
app.mount("/static", StaticFiles(directory="static"), name="static")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "https://localhost:3000", 
        "https://analogous.app", 
        "https://www.analogous.app",
        "https://analogous.vercel.app"  # Vercel preview URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Health check endpoints
@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "Analogous API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# In-memory storage for analogies (replace with database in production)
# analogies_db = {}  # Removed - now using Supabase table

# Set up the Gemini model
model = genai.GenerativeModel('gemini-2.5-flash')

active_requests = {}

# List of available comic book background images
COMIC_BACKGROUNDS = [
    "/static/backgrounds/BlueComicBackground.png",
    "/static/backgrounds/GreenComicBackground.png", 
    "/static/backgrounds/RedComicBackground.png",
    "/static/backgrounds/YellowComicBackground.png"
]

def get_random_comic_background():
    """
    Randomly select one of the available comic book background images.
    
    Returns:
        str: Path to the randomly selected background image
    """
    return random.choice(COMIC_BACKGROUNDS)

async def generate_analogy_with_httpx(prompt: str, topic: str, audience: str, timeout: float = 30.0, request_id: str = None):
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    brave_api_key = os.getenv("BRAVE_API_KEY")

    if not gemini_api_key or not brave_api_key:
        raise Exception("Missing GEMINI_API_KEY or BRAVE_API_KEY in environment variables")

    gemini_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

    headers = {"Content-Type": "application/json"}

    data = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 1.0,
            "topK": 20,
            "topP": 0.95,
            "maxOutputTokens": 16000,
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "chapter1section1": {"type": "string"},
                    "chapter1quote": {"type": "string"},
                    "chapter1section2": {"type": "string"},
                    "chapter2section1": {"type": "string"},
                    "chapter2quote": {"type": "string"},
                    "chapter2section2": {"type": "string"},
                    "chapter3section1": {"type": "string"},
                    "chapter3quote": {"type": "string"},
                    "chapter3section2": {"type": "string"},
                    "summary": {"type": "string"},
                    "searchQuery": {"type": "string"},
                    "imagePrompt1": {"type": "string"},
                    "imagePrompt2": {"type": "string"},
                    "imagePrompt3": {"type": "string"}
                },
                "required": [
                    "title", "chapter1section1", "chapter1quote", "chapter1section2",
                    "chapter2section1", "chapter2quote", "chapter2section2",
                    "chapter3section1", "chapter3quote", "chapter3section2",
                    "summary", "searchQuery", "imagePrompt1", "imagePrompt2", "imagePrompt3"
                ]
            }
        }
    }

    if request_id:
        active_requests[request_id] = {"status": "running", "start_time": time.time()}

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            gemini_response = await client.post(
                gemini_url,
                headers=headers,
                json=data,
                params={"key": gemini_api_key}
            )

            if gemini_response.status_code != 200:
                raise Exception(f"Gemini API error: {gemini_response.status_code} - {gemini_response.text}")

            gemini_result = gemini_response.json()
            parts = gemini_result.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            if not parts:
                raise Exception("Gemini response is missing 'parts' content")

            analogy_json_raw = parts[0].get("text", "")
            try:
                analogy_json = json.loads(analogy_json_raw)
            except json.JSONDecodeError as e:
                raise Exception(f"Failed to parse JSON from Gemini: {e}\nRaw text: {analogy_json_raw}")

            search_query = analogy_json.get("searchQuery", topic)

            brave_response = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers={
                    "Accept": "application/json",
                    "X-Subscription-Token": brave_api_key
                },
                params={"q": search_query, "count": 20}
            )

            video_links = []
            text_links = []

            if brave_response.status_code == 200:
                brave_json = brave_response.json()

                for v in brave_json.get("videos", {}).get("results", []):
                    if len(video_links) >= 4:
                        break
                    video_meta = v.get("video", {})
                    meta_url = v.get("meta_url", {})
                    video_links.append({
                        "url": v.get("url"),
                        "title": v.get("title"),
                        "description": v.get("description", ""),
                        "thumbnail": v.get("thumbnail", {}).get("src") or v.get("thumbnail", {}).get("original"),
                        "published": v.get("age"),
                        "source": meta_url.get("hostname") or "youtube.com",
                        "publisher": video_meta.get("publisher") or "unknown",
                        "creator": video_meta.get("creator")
                    })

                for r in brave_json.get("web", {}).get("results", []):
                    if len(text_links) >= 4:
                        break
                    url = r.get("url", "")
                    subtype = r.get("subtype", "")
                    if (
                        subtype == "video" or
                        subtype == "image" or
                        "youtube.com" in url or
                        r.get("type") != "search_result"
                    ):
                        continue
                    profile = r.get("profile", {})
                    meta_url = r.get("meta_url", {})
                    text_links.append({
                        "url": url,
                        "title": r.get("title"),
                        "description": r.get("description", ""),
                        "thumbnail": r.get("thumbnail", {}).get("src") or r.get("thumbnail", {}).get("original"),
                        "published": r.get("age"),
                        "source": profile.get("long_name") or meta_url.get("hostname") or "unknown",
                        "publisher": profile.get("name") or "unknown",
                        "creator": None
                    })

            analogy_json["videoLinks"] = video_links
            analogy_json["textLinks"] = text_links

            return analogy_json

    finally:
        if request_id and request_id in active_requests:
            del active_requests[request_id]

def validate_and_update_user_streak(user_id: str, timezone_str: str = "UTC"):
    """
    Validate the user's current streak and update it if broken.
    This function should be called whenever streak information is queried.
    
    Args:
        user_id (str): The user's ID
        timezone_str (str): Timezone string for date calculations
        
    Returns:
        dict: Updated streak information, or None if user not found
    """
    try:
        print(f"Validating streak for user: {user_id}, timezone: {timezone_str}")
        
        # Get current date in user's timezone
        current_date = get_user_current_date(timezone_str)
        
        # Fetch current user streak info including streak_reset_acknowledged
        user_response = supabase_client.table("user_information").select(
            "current_streak_count, longest_streak_count, last_streak_date, last_analogy_time, streak_reset_acknowledged"
        ).eq("id", user_id).single().execute()
        
        if not user_response.data:
            print(f"No user found for ID: {user_id}")
            return None
            
        user_data = user_response.data
        
        # Get current streak values, defaulting to 0 if null
        current_streak = user_data.get("current_streak_count", 0) or 0
        longest_streak = user_data.get("longest_streak_count", 0) or 0
        last_streak_date = user_data.get("last_streak_date")
        streak_reset_acknowledged = user_data.get("streak_reset_acknowledged", True)  # Default to True
        
        print(f"Current streak: {current_streak}, Longest streak: {longest_streak}, Last streak date: {last_streak_date}, Reset acknowledged: {streak_reset_acknowledged}")
        print(f"Current date in user timezone ({timezone_str}): {current_date}")
        
        # Convert last_streak_date to date object if it's a string
        if isinstance(last_streak_date, str):
            try:
                # Parse date string (stored in user's timezone)
                last_streak_date = datetime.strptime(last_streak_date, "%Y-%m-%d").date()
                print(f"Parsed last_streak_date: {last_streak_date}")
            except ValueError:
                last_streak_date = None
                print(f"Failed to parse last_streak_date: {last_streak_date}")
        
        # Check if streak is broken (more than 1 day since last analogy)
        # A streak is only broken if it's been more than 1 day since the last analogy
        # This means: if last analogy was yesterday, streak continues; if last analogy was 2+ days ago, streak breaks
        streak_broken = False
        days_since_last_analogy = 0
        
        if last_streak_date:
            days_since_last_analogy = (current_date - last_streak_date).days
            # Streak is broken if it's been more than 1 day (i.e., 2 or more days)
            # This means: 0 days = same day (OK), 1 day = yesterday (OK), 2+ days = broken
            streak_broken = days_since_last_analogy > 1
            print(f"Days since last analogy: {days_since_last_analogy}, Streak broken: {streak_broken}")
        else:
            # No last streak date means no streak
            streak_broken = True
            days_since_last_analogy = None
            print(f"No last streak date, streak broken: {streak_broken}")
        
        # If streak is broken and current streak > 0, reset it to 0
        if streak_broken and current_streak > 0:
            print(f"Streak broken for user {user_id}. Days since last analogy: {days_since_last_analogy}. Resetting streak from {current_streak} to 0.")
            
            # Update user information in Supabase - reset streak and set streak_reset_acknowledged to False
            update_response = supabase_client.table("user_information").update({
                "current_streak_count": 0,
                "streak_reset_acknowledged": False,  # User needs to acknowledge this reset
                # Don't update longest_streak_count as it should remain the record
            }).eq("id", user_id).execute()
            
            if not update_response.data:
                print(f"Failed to reset streak for user: {user_id}")
                return None
            
            # Update local values for return
            current_streak = 0
            streak_reset_acknowledged = False  # User hasn't acknowledged this reset yet
            print(f"Successfully reset streak for user {user_id} to 0")
        else:
            print(f"Streak validation complete for user {user_id}. Current streak: {current_streak}, Days since last analogy: {days_since_last_analogy}")
        
        # Determine if streak is currently active
        is_streak_active = False
        if last_streak_date:
            is_streak_active = days_since_last_analogy <= 1
        
        # Only return streak_was_reset: true if the streak was just reset AND user hasn't acknowledged it
        streak_was_reset = streak_broken and current_streak == 0 and not streak_reset_acknowledged
        
        return {
            "current_streak_count": current_streak,
            "longest_streak_count": longest_streak,
            "last_streak_date": user_data.get("last_streak_date"),
            "last_analogy_time": user_data.get("last_analogy_time"),
            "is_streak_active": is_streak_active,
            "days_since_last_analogy": days_since_last_analogy,
            "streak_was_reset": streak_was_reset
        }
        
    except Exception as e:
        print(f"Error validating user streak: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        return None

def update_user_streak(user_id: str, timezone_str: str = "UTC"):
    """
    Update the user's daily streak when they generate an analogy.
    
    Args:
        user_id (str): The user's ID
        timezone_str (str): Timezone string for date calculations
        
    Returns:
        dict: Updated streak information
    """
    try:
        print(f"Updating streak for user: {user_id}, timezone: {timezone_str}")
        
        # Get current date in user's timezone for calculations
        user_current_date = get_user_current_date(timezone_str)
        # Get current timestamp in UTC for database storage
        current_timestamp = datetime.now(timezone.utc)
        
        print(f"Current date in user timezone ({timezone_str}): {user_current_date}")
        print(f"Current UTC timestamp: {current_timestamp}")
        
        # FIRST: Check if a streak log already exists for today
        existing_log_response = supabase_client.table("streak_logs").select("id").eq("user_id", user_id).eq("date", user_current_date.isoformat()).execute()
        
        if existing_log_response.data:
            print(f"Streak log already exists for today ({user_current_date}), skipping streak update")
            # Return current streak info without updating
            user_response = supabase_client.table("user_information").select(
                "current_streak_count, longest_streak_count, last_streak_date, last_analogy_time"
            ).eq("id", user_id).single().execute()
            
            if user_response.data:
                return {
                    "current_streak_count": user_response.data.get("current_streak_count", 0) or 0,
                    "longest_streak_count": user_response.data.get("longest_streak_count", 0) or 0,
                    "last_streak_date": user_response.data.get("last_streak_date"),
                    "last_analogy_time": user_response.data.get("last_analogy_time")
                }
            else:
                return None
        
        # Fetch current user streak info
        user_response = supabase_client.table("user_information").select(
            "current_streak_count, longest_streak_count, last_streak_date"
        ).eq("id", user_id).single().execute()
        
        if not user_response.data:
            print(f"No user found for ID: {user_id}")
            return None
            
        user_data = user_response.data
        
        # Get current streak values, defaulting to 0 if null
        current_streak = user_data.get("current_streak_count", 0) or 0
        longest_streak = user_data.get("longest_streak_count", 0) or 0
        last_streak_date = user_data.get("last_streak_date")
        
        print(f"Current streak: {current_streak}, Longest streak: {longest_streak}, Last streak date: {last_streak_date}")
        
        # Convert last_streak_date to date object if it's a string
        if isinstance(last_streak_date, str):
            try:
                # Parse date string (stored in user's timezone)
                last_streak_date = datetime.strptime(last_streak_date, "%Y-%m-%d").date()
            except ValueError:
                last_streak_date = None
        
        # Determine new streak count based on user's timezone
        new_streak_count = 1  # Default to 1 for new streak
        
        if last_streak_date:
            if last_streak_date == user_current_date:
                # User already generated an analogy today, keep current streak
                new_streak_count = current_streak
                print(f"User already generated analogy today, keeping streak at: {new_streak_count}")
            elif last_streak_date == user_current_date - timedelta(days=1):
                # User generated analogy yesterday, increment streak
                new_streak_count = current_streak + 1
                print(f"User generated analogy yesterday, incrementing streak to: {new_streak_count}")
            else:
                # User missed a day or more, reset to 1
                new_streak_count = 1
                print(f"User missed a day or more, resetting streak to: {new_streak_count}")
        else:
            # First time generating an analogy
            new_streak_count = 1
            print(f"First time generating analogy, setting streak to: {new_streak_count}")
        
        # Update longest streak if current streak is longer
        new_longest_streak = max(longest_streak, new_streak_count)
        
        # Store the current date in user's timezone for user_information table
        # This ensures consistency with streak validation logic
        user_current_date_for_db = user_current_date.isoformat()
        
        # Update user information in Supabase
        update_response = supabase_client.table("user_information").update({
            "current_streak_count": new_streak_count,
            "longest_streak_count": new_longest_streak,
            "last_streak_date": user_current_date_for_db,
            "last_analogy_time": current_timestamp.isoformat()
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            print(f"Failed to update streak for user: {user_id}")
            return None
            
        print(f"Successfully updated streak for user {user_id}: current={new_streak_count}, longest={new_longest_streak}")
        
        # Insert a streak log entry for today
        print(f"About to insert streak log for date: {user_current_date}")
        insert_streak_log(user_id, user_current_date)

        return {
            "current_streak_count": new_streak_count,
            "longest_streak_count": new_longest_streak,
            "last_streak_date": user_current_date_for_db,
            "last_analogy_time": current_timestamp.isoformat()
        }
        
    except Exception as e:
        print(f"Error updating user streak: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        return None

def insert_streak_log(user_id: str, log_date: date):
    """
    Insert a streak log entry for a specific user and date.
    This function respects the unique_user_day constraint.
    
    Args:
        user_id (str): The user's ID
        log_date (date): The date to log
        
    Returns:
        bool: True if successfully inserted, False if already exists
    """
    try:
        print(f"Inserting streak log for user: {user_id}, date: {log_date}")
        print(f"Date type: {type(log_date)}, Date value: {log_date}")
        
        # Prepare the data to insert
        log_data = {
            "user_id": user_id,
            "date": log_date.isoformat(),
        }
        
        # Insert streak log entry
        insert_response = supabase_client.table("streak_logs").insert(log_data).execute()
        
        if insert_response.data:
            print(f"Successfully inserted streak log for user {user_id}, date {log_date}")
            return True
        else:
            print(f"Failed to insert streak log for user {user_id}, date {log_date}")
            return False
            
    except Exception as e:
        # Check if this is a unique constraint violation (already exists)
        if "unique_user_day" in str(e).lower() or "duplicate key" in str(e).lower():
            print(f"Streak log already exists for user {user_id}, date {log_date}")
            return False
        else:
            print(f"Error inserting streak log: {e}")
            return False

# Pydantic models for request/response
class GenerateAnalogyRequest(BaseModel):
    topic: str
    audience: str
    timezone_str: str = "UTC"  # User's timezone for streak calculations

class GenerateAnalogyResponse(BaseModel):
    status: str
    analogy: dict
    id: str
    analogy_images: list[str]
    topic: str
    audience: str
    created_at: str
    streak_popup_shown: bool
    background_image: str
    is_public: bool

class GetAnalogyResponse(BaseModel):
    status: str
    id: str
    analogy: dict
    analogy_images: list[str]
    topic: str
    audience: str
    created_at: str
    streak_popup_shown: bool
    background_image: str
    is_public: bool
    user_id: str

class SignUpRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    username: str
    opt_in_email_marketing: bool
    captchaToken: str | None = None

class RegenerateAnalogyRequest(BaseModel):
    timezone_str: str = "UTC"  # User's timezone for streak calculations

class UpdateAnalogyPublicRequest(BaseModel):
    is_public: bool

class UpdateUserProfileRequest(BaseModel):
    username: str
    first_name: str
    last_name: str
    opt_in_email_marketing: bool

class UpdatePasswordRequest(BaseModel):
    new_password: str

class DeleteAccountRequest(BaseModel):
    confirmation: str

class UserStatsResponse(BaseModel):
    currentPlan: str
    renewalDate: str
    analogiesGeneratedToday: int
    analogiesStoredTotal: int
    upcomingPlan: str  # Always has a value now (curious or scholar)
    planCancelled: bool
    subscriptionStartDate: str | None
    stripe_subscription_id: str | None

    dailyLimit: int
    rateLimitSeconds: int

class UpgradePlanRequest(BaseModel):
    pass

class CreateCheckoutSessionRequest(BaseModel):
    success_url: str
    cancel_url: str
    pass  # No additional data needed for now
        
@app.get("/")
async def home():
    return {"status": "ok", "message": "Analogous API is running"}

@app.post("/signup")
@limiter.limit("10/minute")
async def sign_up_user(request: Request, payload: SignUpRequest):
    # Validate username format
    from utils.helpers import validate_username_format, check_username_uniqueness
    import asyncio
    
    username_validation = validate_username_format(payload.username)
    if not username_validation["valid"]:
        raise HTTPException(status_code=400, detail=username_validation["error"])
    
    # Check username uniqueness
    uniqueness_result = await check_username_uniqueness(payload.username)
    if not uniqueness_result["available"]:
        raise HTTPException(status_code=400, detail=uniqueness_result["error"])
    
    # Prepare signup options with captcha token if provided
    signup_options = {
        "email": payload.email,
        "password": payload.password,
    }
    
    if payload.captchaToken:
        signup_options["options"] = {
            "captchaToken": payload.captchaToken
        }
        print(f"Captcha token provided for signup: {payload.captchaToken[:20]}...")
    else:
        print("No captcha token provided for signup")
    
    response = supabase_client.auth.sign_up(signup_options)

    if response.user is None:
        raise HTTPException(status_code=400, detail="Failed to create user account")

    user_id = response.user.id

    stripped_email = payload.email.strip()
    capitalized_first_name = payload.first_name.strip().capitalize()
    capitalized_last_name = payload.last_name.strip().capitalize()
    lowercase_username = payload.username.strip().lower()

    try:
        insert_response = supabase_client.table("user_information").insert({
            "id": user_id,
            "first_name": capitalized_first_name,
            "last_name": capitalized_last_name,
            "email": stripped_email,
            "onboarding_complete": False,
            "plan": "curious",
            "opt_in_email_marketing": payload.opt_in_email_marketing,
            "current_streak_count": 0,
            "longest_streak_count": 0,
            "last_streak_date": None,
            "last_analogy_time": None,
            "lifetime_analogies_generated": 0,
            "streak_reset_acknowledged": True,  # New users don't need to see reset notification
            "username": lowercase_username,
            "subscription_start_date": None,
            "renewal_date": None,
            "upcoming_plan": "curious",  # New users start with curious plan as their upcoming plan
            "plan_cancelled": False,
            "daily_reset_date": None,
            "daily_analogies_generated": 0,
            "stripe_subscription_id": None,
        }).execute()

        if not insert_response.data:
            raise HTTPException(status_code=500, detail="Insert into user_information failed or returned no data")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase insert error: {str(e)}")

    return {"message": "User created successfully"}

@app.post("/generate-analogy", response_model=GenerateAnalogyResponse)
async def generate_analogy(request: GenerateAnalogyRequest, user_id: str = Depends(get_current_user)):
    try:
        topic = request.topic
        audience = request.audience
        timezone_str = request.timezone_str

        if not topic or not audience:
            raise HTTPException(status_code=400, detail="Both topic and audience are required")

        # STEP 1: VALIDATE LIMITS BEFORE ANY GENERATION BEGINS
        print(f"STEP 1: Validating limits for user {user_id}")
        
        # Get user's current plan and limits
        user_response = supabase_client.table("user_information").select(
            "plan, daily_analogies_generated, last_analogy_time, daily_reset_date, renewal_date, plan_cancelled"
        ).eq("id", user_id).single().execute()
        
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_response.data
        current_plan = user_data.get("plan", "curious")
        
        # DEPRECATED: Manual renewal date checking removed - now handled by Stripe webhooks
        # When a subscription actually ends, Stripe sends customer.subscription.updated
        # with status 'canceled' or 'unpaid', which triggers the downgrade automatically
        
        # Define limits based on plan
        if current_plan == "curious":
            daily_limit = 20
            rate_limit_seconds = 60  # 1 analogy per minute
        elif current_plan == "scholar":
            daily_limit = 100
            rate_limit_seconds = 12  # 5 analogies per minute (12 seconds between each)
        else:
            # Default to curious plan limits
            daily_limit = 20
            rate_limit_seconds = 60
        
        # Check and reset daily count if needed
        reset_result = await check_and_reset_daily_count(user_id, timezone_str)
        if reset_result:
            current_daily_count = reset_result["current_daily_count"]
        else:
            current_daily_count = user_data.get("daily_analogies_generated", 0) or 0
        
        # Check daily limit FIRST
        print(f"DEBUG: Checking daily limit - Current count: {current_daily_count}, Daily limit: {daily_limit}, Plan: {current_plan}")
        if current_daily_count >= daily_limit:
            print(f"DEBUG: DAILY LIMIT EXCEEDED! Current: {current_daily_count}, Limit: {daily_limit}")
            if current_plan == "curious":
                error_message = f"You have reached your daily limit of {daily_limit} analogies. Please upgrade to the Scholar plan for more analogies per day. Visit your pricing page to view your usage statistics and upgrade options."
            else:
                error_message = f"You have reached your daily limit of {daily_limit} analogies for today. Your limit will reset tomorrow. Visit your pricing page to view your usage statistics."
            
            print(f"DEBUG: Raising HTTPException with message: {error_message}")
            raise HTTPException(
                status_code=429, 
                detail=error_message
            )
        else:
            print(f"DEBUG: Daily limit check passed - Current: {current_daily_count}, Limit: {daily_limit}")
        
        # Check rate limiting SECOND
        last_analogy_time = user_data.get("last_analogy_time")
        if last_analogy_time:
            try:
                if isinstance(last_analogy_time, str):
                    last_analogy_time = datetime.fromisoformat(last_analogy_time.replace('Z', '+00:00'))
                elif isinstance(last_analogy_time, datetime):
                    last_analogy_time = last_analogy_time
                
                time_since_last = (datetime.utcnow() - last_analogy_time).total_seconds()
                if time_since_last < rate_limit_seconds:
                    remaining_seconds = int(rate_limit_seconds - time_since_last)
                    raise HTTPException(
                        status_code=429,
                        detail=f"Rate limit exceeded. Please wait {remaining_seconds} seconds before generating another analogy."
                    )
            except (ValueError, TypeError) as e:
                print(f"Error parsing last_analogy_time: {e}")
                # Continue if we can't parse the time
        
        print(f"STEP 1 COMPLETE: All limits validated successfully for user {user_id}")
        
        # STEP 1.5: CHECK STORAGE LIMITS
        print(f"STEP 1.5: Checking storage limits for user {user_id}")
        
        # Get user's current stored analogy count
        stored_analogies_response = supabase_client.table("analogies").select("id", count="exact").eq("user_id", user_id).execute()
        stored_count = stored_analogies_response.count or 0
        
        print(f"DEBUG: Storage check - Current stored: {stored_count}, Plan: {current_plan}")
        
        # Define storage limits based on plan
        if current_plan == "curious":
            storage_limit = 100
        elif current_plan == "scholar":
            storage_limit = 500
        else:
            storage_limit = 100  # Default to curious plan limit
        
        # Check if user has exceeded storage limit
        if stored_count >= storage_limit:
            print(f"DEBUG: STORAGE LIMIT EXCEEDED! Current: {stored_count}, Limit: {storage_limit}")
            if current_plan == "curious":
                error_message = f"You've reached your storage limit of {storage_limit} analogies. Delete old analogies or upgrade to the Scholar plan to continue generating."
            else:
                error_message = f"You've reached your storage limit of {storage_limit} analogies. Please delete some old analogies to continue generating."
            
            print(f"DEBUG: Raising HTTPException with storage message: {error_message}")
            raise HTTPException(
                status_code=429,
                detail=error_message
            )
        else:
            print(f"DEBUG: Storage limit check passed - Current: {stored_count}, Limit: {storage_limit}")
        
        print(f"STEP 1.5 COMPLETE: Storage limits validated successfully for user {user_id}")
        
        # STEP 2: ONLY AFTER ALL LIMITS ARE VALIDATED, PROCEED WITH GENERATION
        print(f"STEP 2: Starting analogy generation for user {user_id}")
        
        user_first_name = supabase_client.table("user_information").select("first_name").eq("id", user_id).single().execute().data.get("first_name")

        user_info = ""
        if user_id:
            try:
                print(f"Fetching user info for user_id: {user_id}\n")
                start_time = time.time()
                user_response = supabase_client.table("personality_answers").select("*").eq("user_id", user_id).limit(1).execute()
                end_time = time.time()
                print(f"Supabase request took: {end_time - start_time} seconds")

                if user_response.data:
                    data = user_response.data[0]  # Access the first result
                    print(f"User response: {data}")
                    context_parts = []

                    # Individual fields
                    if data.get("context"):
                        context_parts.append(f"They are in the {data['context']} category.")
                    if data.get("occupation"):
                        context_parts.append(f"They work as a {data['occupation']}.")

                    # List fields (joined cleanly)
                    if isinstance(data.get("analogy_styles"), list) and data["analogy_styles"]:
                        context_parts.append(f"They prefer analogies that are {', '.join(data['analogy_styles'])}.")
                    if isinstance(data.get("interests"), list) and data["interests"]:
                        context_parts.append(f"They are interested in {', '.join(data['interests'])}.")
                    if isinstance(data.get("hobbies"), list) and data["hobbies"]:
                        context_parts.append(f"They enjoy {', '.join(data['hobbies'])}.")
                    if isinstance(data.get("likes"), list) and data["likes"]:
                        context_parts.append(f"They like {', '.join(data['likes'])}.")
                    if isinstance(data.get("dislikes"), list) and data["dislikes"]:
                        context_parts.append(f"They dislike {', '.join(data['dislikes'])}.")

                    user_info = " ".join(context_parts)

            except Exception as e:
                print(f"Error fetching user info: {e}")

            print(f"Fetched User info for user_id: {user_id} is: {user_info}\n")

        prompt = ANALOGY_PROMPT.format(topic=topic, audience=audience, user_first_name=user_first_name, user_info=user_info, COMIC_STYLE_PREFIX=COMIC_STYLE_PREFIX)
        print(f"Prompt: {prompt}")
        
        # Generate a unique request ID for tracking
        request_id = str(uuid.uuid4())
        
        # Generate analogy with timeout and cancellation support
        try:
            start_time = time.time()
            
            # Use httpx for cancellable Gemini API calls
            response_text = await generate_analogy_with_httpx(prompt, topic, audience, timeout=30.0, request_id=request_id)
            
            print(f"Response: {response_text}")
            end_time = time.time()
            print(f"Time taken to generate response: {end_time - start_time} seconds")
            analogy_json = response_text
        except asyncio.TimeoutError:
            print("Gemini API call timed out after 30 seconds")
            raise HTTPException(status_code=408, detail="Analogy generation timed out. Please try again.")
        except httpx.RequestError as e:
            print(f"Network error during Gemini API call: {e}")
            raise HTTPException(status_code=503, detail="Service temporarily unavailable. Please try again.")
        except Exception as e:
            print(f"Error generating analogy content: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate analogy")

        analogy_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()

        # Select a random comic book background image
        background_image = get_random_comic_background()
        print(f"Selected background image for analogy {analogy_id}: {background_image}")

        image_prompts = [
            analogy_json["imagePrompt1"],
            analogy_json["imagePrompt2"],
            analogy_json["imagePrompt3"]
        ]

        # Generate images with timeout and cancellation support
        try:
            # Generate images and upload to Supabase Storage
            image_urls = []
            for i, prompt in enumerate(image_prompts):
                image_url = await generate_image_replicate(prompt, i, NEGATIVE_PROMPT, timeout=20.0)
                image_urls.append(image_url)
            
        except Exception as e:
            print(f"Error generating images: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate images")

        # Check if this analogy will update the streak before saving
        will_update_streak = False
        user_already_generated_today = False
        try:
            # Check if user has already generated an analogy today
            user_current_date = get_user_current_date(timezone_str)
            existing_log_response = supabase_client.table("streak_logs").select("id").eq("user_id", user_id).eq("date", user_current_date.isoformat()).execute()
            
            if existing_log_response.data:
                user_already_generated_today = True
                print(f"User already has a streak log for today ({user_current_date}), new analogy will not update streak")
            
            # Get current user streak info to check if this analogy will update the streak
            user_response = supabase_client.table("user_information").select(
                "current_streak_count, longest_streak_count, last_streak_date, streak_reset_acknowledged"
            ).eq("id", user_id).single().execute()
            
            if user_response.data:
                user_data = user_response.data
                current_streak = user_data.get("current_streak_count", 0) or 0
                longest_streak = user_data.get("longest_streak_count", 0) or 0
                last_streak_date = user_data.get("last_streak_date")
                streak_reset_acknowledged = user_data.get("streak_reset_acknowledged", True)
                
                # Convert last_streak_date to date object if it's a string
                if isinstance(last_streak_date, str):
                    try:
                        # Parse date string (stored in user's timezone)
                        last_streak_date = datetime.strptime(last_streak_date, "%Y-%m-%d").date()
                    except ValueError:
                        last_streak_date = None
                
                # Check if streak is broken (more than 1 day since last analogy)
                streak_broken = False
                days_since_last_analogy = 0
                
                if last_streak_date:
                    days_since_last_analogy = (user_current_date - last_streak_date).days
                    streak_broken = days_since_last_analogy > 1
                else:
                    # No last streak date means no streak
                    streak_broken = True
                    days_since_last_analogy = None
                
                # If streak is broken and current streak > 0, reset it to 0
                if streak_broken and current_streak > 0:
                    print(f"Streak broken for user {user_id}. Days since last analogy: {days_since_last_analogy}. Resetting streak from {current_streak} to 0.")
                    
                    # Update user information in Supabase - reset streak and set streak_reset_acknowledged to False
                    update_response = supabase_client.table("user_information").update({
                        "current_streak_count": 0,
                        "streak_reset_acknowledged": False,  # User needs to acknowledge this reset
                        # Don't update longest_streak_count as it should remain the record
                    }).eq("id", user_id).execute()
                    
                    if not update_response.data:
                        print(f"Failed to reset streak for user: {user_id}")
                    else:
                        print(f"Successfully reset streak for user {user_id} to 0")
                        # Update local values for return
                        current_streak = 0
                        streak_reset_acknowledged = False
                
                # Determine if this analogy will update the streak (only if user hasn't already generated today)
                if not user_already_generated_today:
                    if last_streak_date:
                        if last_streak_date == user_current_date:
                            # User already generated an analogy today, won't update streak
                            will_update_streak = False
                        elif last_streak_date == user_current_date - timedelta(days=1):
                            # User generated analogy yesterday, will increment streak
                            will_update_streak = True
                        else:
                            # User missed a day or more, will reset to 1
                            will_update_streak = True
                    else:
                        # First time generating an analogy, will set streak to 1
                        will_update_streak = True
                else:
                    # User already generated today, won't update streak
                    will_update_streak = False
        except Exception as e:
            print(f"Error checking streak update: {e}")
            # Default to False if we can't determine
            will_update_streak = False
            user_already_generated_today = False

        # Save analogy to Supabase FIRST (before inserting image records)
        try:
            print("reached here and now trying to save analogy to supabase")
            start_time = time.time()
            insert_response = supabase_client.table("analogies").insert({
                "id": analogy_id,
                "user_id": user_id,
                "topic": topic,
                "audience": audience,
                "analogy_json": analogy_json,  # Fixed field name to match schema
                "created_at": created_at,
                "streak_popup_shown": True,  # Default to True (don't show popup) - will be updated if streak log is created
                "background_image": background_image,  # Save the selected background image
                "is_public": False,  # Default to private
            }).execute()
            end_time = time.time()
            print(f"Time taken to save analogy to supabase: {end_time - start_time} seconds")
            if not insert_response.data:
                raise HTTPException(status_code=500, detail="Insert into analogies failed or returned no data")

        except Exception as e:
            print(f"Supabase analogies insert error: {e}")
            raise HTTPException(status_code=500, detail=f"Supabase analogies insert error: {str(e)}")

        # NOW insert image records into analogy_images table (after analogy exists)
        try:
            print("Inserting image records into analogy_images table")
            for i, image_url in enumerate(image_urls):
                if not image_url.startswith("/static/assets/"):  # Only insert if not a fallback image
                    await insert_analogy_image(
                        analogy_id=analogy_id,
                        user_id=user_id,
                        image_url=image_url,
                        image_index=i,
                        prompt=image_prompts[i],
                        negative_prompt=NEGATIVE_PROMPT
                    )
        except Exception as e:
            print(f"Error inserting image records: {e}")
            # Don't fail the analogy generation if image record insertion fails
            # The analogy was already saved successfully and images were uploaded to storage

        # Fetch the final image URLs from the database (with fallback to static assets)
        try:
            print("Fetching final image URLs from analogy_images table")
            # Only fetch image_url and image_index to reduce data transfer
            images_result = supabase_client.table("analogy_images").select("image_url,image_index").eq("analogy_id", analogy_id).order("image_index", desc=False).execute()
            
            print(f"Database query result: {images_result.data}")
            
            final_image_urls = []
            if images_result.data and len(images_result.data) >= 3:
                # Sort by image_index to ensure correct order
                sorted_images = sorted(images_result.data, key=lambda x: x["image_index"])
                final_image_urls = []
                for img in sorted_images:
                    image_url = img["image_url"]
                    # Fix malformed Supabase Storage URLs
                    fixed_url = fix_supabase_storage_url(image_url)
                    final_image_urls.append(fixed_url)
                print(f"Successfully fetched {len(final_image_urls)} images from database: {final_image_urls}")
            else:
                # Fallback to static assets if no images found in database
                print("No images found in database, using fallback static assets")
                final_image_urls = get_fallback_images_for_analogy()
        except Exception as e:
            print(f"Error fetching images from database: {e}, using fallback static assets")
            final_image_urls = get_fallback_images_for_analogy()

        # Update user streak after successfully saving the analogy
        streak_log_created = False
        try:
            print("Checking if user streak should be updated after successful analogy generation")
            
            if user_already_generated_today:
                print(f"User already has a streak log for today ({user_current_date}), skipping streak update for new analogy")
            else:
                print("No existing streak log for today, updating user streak after successful analogy generation")
                streak_update = update_user_streak(user_id, timezone_str)
                if streak_update:
                    print(f"Streak updated successfully: {streak_update}")
                    streak_log_created = True
                else:
                    print("Failed to update streak, but analogy was saved successfully")
        except Exception as e:
            print(f"Error updating streak: {e}")
            # Don't fail the analogy generation if streak update fails
            # The analogy was already saved successfully

        # Increment lifetime analogies generated count
        try:
            print("Incrementing lifetime analogies generated count")
            # First get the current count
            user_count_response = supabase_client.table("user_information").select(
                "lifetime_analogies_generated"
            ).eq("id", user_id).single().execute()
            
            if user_count_response.data:
                current_count = user_count_response.data.get("lifetime_analogies_generated", 0) or 0
                new_count = current_count + 1
                
                # Update the count
                update_count_response = supabase_client.table("user_information").update({
                    "lifetime_analogies_generated": new_count
                }).eq("id", user_id).execute()
                
                if update_count_response.data:
                    print(f"Successfully incremented lifetime analogies count to: {new_count}")
                else:
                    print("Failed to update lifetime analogies count")
            else:
                print("Failed to get current lifetime analogies count")
        except Exception as e:
            print(f"Error incrementing lifetime analogies count: {e}")
            # Don't fail the analogy generation if count update fails
            # The analogy was already saved successfully

        # Increment daily analogies generated count and update last generation time
        try:
            print("Updating daily analogy count and last generation time")
            current_time = datetime.utcnow()
            
            # Get current daily count first from database
            daily_count_response = supabase_client.table("user_information").select(
                "daily_analogies_generated"
            ).eq("id", user_id).single().execute()
            
            if daily_count_response.data:
                current_daily_count = daily_count_response.data.get("daily_analogies_generated", 0) or 0
                new_daily_count = current_daily_count + 1
                print(f"Current daily count: {current_daily_count}, New daily count: {new_daily_count}")
                
                # Update both daily count and last generation time in database FIRST
                update_daily_response = supabase_client.table("user_information").update({
                    "daily_analogies_generated": new_daily_count,
                    "last_analogy_time": current_time.isoformat()
                }).eq("id", user_id).execute()
                
                if update_daily_response.data:
                    print(f"Successfully updated daily analogy count to {new_daily_count} and last generation time")
                    print(f"Update response: {update_daily_response.data}")
                    
                    # Verify the update by fetching fresh data from database
                    verify_response = supabase_client.table("user_information").select(
                        "daily_analogies_generated, last_analogy_time"
                    ).eq("id", user_id).single().execute()
                    
                    if verify_response.data:
                        verified_count = verify_response.data.get("daily_analogies_generated", 0) or 0
                        verified_time = verify_response.data.get("last_analogy_time")
                        print(f"Verified daily count: {verified_count}, Verified last time: {verified_time}")
                    else:
                        print("Failed to verify update - could not fetch fresh data")
                else:
                    print("Failed to update daily analogy count and last generation time")
                    print(f"Update response: {update_daily_response}")
            else:
                print("Failed to get current daily analogy count")
                print(f"Daily count response: {daily_count_response}")
        except Exception as e:
            print(f"Error updating daily analogy count: {e}")
            import traceback
            traceback.print_exc()
            # Don't fail the analogy generation if this update fails
            # The analogy was already saved successfully

        # Update the analogy record with the correct streak_popup_shown value
        # Only show popup if a streak log was actually created for this analogy
        try:
            print(f"Updating analogy {analogy_id} with streak_popup_shown = {not streak_log_created}")
            update_response = supabase_client.table("analogies").update({
                "streak_popup_shown": not streak_log_created  # False = show popup, True = don't show popup
            }).eq("id", analogy_id).execute()
            
            if not update_response.data:
                print(f"Failed to update streak_popup_shown for analogy: {analogy_id}")
            else:
                print(f"Successfully updated streak_popup_shown for analogy: {analogy_id}")
        except Exception as e:
            print(f"Error updating streak_popup_shown: {e}")
            # Don't fail the analogy generation if this update fails

        return GenerateAnalogyResponse(
            status="success",
            id=analogy_id,
            analogy=analogy_json,
            analogy_images=final_image_urls,
            topic=topic,
            audience=audience,
            created_at=created_at,
            streak_popup_shown=not streak_log_created,  # Only show popup if streak log was created
            background_image=background_image,
            is_public=False  # Default to private
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print("Unexpected error during /generate-analogy:")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/analogy/{analogy_id}", response_model=GetAnalogyResponse)
async def get_analogy(analogy_id: str):
    try:
        # Supabase analogies table
        print("now fetching analogy from supabase")
        start_time = time.time()
        result = supabase_client.table("analogies").select("*").eq("id", analogy_id).single().execute()
        end_time = time.time()
        print(f"Time taken to fetch analogy from supabase: {end_time - start_time} seconds")
        if not result.data:
            raise HTTPException(status_code=404, detail="Analogy not found")

        analogy_data = result.data

        # Ensure analogy_json is a dictionary
        analogy_json = analogy_data["analogy_json"]
        if isinstance(analogy_json, str):
            try:
                analogy_json = json.loads(analogy_json)
            except json.JSONDecodeError as e:
                print(f"Error parsing analogy_json: {e}")
                raise HTTPException(status_code=500, detail="Invalid analogy data format")

        # Fetch images from analogy_images table
        print("Fetching images from analogy_images table")
        images_result = supabase_client.table("analogy_images").select("*").eq("analogy_id", analogy_id).order("image_index", desc=False).execute()
        
        image_urls = []
        if images_result.data and len(images_result.data) >= 3:
            # Sort by image_index to ensure correct order
            sorted_images = sorted(images_result.data, key=lambda x: x["image_index"])
            image_urls = []
            for img in sorted_images:
                image_url = img["image_url"]
                # Fix malformed Supabase Storage URLs
                fixed_url = fix_supabase_storage_url(image_url)
                image_urls.append(fixed_url)
                print(f"Image {img['image_index']}: Original={image_url}, Fixed={fixed_url}")
            print(f"Successfully fetched {len(image_urls)} images from database")
        else:
            # Fallback to default images if no images found or insufficient images
            print(f"No images found in database (found {len(images_result.data) if images_result.data else 0}), using fallback static assets")
            image_urls = get_fallback_images_for_analogy()

        print("reached here and now trying to send back the response")
        return GetAnalogyResponse(
            status="success",
            analogy=analogy_json,  # Now guaranteed to be a dict
            id=analogy_data["id"],
            analogy_images=image_urls,
            topic=analogy_data["topic"],
            audience=analogy_data["audience"],
            created_at=analogy_data["created_at"],
            streak_popup_shown=analogy_data.get("streak_popup_shown", True),  # Default to True (don't show popup) if field doesn't exist
            background_image=analogy_data.get("background_image", "/static/backgrounds/BlueComicBackground.png"),  # Default to blue background if not set
            is_public=analogy_data.get("is_public", False),  # Default to private if field doesn't exist
            user_id=analogy_data["user_id"]  # Include user_id for ownership verification
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_analogy: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/user/{user_id}/analogies")
async def get_user_analogies(user_id: str):
    try:
        print(f"Fetching analogies for user_id: {user_id}")
        # Get all analogies for a specific user
        result = supabase_client.table("analogies").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        print(f"Supabase result: {result}")

        if not result.data:
            print("No data returned from Supabase")
            return {
                "status": "success",
                "analogies": [],
                "count": 0
            }

        print(f"Found {len(result.data)} analogies")
        analogies = []
        for analogy_data in result.data:
            print(f"Processing analogy: {analogy_data.get('id', 'no-id')}")
            # Ensure analogy_json is a dictionary
            analogy_json = analogy_data["analogy_json"]
            if isinstance(analogy_json, str):
                try:
                    analogy_json = json.loads(analogy_json)
                    print("Successfully parsed analogy_json from string")
                except json.JSONDecodeError as e:
                    print(f"Error parsing analogy_json: {e}")
                    continue  # Skip this analogy if JSON parsing fails

            # Fetch images from analogy_images table for this analogy
            analogy_id = analogy_data["id"]
            images_result = supabase_client.table("analogy_images").select("*").eq("analogy_id", analogy_id).order("image_index", desc=False).execute()
            
            image_urls = []
            if images_result.data and len(images_result.data) >= 3:
                # Sort by image_index to ensure correct order
                sorted_images = sorted(images_result.data, key=lambda x: x["image_index"])
                image_urls = []
                for img in sorted_images:
                    image_url = img["image_url"]
                    # Fix malformed Supabase Storage URLs
                    fixed_url = fix_supabase_storage_url(image_url)
                    image_urls.append(fixed_url)
                    print(f"Analogy {analogy_id}, Image {img['image_index']}: Original={image_url}, Fixed={fixed_url}")
            else:
                # Fallback to default images if no images found or insufficient images
                print(f"No images found in database for analogy {analogy_id} (found {len(images_result.data) if images_result.data else 0}), using fallback static assets")
                image_urls = get_fallback_images_for_analogy()

            # Structure the analogy data to match frontend expectations
            analogy = {
                "id": analogy_data["id"],
                "topic": analogy_data["topic"],
                "audience": analogy_data["audience"],
                "analogy_json": analogy_json,
                "image_urls": image_urls,
                "created_at": analogy_data["created_at"],
                "background_image": analogy_data.get("background_image", "/static/backgrounds/BlueComicBackground.png")
            }
            analogies.append(analogy)
            print(f"Added analogy to response: {analogy['id']}")

        print(f"Returning {len(analogies)} analogies")
        return {
            "status": "success",
            "analogies": analogies,
            "count": len(analogies)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_user_analogies: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/user/{user_id}/analogies-paginated")
async def get_user_analogies_paginated(user_id: str, page: int = 1, page_size: int = 9):
    """
    Get paginated analogies for a user (optimized for past analogies page).
    This endpoint is much more efficient as it only fetches the needed analogies per page.
    
    Args:
        user_id (str): The user's ID
        page (int): Page number (1-based, default: 1)
        page_size (int): Number of analogies per page (default: 9)
        
    Returns:
        dict: Paginated analogies with their images and pagination info
    """
    try:
        print(f"Fetching paginated analogies for user_id: {user_id}, page: {page}, page_size: {page_size}")
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Get total count first
        count_result = supabase_client.table("analogies").select("id", count="exact").eq("user_id", user_id).execute()
        total_count = count_result.count if count_result.count is not None else 0
        
        # Get paginated analogies
        result = supabase_client.table("analogies").select("*").eq("user_id", user_id).order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
        print(f"Supabase result: {result}")

        if not result.data:
            print("No data returned from Supabase")
            return {
                "status": "success",
                "analogies": [],
                "count": 0,
                "total_count": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
                "has_next": False,
                "has_prev": False
            }

        print(f"Found {len(result.data)} analogies for page {page}")
        analogies = []
        
        # Batch fetch all images for these analogies in a single query
        analogy_ids = [analogy_data["id"] for analogy_data in result.data]
        print(f"Batch fetching images for analogy IDs: {analogy_ids}")
        
        # Fetch all images for all analogies in one query
        all_images_result = supabase_client.table("analogy_images").select("*").in_("analogy_id", analogy_ids).order("image_index", desc=False).execute()
        
        # Group images by analogy_id for efficient lookup
        images_by_analogy = {}
        if all_images_result.data:
            for img in all_images_result.data:
                analogy_id = img["analogy_id"]
                if analogy_id not in images_by_analogy:
                    images_by_analogy[analogy_id] = []
                images_by_analogy[analogy_id].append(img)
        
        for analogy_data in result.data:
            print(f"Processing analogy: {analogy_data.get('id', 'no-id')}")
            # Ensure analogy_json is a dictionary
            analogy_json = analogy_data["analogy_json"]
            if isinstance(analogy_json, str):
                try:
                    analogy_json = json.loads(analogy_json)
                    print("Successfully parsed analogy_json from string")
                except json.JSONDecodeError as e:
                    print(f"Error parsing analogy_json: {e}")
                    continue  # Skip this analogy if JSON parsing fails

            # Get images for this analogy from the pre-fetched data
            analogy_id = analogy_data["id"]
            analogy_images = images_by_analogy.get(analogy_id, [])
            
            image_urls = []
            if analogy_images and len(analogy_images) >= 3:
                # Sort by image_index to ensure correct order
                sorted_images = sorted(analogy_images, key=lambda x: x["image_index"])
                image_urls = []
                for img in sorted_images:
                    image_url = img["image_url"]
                    # Fix malformed Supabase Storage URLs
                    fixed_url = fix_supabase_storage_url(image_url)
                    image_urls.append(fixed_url)
                    print(f"Analogy {analogy_id}, Image {img['image_index']}: Original={image_url}, Fixed={fixed_url}")
            else:
                # Fallback to default images if no images found or insufficient images
                print(f"No images found in database for analogy {analogy_id} (found {len(analogy_images)}), using fallback static assets")
                image_urls = get_fallback_images_for_analogy()

            # Structure the analogy data to match frontend expectations
            analogy = {
                "id": analogy_data["id"],
                "topic": analogy_data["topic"],
                "audience": analogy_data["audience"],
                "analogy_json": analogy_json,
                "image_urls": image_urls,
                "created_at": analogy_data["created_at"],
                "background_image": analogy_data.get("background_image", "/static/backgrounds/BlueComicBackground.png")
            }
            analogies.append(analogy)
            print(f"Added analogy to response: {analogy['id']}")

        # Calculate pagination info
        total_pages = (total_count + page_size - 1) // page_size
        has_next = page < total_pages
        has_prev = page > 1

        print(f"Returning {len(analogies)} analogies for page {page} of {total_pages}")
        return {
            "status": "success",
            "analogies": analogies,
            "count": len(analogies),
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_user_analogies_paginated: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/user/{user_id}/recent-analogies")
async def get_user_recent_analogies(user_id: str, limit: int = 3):
    """
    Get only the most recent analogies for a user (optimized for dashboard).
    This endpoint is much more efficient as it only fetches the needed analogies.
    
    Args:
        user_id (str): The user's ID
        limit (int): Number of recent analogies to fetch (default: 3)
        
    Returns:
        dict: Recent analogies with their images
    """
    try:
        print(f"Fetching {limit} most recent analogies for user_id: {user_id}")
        
        # Get only the most recent analogies for the user with a more efficient query
        # This reduces the number of database calls significantly
        result = supabase_client.table("analogies").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        print(f"Supabase result: {result}")

        if not result.data:
            print("No data returned from Supabase")
            return {
                "status": "success",
                "analogies": [],
                "count": 0
            }

        print(f"Found {len(result.data)} recent analogies")
        analogies = []
        
        # Batch fetch all images for these analogies in a single query
        analogy_ids = [analogy_data["id"] for analogy_data in result.data]
        print(f"Batch fetching images for analogy IDs: {analogy_ids}")
        
        # Fetch all images for all analogies in one query
        all_images_result = supabase_client.table("analogy_images").select("*").in_("analogy_id", analogy_ids).order("image_index", desc=False).execute()
        
        # Group images by analogy_id for efficient lookup
        images_by_analogy = {}
        if all_images_result.data:
            for img in all_images_result.data:
                analogy_id = img["analogy_id"]
                if analogy_id not in images_by_analogy:
                    images_by_analogy[analogy_id] = []
                images_by_analogy[analogy_id].append(img)
        
        for analogy_data in result.data:
            print(f"Processing recent analogy: {analogy_data.get('id', 'no-id')}")
            # Ensure analogy_json is a dictionary
            analogy_json = analogy_data["analogy_json"]
            if isinstance(analogy_json, str):
                try:
                    analogy_json = json.loads(analogy_json)
                    print("Successfully parsed analogy_json from string")
                except json.JSONDecodeError as e:
                    print(f"Error parsing analogy_json: {e}")
                    continue  # Skip this analogy if JSON parsing fails

            # Get images for this analogy from the pre-fetched data
            analogy_id = analogy_data["id"]
            analogy_images = images_by_analogy.get(analogy_id, [])
            
            image_urls = []
            if analogy_images and len(analogy_images) >= 3:
                # Sort by image_index to ensure correct order
                sorted_images = sorted(analogy_images, key=lambda x: x["image_index"])
                image_urls = []
                for img in sorted_images:
                    image_url = img["image_url"]
                    # Fix malformed Supabase Storage URLs
                    fixed_url = fix_supabase_storage_url(image_url)
                    image_urls.append(fixed_url)
                    print(f"Recent analogy {analogy_id}, Image {img['image_index']}: Original={image_url}, Fixed={fixed_url}")
            else:
                # Fallback to default images if no images found or insufficient images
                print(f"No images found in database for recent analogy {analogy_id} (found {len(analogy_images)}), using fallback static assets")
                image_urls = get_fallback_images_for_analogy()

            # Structure the analogy data to match frontend expectations
            analogy = {
                "id": analogy_data["id"],
                "topic": analogy_data["topic"],
                "audience": analogy_data["audience"],
                "analogy_json": analogy_json,
                "image_urls": image_urls,
                "created_at": analogy_data["created_at"],
                "background_image": analogy_data.get("background_image", "/static/backgrounds/BlueComicBackground.png")
            }
            analogies.append(analogy)
            print(f"Added recent analogy to response: {analogy['id']}")

        print(f"Returning {len(analogies)} recent analogies")
        return {
            "status": "success",
            "analogies": analogies,
            "count": len(analogies)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_user_recent_analogies: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/analogy/{analogy_id}")
async def delete_analogy(analogy_id: str):
    try:
        print(f"Deleting analogy: {analogy_id}")
        
        # First check if the analogy exists
        result = supabase_client.table("analogies").select("id, user_id").eq("id", analogy_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Analogy not found")
        
        # Delete images from Supabase Storage before deleting the analogy
        print(f"Deleting images from storage for analogy: {analogy_id}")
        storage_deletion_success = await delete_analogy_images_from_storage(analogy_id)
        
        if not storage_deletion_success:
            print(f"Warning: Failed to delete some images from storage for analogy {analogy_id}")
            # Continue with analogy deletion even if storage cleanup failed
        
        # Delete the analogy from Supabase (this will cascade delete related records)
        delete_result = supabase_client.table("analogies").delete().eq("id", analogy_id).execute()
        
        if not delete_result.data:
            raise HTTPException(status_code=500, detail="Failed to delete analogy")
        
        print(f"Successfully deleted analogy: {analogy_id}")
        return {
            "status": "success",
            "message": "Analogy deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in delete_analogy: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/regenerate-analogy/{analogy_id}")
async def regenerate_analogy(analogy_id: str, request: RegenerateAnalogyRequest, authenticated_user_id: str = Depends(get_current_user)):
    try:
        print(f"Regenerating analogy: {analogy_id}")
        
        # First get the existing analogy to extract topic and audience
        result = supabase_client.table("analogies").select("*").eq("id", analogy_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Original analogy not found")
        
        original_analogy = result.data
        topic = original_analogy["topic"]
        audience = original_analogy["audience"]
        analogy_user_id = original_analogy["user_id"]
        
        # Allow any authenticated user to regenerate any analogy
        # The analogy will be created under the authenticated user's account
        
        user_id = authenticated_user_id
        timezone_str = request.timezone_str
        
        print(f"Regenerating for topic: {topic}, audience: {audience}, user: {user_id}")
        
        # STEP 1: VALIDATE LIMITS BEFORE ANY GENERATION BEGINS
        print(f"STEP 1: Validating limits for user {user_id} (regeneration)")
        
        # Get user's current plan and limits
        user_response = supabase_client.table("user_information").select(
            "plan, daily_analogies_generated, last_analogy_time, daily_reset_date, renewal_date, plan_cancelled"
        ).eq("id", user_id).single().execute()
        
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_response.data
        current_plan = user_data.get("plan", "curious")
        
        # DEPRECATED: Manual renewal date checking removed - now handled by Stripe webhooks
        # When a subscription actually ends, Stripe sends customer.subscription.updated
        # with status 'canceled' or 'unpaid', which triggers the downgrade automatically
        
        # Define limits based on plan
        if current_plan == "curious":
            daily_limit = 20
            rate_limit_seconds = 60  # 1 analogy per minute
        elif current_plan == "scholar":
            daily_limit = 100
            rate_limit_seconds = 12  # 5 analogies per minute (12 seconds between each)
        else:
            # Default to curious plan limits
            daily_limit = 20
            rate_limit_seconds = 60
        
        # Check and reset daily count if needed
        reset_result = await check_and_reset_daily_count(user_id, timezone_str)
        if reset_result:
            current_daily_count = reset_result["current_daily_count"]
        else:
            current_daily_count = user_data.get("daily_analogies_generated", 0) or 0
        
        # Check daily limit FIRST
        print(f"DEBUG: Checking daily limit - Current count: {current_daily_count}, Daily limit: {daily_limit}, Plan: {current_plan}")
        if current_daily_count >= daily_limit:
            print(f"DEBUG: DAILY LIMIT EXCEEDED! Current: {current_daily_count}, Limit: {daily_limit}")
            if current_plan == "curious":
                error_message = f"You have reached your daily limit of {daily_limit} analogies. Please upgrade to the Scholar plan for more analogies per day. Visit your pricing page to view your usage statistics and upgrade options."
            else:
                error_message = f"You have reached your daily limit of {daily_limit} analogies for today. Your limit will reset tomorrow. Visit your pricing page to view your usage statistics."
            
            print(f"DEBUG: Raising HTTPException with message: {error_message}")
            raise HTTPException(
                status_code=429, 
                detail=error_message
            )
        else:
            print(f"DEBUG: Daily limit check passed - Current: {current_daily_count}, Limit: {daily_limit}")
        
        # Check rate limiting SECOND
        last_analogy_time = user_data.get("last_analogy_time")
        if last_analogy_time:
            try:
                if isinstance(last_analogy_time, str):
                    last_analogy_time = datetime.fromisoformat(last_analogy_time.replace('Z', '+00:00'))
                elif isinstance(last_analogy_time, datetime):
                    last_analogy_time = last_analogy_time
                
                time_since_last = (datetime.utcnow() - last_analogy_time).total_seconds()
                if time_since_last < rate_limit_seconds:
                    remaining_seconds = int(rate_limit_seconds - time_since_last)
                    raise HTTPException(
                        status_code=429,
                        detail=f"Rate limit exceeded. Please wait {remaining_seconds} seconds before generating another analogy."
                    )
            except (ValueError, TypeError) as e:
                print(f"Error parsing last_analogy_time: {e}")
                # Continue if we can't parse the time
        
        print(f"STEP 1 COMPLETE: All limits validated successfully for user {user_id} (regeneration)")
        
        # STEP 1.5: CHECK STORAGE LIMITS
        print(f"STEP 1.5: Checking storage limits for user {user_id} (regeneration)")
        
        # Get user's current stored analogy count
        stored_analogies_response = supabase_client.table("analogies").select("id", count="exact").eq("user_id", user_id).execute()
        stored_count = stored_analogies_response.count or 0
        
        print(f"DEBUG: Storage check - Current stored: {stored_count}, Plan: {current_plan}")
        
        # Define storage limits based on plan
        if current_plan == "curious":
            storage_limit = 100
        elif current_plan == "scholar":
            storage_limit = 500
        else:
            storage_limit = 100  # Default to curious plan limit
        
        # Check if user has exceeded storage limit
        if stored_count >= storage_limit:
            print(f"DEBUG: STORAGE LIMIT EXCEEDED! Current: {stored_count}, Limit: {storage_limit}")
            if current_plan == "curious":
                error_message = f"You've reached your storage limit of {storage_limit} analogies. Delete old analogies or upgrade to the Scholar plan to continue generating."
            else:
                error_message = f"You've reached your storage limit of {storage_limit} analogies. Please delete some old analogies to continue generating."
            
            print(f"DEBUG: Raising HTTPException with storage message: {error_message}")
            raise HTTPException(
                status_code=429,
                detail=error_message
            )
        else:
            print(f"DEBUG: Storage limit check passed - Current: {stored_count}, Limit: {storage_limit}")
        
        print(f"STEP 1.5 COMPLETE: Storage limits validated successfully for user {user_id} (regeneration)")
        
        # STEP 2: ONLY AFTER ALL LIMITS ARE VALIDATED, PROCEED WITH GENERATION
        print(f"STEP 2: Starting analogy regeneration for user {user_id}")
        
        # Generate new analogy using the same topic and audience
        user_first_name = supabase_client.table("user_information").select("first_name").eq("id", user_id).single().execute().data.get("first_name")

        user_info = ""
        if user_id:
            try:
                print(f"Fetching user info for user_id: {user_id}\n")
                start_time = time.time()
                user_response = supabase_client.table("personality_answers").select("*").eq("user_id", user_id).limit(1).execute()
                end_time = time.time()
                print(f"Supabase request took: {end_time - start_time} seconds")

                if user_response.data:
                    data = user_response.data[0]  # Access the first result
                    print(f"User response: {data}")
                    context_parts = []

                    # Individual fields
                    if data.get("context"):
                        context_parts.append(f"They are in the {data['context']} category.")
                    if data.get("occupation"):
                        context_parts.append(f"They work as a {data['occupation']}.")

                    # List fields (joined cleanly)
                    if isinstance(data.get("analogy_styles"), list) and data["analogy_styles"]:
                        context_parts.append(f"They prefer analogies that are {', '.join(data['analogy_styles'])}.")
                    if isinstance(data.get("interests"), list) and data["interests"]:
                        context_parts.append(f"They are interested in {', '.join(data['interests'])}.")
                    if isinstance(data.get("hobbies"), list) and data["hobbies"]:
                        context_parts.append(f"They enjoy {', '.join(data['hobbies'])}.")
                    if isinstance(data.get("likes"), list) and data["likes"]:
                        context_parts.append(f"They like {', '.join(data['likes'])}.")
                    if isinstance(data.get("dislikes"), list) and data["dislikes"]:
                        context_parts.append(f"They dislike {', '.join(data['dislikes'])}.")

                    user_info = " ".join(context_parts)

            except Exception as e:
                print(f"Error fetching user info: {e}")

            print(f"Fetched User info for user_id: {user_id} is: {user_info}\n")
        
        prompt = ANALOGY_PROMPT.format(topic=topic, audience=audience, user_first_name=user_first_name, user_info=user_info, COMIC_STYLE_PREFIX=COMIC_STYLE_PREFIX)
        print(f"Regeneration prompt: {prompt}")
        
        # Generate a unique request ID for tracking
        request_id = str(uuid.uuid4())
        
        # Generate analogy with timeout and cancellation support
        try:
            start_time = time.time()
            
            # Use httpx for cancellable Gemini API calls
            analogy_json = await generate_analogy_with_httpx(prompt, topic, audience, timeout=30.0, request_id=request_id)
            
            print(f"Regeneration response: {analogy_json}")
            end_time = time.time()
            print(f"Time taken to regenerate response: {end_time - start_time} seconds")
        except asyncio.TimeoutError:
            print("Gemini API call timed out after 30 seconds")
            raise HTTPException(status_code=408, detail="Analogy regeneration timed out. Please try again.")
        except httpx.RequestError as e:
            print(f"Network error during Gemini API call: {e}")
            raise HTTPException(status_code=503, detail="Service temporarily unavailable. Please try again.")
        except Exception as e:
            print(f"Error generating analogy content: {e}")
            raise HTTPException(status_code=500, detail="Failed to regenerate analogy")

        new_analogy_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()

        # Select a random comic book background image
        background_image = get_random_comic_background()
        print(f"Selected background image for regenerated analogy {new_analogy_id}: {background_image}")

        image_prompts = [
            analogy_json["imagePrompt1"],
            analogy_json["imagePrompt2"],
            analogy_json["imagePrompt3"]
        ]

        # Generate images with timeout and cancellation support
        try:
            # Generate images and upload to Supabase Storage
            image_urls = []
            for i, prompt in enumerate(image_prompts):
                image_url = await generate_image_replicate(prompt, i, NEGATIVE_PROMPT, timeout=20.0)
                image_urls.append(image_url)
            
        except Exception as e:
            print(f"Error generating images: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate images")

        # Check if this regenerated analogy will update the streak before saving
        will_update_streak = False
        user_already_generated_today = False
        try:
            # Check if user has already generated an analogy today
            user_current_date = get_user_current_date(request.timezone_str)
            existing_log_response = supabase_client.table("streak_logs").select("id").eq("user_id", user_id).eq("date", user_current_date.isoformat()).execute()
            
            if existing_log_response.data:
                user_already_generated_today = True
                print(f"User already has a streak log for today ({user_current_date}), regenerated analogy will not update streak")
            
            # Get current user streak info to check if this analogy will update the streak
            user_response = supabase_client.table("user_information").select(
                "current_streak_count, longest_streak_count, last_streak_date, streak_reset_acknowledged"
            ).eq("id", user_id).single().execute()
            
            if user_response.data:
                user_data = user_response.data
                current_streak = user_data.get("current_streak_count", 0) or 0
                longest_streak = user_data.get("longest_streak_count", 0) or 0
                last_streak_date = user_data.get("last_streak_date")
                streak_reset_acknowledged = user_data.get("streak_reset_acknowledged", True)
                
                # Convert last_streak_date to date object if it's a string
                if isinstance(last_streak_date, str):
                    try:
                        # Parse date string (stored in user's timezone)
                        last_streak_date = datetime.strptime(last_streak_date, "%Y-%m-%d").date()
                    except ValueError:
                        last_streak_date = None
                
                # Check if streak is broken (more than 1 day since last analogy)
                streak_broken = False
                days_since_last_analogy = 0
                
                if last_streak_date:
                    days_since_last_analogy = (user_current_date - last_streak_date).days
                    streak_broken = days_since_last_analogy > 1
                else:
                    # No last streak date means no streak
                    streak_broken = True
                    days_since_last_analogy = None
                
                # If streak is broken and current streak > 0, reset it to 0
                if streak_broken and current_streak > 0:
                    print(f"Streak broken for user {user_id}. Days since last analogy: {days_since_last_analogy}. Resetting streak from {current_streak} to 0.")
                    
                    # Update user information in Supabase - reset streak and set streak_reset_acknowledged to False
                    update_response = supabase_client.table("user_information").update({
                        "current_streak_count": 0,
                        "streak_reset_acknowledged": False,  # User needs to acknowledge this reset
                        # Don't update longest_streak_count as it should remain the record
                    }).eq("id", user_id).execute()
                    
                    if not update_response.data:
                        print(f"Failed to reset streak for user: {user_id}")
                    else:
                        print(f"Successfully reset streak for user {user_id} to 0")
                        # Update local values for return
                        current_streak = 0
                        streak_reset_acknowledged = False
                
                # Determine if this analogy will update the streak (only if user hasn't already generated today)
                if not user_already_generated_today:
                    if last_streak_date:
                        if last_streak_date == user_current_date:
                            # User already generated an analogy today, won't update streak
                            will_update_streak = False
                        elif last_streak_date == user_current_date - timedelta(days=1):
                            # User generated analogy yesterday, will increment streak
                            will_update_streak = True
                        else:
                            # User missed a day or more, will reset to 1
                            will_update_streak = True
                    else:
                        # First time generating an analogy, will set streak to 1
                        will_update_streak = True
                else:
                    # User already generated today, won't update streak
                    will_update_streak = False
        except Exception as e:
            print(f"Error checking streak update: {e}")
            # Default to False if we can't determine
            will_update_streak = False
            user_already_generated_today = False

        # Save new analogy to Supabase FIRST (before inserting image records)
        try:
            print("Saving regenerated analogy to supabase")
            start_time = time.time()
            insert_response = supabase_client.table("analogies").insert({
                "id": new_analogy_id,
                "user_id": user_id,
                "topic": topic,
                "audience": audience,
                "analogy_json": analogy_json,
                "created_at": created_at,
                "streak_popup_shown": True,  # Default to True (don't show popup) - will be updated if streak log is created
                "background_image": background_image,  # Save the selected background image
                "is_public": False,  # Default to private
            }).execute()
            end_time = time.time()
            print(f"Time taken to save regenerated analogy to supabase: {end_time - start_time} seconds")
            if not insert_response.data:
                raise HTTPException(status_code=500, detail="Insert into analogies failed or returned no data")

        except Exception as e:
            print(f"Supabase analogies insert error: {e}")
            raise HTTPException(status_code=500, detail=f"Supabase analogies insert error: {str(e)}")

        # NOW insert image records into analogy_images table (after analogy exists)
        try:
            print("Inserting image records into analogy_images table")
            for i, image_url in enumerate(image_urls):
                if not image_url.startswith("/static/assets/"):  # Only insert if not a fallback image
                    await insert_analogy_image(
                        analogy_id=new_analogy_id,
                        user_id=user_id,
                        image_url=image_url,
                        image_index=i,
                        prompt=image_prompts[i],
                        negative_prompt=NEGATIVE_PROMPT
                    )
        except Exception as e:
            print(f"Error inserting image records: {e}")
            # Don't fail the analogy regeneration if image record insertion fails
            # The analogy was already saved successfully and images were uploaded to storage

        # Fetch the final image URLs from the database (with fallback to static assets)
        try:
            print("Fetching final image URLs from analogy_images table")
            images_result = supabase_client.table("analogy_images").select("*").eq("analogy_id", new_analogy_id).order("image_index", desc=False).execute()
            
            print(f"Database query result: {images_result.data}")
            
            final_image_urls = []
            if images_result.data and len(images_result.data) >= 3:
                # Sort by image_index to ensure correct order
                sorted_images = sorted(images_result.data, key=lambda x: x["image_index"])
                final_image_urls = []
                for img in sorted_images:
                    image_url = img["image_url"]
                    # Fix malformed Supabase Storage URLs
                    fixed_url = fix_supabase_storage_url(image_url)
                    final_image_urls.append(fixed_url)
                    print(f"Regenerated analogy {new_analogy_id}, Image {img['image_index']}: Original={image_url}, Fixed={fixed_url}")
                print(f"Successfully fetched {len(final_image_urls)} images from database: {final_image_urls}")
            else:
                # Fallback to static assets if no images found in database
                print("No images found in database, using fallback static assets")
                final_image_urls = get_fallback_images_for_analogy()
        except Exception as e:
            print(f"Error fetching images from database: {e}, using fallback static assets")
            final_image_urls = get_fallback_images_for_analogy()

        # Update user streak after successfully saving the analogy
        streak_log_created = False
        try:
            print("Checking if user streak should be updated after successful analogy regeneration")
            
            if user_already_generated_today:
                print(f"User already has a streak log for today ({user_current_date}), skipping streak update for regenerated analogy")
            else:
                print("No existing streak log for today, updating user streak after successful analogy regeneration")
                streak_update = update_user_streak(user_id, request.timezone_str)
                if streak_update:
                    print(f"Streak updated successfully: {streak_update}")
                    streak_log_created = True
                else:
                    print("Failed to update streak, but analogy was saved successfully")
        except Exception as e:
            print(f"Error updating streak: {e}")
            # Don't fail the analogy regeneration if streak update fails
            # The analogy was already saved successfully

        # Increment lifetime analogies generated count
        try:
            print("Incrementing lifetime analogies generated count")
            # First get the current count
            user_count_response = supabase_client.table("user_information").select(
                "lifetime_analogies_generated"
            ).eq("id", user_id).single().execute()
            
            if user_count_response.data:
                current_count = user_count_response.data.get("lifetime_analogies_generated", 0) or 0
                new_count = current_count + 1
                
                # Update the count
                update_count_response = supabase_client.table("user_information").update({
                    "lifetime_analogies_generated": new_count
                }).eq("id", user_id).execute()
                
                if update_count_response.data:
                    print(f"Successfully incremented lifetime analogies count to: {new_count}")
                else:
                    print("Failed to update lifetime analogies count")
            else:
                print("Failed to get current lifetime analogies count")
        except Exception as e:
            print(f"Error incrementing lifetime analogies count: {e}")
            # Don't fail the analogy regeneration if count update fails
            # The analogy was already saved successfully

        # Increment daily analogies generated count and update last generation time
        try:
            print("Updating daily analogy count and last generation time")
            current_time = datetime.utcnow()
            
            # Get current daily count first from database
            daily_count_response = supabase_client.table("user_information").select(
                "daily_analogies_generated"
            ).eq("id", user_id).single().execute()
            
            if daily_count_response.data:
                current_daily_count = daily_count_response.data.get("daily_analogies_generated", 0) or 0
                new_daily_count = current_daily_count + 1
                print(f"Current daily count: {current_daily_count}, New daily count: {new_daily_count}")
                
                # Update both daily count and last generation time in database FIRST
                update_daily_response = supabase_client.table("user_information").update({
                    "daily_analogies_generated": new_daily_count,
                    "last_analogy_time": current_time.isoformat()
                }).eq("id", user_id).execute()
                
                if update_daily_response.data:
                    print(f"Successfully updated daily analogy count to {new_daily_count} and last generation time")
                    print(f"Update response: {update_daily_response.data}")
                    
                    # Verify the update by fetching fresh data from database
                    verify_response = supabase_client.table("user_information").select(
                        "daily_analogies_generated, last_analogy_time"
                    ).eq("id", user_id).single().execute()
                    
                    if verify_response.data:
                        verified_count = verify_response.data.get("daily_analogies_generated", 0) or 0
                        verified_time = verify_response.data.get("last_analogy_time")
                        print(f"Verified daily count: {verified_count}, Verified last time: {verified_time}")
                    else:
                        print("Failed to verify update - could not fetch fresh data")
                else:
                    print("Failed to update daily analogy count and last generation time")
                    print(f"Update response: {update_daily_response}")
            else:
                print("Failed to get current daily analogy count")
                print(f"Daily count response: {daily_count_response}")
        except Exception as e:
            print(f"Error updating daily analogy count: {e}")
            import traceback
            traceback.print_exc()
            # Don't fail the analogy generation if this update fails
            # The analogy was already saved successfully

        # Update the analogy record with the correct streak_popup_shown value
        # Only show popup if a streak log was actually created for this analogy
        try:
            print(f"Updating regenerated analogy {new_analogy_id} with streak_popup_shown = {not streak_log_created}")
            update_response = supabase_client.table("analogies").update({
                "streak_popup_shown": not streak_log_created  # False = show popup, True = don't show popup
            }).eq("id", new_analogy_id).execute()
            
            if not update_response.data:
                print(f"Failed to update streak_popup_shown for regenerated analogy: {new_analogy_id}")
            else:
                print(f"Successfully updated streak_popup_shown for regenerated analogy: {new_analogy_id}")
        except Exception as e:
            print(f"Error updating streak_popup_shown for regenerated analogy: {e}")
            # Don't fail the analogy regeneration if this update fails

        # Add debugging for response creation
        try:
            print(f"Creating response with analogy_images type: {type(final_image_urls)}, length: {len(final_image_urls) if isinstance(final_image_urls, list) else 'not a list'}")
            print(f"final_image_urls: {final_image_urls}")
            
            response = GenerateAnalogyResponse(
                status="success",
                id=new_analogy_id,
                analogy=analogy_json,
                analogy_images=final_image_urls if isinstance(final_image_urls, list) else list(final_image_urls),
                topic=topic,
                audience=audience,
                created_at=created_at,
                streak_popup_shown=not streak_log_created,  # Only show popup if streak log was created
                background_image=background_image,
                is_public=False  # Default to private for regenerated analogies
            )
            
            print(f"Successfully created response: {response}")
            return response
            
        except Exception as response_error:
            print(f"Error creating response: {response_error}")
            print(f"Response error type: {type(response_error)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Error creating response: {str(response_error)}")
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in regenerate_analogy: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/user/{user_id}/streak")
async def get_user_streak(user_id: str, timezone_str: str = "UTC"):
    """
    Get the current streak information for a user.
    This endpoint automatically validates and resets broken streaks.
    
    Args:
        user_id (str): The user's ID
        timezone_str (str): Timezone string for date calculations
        
    Returns:
        dict: User's streak information
    """
    try:
        print(f"Fetching streak info for user: {user_id}, timezone: {timezone_str}")
        
        # Validate and potentially update the user's streak
        streak_data = validate_and_update_user_streak(user_id, timezone_str)
        
        if not streak_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "status": "success",
            "current_streak_count": streak_data["current_streak_count"],
            "longest_streak_count": streak_data["longest_streak_count"],
            "last_streak_date": streak_data["last_streak_date"],
            "last_analogy_time": streak_data["last_analogy_time"],
            "is_streak_active": streak_data["is_streak_active"],
            "days_since_last_analogy": streak_data["days_since_last_analogy"],
            "streak_was_reset": streak_data.get("streak_was_reset", False)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_user_streak: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/user/{user_id}/streak-logs")
async def get_user_streak_logs(user_id: str, year: int = None, month: int = None, timezone_str: str = "UTC"):
    """
    Get streak logs for a user, optionally scoped to a specific month.
    
    Args:
        user_id (str): The user's ID
        year (int, optional): Year to filter by (defaults to current year in user's timezone)
        month (int, optional): Month to filter by (defaults to current month in user's timezone)
        timezone_str (str): Timezone string (e.g., "UTC", "America/New_York")
        
    Returns:
        dict: List of streak log dates in user's timezone
    """
    try:
        print(f"Fetching streak logs for user: {user_id}, year: {year}, month: {month}, timezone: {timezone_str}")
        
        # If year and month are not provided, use current date in user's timezone
        if year is None or month is None:
            user_current_date = get_user_current_date(timezone_str)
            year = year or user_current_date.year
            month = month or user_current_date.month
        
        # Calculate first and last day of the month in user's timezone
        user_tz = get_user_timezone(timezone_str)
        first_day = user_tz.localize(datetime(year, month, 1)).date()
        if month == 12:
            last_day = user_tz.localize(datetime(year + 1, 1, 1)).date() - timedelta(days=1)
        else:
            last_day = user_tz.localize(datetime(year, month + 1, 1)).date() - timedelta(days=1)
        
        print(f"User timezone: {timezone_str}")
        print(f"User month range: {first_day} to {last_day}")
        
        # Since we're now storing dates in the user's timezone, query directly
        # Fetch streak logs for the specified month using user's date range
        result = supabase_client.table("streak_logs").select("date").eq("user_id", user_id).gte("date", first_day.isoformat()).lte("date", last_day.isoformat()).execute()
        
        if not result.data:
            print(f"No streak logs found for user {user_id} in {year}-{month} ({timezone_str})")
            return {
                "status": "success",
                "streak_logs": [],
                "year": year,
                "month": month,
                "timezone": timezone_str
            }
        
        # Process streak log dates (stored in user's timezone)
        user_streak_dates = []
        for log in result.data:
            date_str = log["date"]
            print(f"Processing date from database: {date_str}")
            
            # The date from database is stored as YYYY-MM-DD format in user's timezone
            try:
                # Parse the date string directly as a user timezone date
                user_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                user_date_str = user_date.isoformat()
                user_streak_dates.append(user_date_str)
                
                print(f"  Database date: {date_str}, User date: {user_date_str}")
            except ValueError as e:
                print(f"  Error parsing date {date_str}: {e}")
                continue
        
        print(f"Found {len(user_streak_dates)} streak logs for user {user_id} in {year}-{month} ({timezone_str})")
        print(f"User streak dates: {user_streak_dates}")
        
        # Debug: Check current date in user's timezone
        user_current_date = get_user_current_date(timezone_str)
        print(f"Current date in user timezone ({timezone_str}): {user_current_date}")
        print(f"Is current date in streak dates? {user_current_date.isoformat() in user_streak_dates}")
        
        return {
            "status": "success",
            "streak_logs": user_streak_dates,
            "year": year,
            "month": month,
            "timezone": timezone_str
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_user_streak_logs: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/user/{user_id}/analogies-count")
async def get_user_analogies_count(user_id: str):
    """
    Get the total count of analogies for a user.
    
    Args:
        user_id (str): The user's ID
        
    Returns:
        dict: Total count of analogies
    """
    try:
        print(f"Fetching analogies count for user: {user_id}")
        
        # Count analogies for the user
        result = supabase_client.table("analogies").select("id", count="exact").eq("user_id", user_id).execute()
        
        count = result.count if result.count is not None else 0
        
        return {
            "status": "success",
            "count": count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_user_analogies_count: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/user/{user_id}/lifetime-analogies-count")
async def get_user_lifetime_analogies_count(user_id: str):
    """
    Get the lifetime count of analogies generated for a user.
    
    Args:
        user_id (str): The user's ID
        
    Returns:
        dict: Lifetime count of analogies generated
    """
    try:
        print(f"Fetching lifetime analogies count for user: {user_id}")
        
        # Get lifetime analogies count from user_information
        result = supabase_client.table("user_information").select(
            "lifetime_analogies_generated"
        ).eq("id", user_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        lifetime_count = result.data.get("lifetime_analogies_generated", 0) or 0
        
        return {
            "status": "success",
            "lifetime_count": lifetime_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_user_lifetime_analogies_count: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health")
async def health_check():
    try:
        # Test database connection
        test_response = supabase_client.table("user_information").select("id").limit(1).execute()
        db_status = "healthy" if test_response.data is not None else "unhealthy"
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": db_status,
            "version": "1.0.0"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "version": "1.0.0"
        }

@app.get("/admin/storage-stats")
async def get_storage_stats():
    """
    Get storage usage statistics to monitor egress.
    """
    try:
        stats = storage_manager.get_storage_usage_stats()
        return {"success": True, "stats": stats}
    except Exception as e:
        print(f"Error getting storage stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get storage stats: {e}")

@app.post("/admin/cleanup-old-files")
async def cleanup_old_files(days_old: int = 30):
    """
    Clean up files older than specified days.
    """
    try:
        result = storage_manager.cleanup_old_files(days_old)
        return {"success": True, "result": result}
    except Exception as e:
        print(f"Error cleaning up old files: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cleanup old files: {e}")

@app.get("/admin/storage-optimization")
async def get_storage_optimization():
    """
    Get storage optimization recommendations.
    """
    try:
        optimization = storage_manager.optimize_storage_settings()
        return {"success": True, "optimization": optimization}
    except Exception as e:
        print(f"Error getting storage optimization: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get storage optimization: {e}")

@app.get("/check-username/{username}")
@limiter.limit("20/minute")
async def check_username_availability(request: Request, username: str):
    from utils.helpers import check_username_uniqueness
    
    result = await check_username_uniqueness(username)
    return {
        "available": result["available"],
        "error": result["error"]
    }

@app.get("/check-email/{email}")
@limiter.limit("20/minute")
async def check_email_availability(request: Request, email: str):
    from utils.helpers import check_email_uniqueness
    
    result = await check_email_uniqueness(email)
    return {
        "available": result["available"],
        "error": result["error"]
    }

class PasswordResetRequest(BaseModel):
    email: str

class LoginRequest(BaseModel):
    email: str
    password: str
    captchaToken: str | None = None

@app.post("/login")
@limiter.limit("10/minute")
async def login_user(request: Request, payload: LoginRequest):
    """
    Login endpoint for additional rate limiting and logging.
    The actual authentication is still handled by Supabase Auth.
    """
    try:
        print(f"Login attempt for email: {payload.email}")
        
        # Additional validation
        if not payload.email or not "@" in payload.email:
            raise HTTPException(status_code=400, detail="Invalid email address")
        
        if not payload.password or len(payload.password) < 6:
            raise HTTPException(status_code=400, detail="Invalid password")
        
        # Validate captcha token if provided
        if payload.captchaToken:
            print(f"Captcha token provided for login: {payload.captchaToken[:20]}...")
        else:
            print("No captcha token provided for login")
        
        # Log the login attempt for security monitoring
        # In a production environment, you might want to store this in a database
        print(f"Login attempt logged for: {payload.email} at {datetime.utcnow()}")
        
        # Return success - the actual login will be handled by Supabase Auth
        return {
            "status": "success",
            "message": "Login request processed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in login_user: {e}")
        raise HTTPException(status_code=500, detail="Failed to process login request")

@app.post("/user/{user_id}/check-daily-reset")
async def check_daily_reset_on_login(user_id: str, authenticated_user_id: str = Depends(get_current_user)):
    """
    Check and reset daily count if needed. This should be called after successful login.
    """
    try:
        # Verify the user is checking their own data
        if user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to check another user's data")
        
        # Check and reset daily count
        result = await check_and_reset_daily_count(user_id, "UTC")
        
        if result is None:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "status": "success",
            "message": "Daily reset check completed",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in check_daily_reset_on_login: {e}")
        raise HTTPException(status_code=500, detail="Failed to check daily reset")

@app.post("/request-password-reset")
@limiter.limit("3/minute")
async def request_password_reset(request: Request, payload: PasswordResetRequest):
    """
    Request a password reset email. This endpoint provides additional rate limiting
    and logging on top of Supabase's built-in rate limiting.
    """
    try:
        print(f"Password reset requested for email: {payload.email}")
        
        # Additional validation
        if not payload.email or not "@" in payload.email:
            raise HTTPException(status_code=400, detail="Invalid email address")
        
        # Log the password reset request for security monitoring
        # In a production environment, you might want to store this in a database
        print(f"Password reset request logged for: {payload.email} at {datetime.utcnow()}")
        
        # Return success - the actual password reset will be handled by Supabase Auth
        return {
            "status": "success",
            "message": "Password reset email sent successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in request_password_reset: {e}")
        raise HTTPException(status_code=500, detail="Failed to process password reset request")

@app.patch("/analogy/{analogy_id}/streak-popup-shown")
async def mark_streak_popup_shown(analogy_id: str, user_id: str):
    """
    Mark the streak popup as shown for a specific analogy.
    This endpoint should be called when the user dismisses the streak popup.
    """
    try:
        print(f"Marking streak popup as shown for analogy: {analogy_id}")
        
        # First check if the analogy exists and belongs to the user
        result = supabase_client.table("analogies").select("id, user_id").eq("id", analogy_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Analogy not found")
        
        analogy_data = result.data
        if analogy_data["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this analogy")
        
        # Update the streak_popup_shown field to True
        update_result = supabase_client.table("analogies").update({
            "streak_popup_shown": True
        }).eq("id", analogy_id).execute()
        
        if not update_result.data:
            raise HTTPException(status_code=500, detail="Failed to update streak popup shown status")
        
        print(f"Successfully marked streak popup as shown for analogy: {analogy_id}")
        return {
            "status": "success",
            "message": "Streak popup marked as shown"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in mark_streak_popup_shown: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/user/{user_id}/acknowledge-streak-reset")
async def acknowledge_streak_reset(user_id: str):
    """
    Acknowledge that the user has seen the streak reset notification.
    This endpoint should be called when the user closes the streak reset modal.
    """
    try:
        print(f"Acknowledging streak reset for user: {user_id}")
        
        # Update the streak_reset_acknowledged field to True
        update_result = supabase_client.table("user_information").update({
            "streak_reset_acknowledged": True
        }).eq("id", user_id).execute()
        
        if not update_result.data:
            raise HTTPException(status_code=500, detail="Failed to acknowledge streak reset")
        
        print(f"Successfully acknowledged streak reset for user: {user_id}")
        return {
            "status": "success",
            "message": "Streak reset acknowledged"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in acknowledge_streak_reset: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/cancel-request/{request_id}")
async def cancel_request(request_id: str):
    """
    Cancel an ongoing request by request ID.
    """
    try:
        if request_id in active_requests:
            active_requests[request_id]["status"] = "cancelled"
            del active_requests[request_id]
            return {
                "status": "success",
                "message": f"Request {request_id} cancelled successfully"
            }
        else:
            return {
                "status": "not_found",
                "message": f"Request {request_id} not found or already completed"
            }
    except Exception as e:
        print(f"Error cancelling request {request_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel request")

@app.get("/active-requests")
async def get_active_requests():
    """
    Get list of active requests for monitoring.
    """
    try:
        return {
            "status": "success",
            "active_requests": active_requests,
            "count": len(active_requests)
        }
    except Exception as e:
        print(f"Error getting active requests: {e}")
        raise HTTPException(status_code=500, detail="Failed to get active requests")

@app.post("/user/{user_id}/fix-streak")
async def fix_user_streak(user_id: str, timezone_str: str = "UTC"):
    """
    Fix a user's streak that was incorrectly reset due to timezone issues.
    This endpoint should be used to restore streaks that were incorrectly reset.
    
    Args:
        user_id (str): The user's ID
        timezone_str (str): User's timezone string
        
    Returns:
        dict: Updated streak information
    """
    try:
        print(f"Fixing streak for user: {user_id}, timezone: {timezone_str}")
        
        # Get current date in user's timezone
        current_date = get_user_current_date(timezone_str)
        
        # Fetch current user streak info
        user_response = supabase_client.table("user_information").select(
            "current_streak_count, longest_streak_count, last_streak_date, last_analogy_time, streak_reset_acknowledged"
        ).eq("id", user_id).single().execute()
        
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        user_data = user_response.data
        
        # Get current streak values
        current_streak = user_data.get("current_streak_count", 0) or 0
        longest_streak = user_data.get("longest_streak_count", 0) or 0
        last_streak_date = user_data.get("last_streak_date")
        
        print(f"Current streak: {current_streak}, Longest streak: {longest_streak}, Last streak date: {last_streak_date}")
        
        # Convert last_streak_date to date object if it's a string
        if isinstance(last_streak_date, str):
            try:
                last_streak_date = datetime.strptime(last_streak_date, "%Y-%m-%d").date()
            except ValueError:
                last_streak_date = None
        
        # Check if user has generated an analogy today
        today_log_response = supabase_client.table("streak_logs").select("id").eq("user_id", user_id).eq("date", current_date.isoformat()).execute()
        has_generated_today = bool(today_log_response.data)
        
        # Determine the correct streak count
        correct_streak = 0
        
        if last_streak_date:
            days_since_last_analogy = (current_date - last_streak_date).days
            
            if days_since_last_analogy == 0:
                # Generated today
                correct_streak = current_streak if has_generated_today else 1
            elif days_since_last_analogy == 1:
                # Generated yesterday - streak should be 1
                correct_streak = 1
            elif days_since_last_analogy > 1:
                # Generated more than 1 day ago - streak should be 0
                correct_streak = 0
            else:
                # Future date (shouldn't happen)
                correct_streak = 0
        else:
            # No last streak date
            correct_streak = 0
        
        print(f"Days since last analogy: {(current_date - last_streak_date).days if last_streak_date else 'None'}")
        print(f"Has generated today: {has_generated_today}")
        print(f"Correct streak should be: {correct_streak}")
        
        # Update the streak if it's incorrect
        if correct_streak != current_streak:
            print(f"Fixing streak from {current_streak} to {correct_streak}")
            
            # Update user information in Supabase
            update_response = supabase_client.table("user_information").update({
                "current_streak_count": correct_streak,
                "streak_reset_acknowledged": True,  # Don't show reset notification for this fix
            }).eq("id", user_id).execute()
            
            if not update_response.data:
                raise HTTPException(status_code=500, detail="Failed to update streak")
            
            print(f"Successfully fixed streak for user {user_id} to {correct_streak}")
        else:
            print(f"Streak is already correct: {current_streak}")
        
        return {
            "status": "success",
            "message": f"Streak fixed to {correct_streak}",
            "current_streak_count": correct_streak,
            "longest_streak_count": longest_streak,
            "last_streak_date": user_data.get("last_streak_date"),
            "days_since_last_analogy": (current_date - last_streak_date).days if last_streak_date else None,
            "has_generated_today": has_generated_today
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fixing user streak: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/admin/cleanup-orphaned-images")
async def cleanup_orphaned_images():
    """
    Clean up orphaned images in Supabase Storage that don't have corresponding database records.
    This is a maintenance endpoint that should be used periodically to free up storage space.
    
    Returns:
        dict: Summary of cleanup results
    """
    try:
        print("Starting orphaned image cleanup")
        
        # Perform the cleanup
        result = await cleanup_orphaned_storage_images()
        
        return {
            "status": "success",
            "message": "Orphaned image cleanup completed",
            "results": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in cleanup_orphaned_images: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/analogy/{analogy_id}/public")
async def update_analogy_public_status(analogy_id: str, request: UpdateAnalogyPublicRequest, authenticated_user_id: str = Depends(get_current_user)):
    """
    Update the public status of an analogy.
    Only the owner of the analogy can make it public or private.
    """
    try:
        print(f"Updating public status for analogy: {analogy_id}, is_public: {request.is_public}")
        
        # First check if the analogy exists and get its owner
        result = supabase_client.table("analogies").select("id, user_id").eq("id", analogy_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Analogy not found")
        
        analogy_user_id = result.data["user_id"]
        
        # Verify that the authenticated user owns this analogy
        if analogy_user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="You can only update your own analogies")
        
        # Update the public status
        update_response = supabase_client.table("analogies").update({
            "is_public": request.is_public
        }).eq("id", analogy_id).execute()
        
        if not update_response.data:
            raise HTTPException(status_code=500, detail="Failed to update analogy public status")
        
        print(f"Successfully updated analogy {analogy_id} public status to: {request.is_public}")
        return {
            "status": "success",
            "message": f"Analogy {'made public' if request.is_public else 'made private'} successfully",
            "is_public": request.is_public
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in update_analogy_public_status: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/shared/{analogy_id}")
async def get_shared_analogy(analogy_id: str):
    """
    Get a public analogy for sharing.
    This endpoint doesn't require authentication and only returns public analogies.
    """
    try:
        print(f"Fetching shared analogy: {analogy_id}")
        
        # Get the analogy and check if it's public
        result = supabase_client.table("analogies").select("*").eq("id", analogy_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Analogy not found")
        
        analogy_data = result.data
        
        # Check if the analogy is public
        if not analogy_data.get("is_public", False):
            raise HTTPException(status_code=403, detail="This analogy is not public and cannot be shared")
        
        # Get the creator's username
        creator_response = supabase_client.table("user_information").select("username").eq("id", analogy_data["user_id"]).single().execute()
        creator_username = creator_response.data.get("username", "Unknown User") if creator_response.data else "Unknown User"
        
        # Ensure analogy_json is a dictionary
        analogy_json = analogy_data["analogy_json"]
        if isinstance(analogy_json, str):
            try:
                analogy_json = json.loads(analogy_json)
            except json.JSONDecodeError as e:
                print(f"Error parsing analogy_json: {e}")
                raise HTTPException(status_code=500, detail="Invalid analogy data format")

        # Fetch images from analogy_images table
        print("Fetching images from analogy_images table")
        images_result = supabase_client.table("analogy_images").select("*").eq("analogy_id", analogy_id).order("image_index", desc=False).execute()
        
        image_urls = []
        if images_result.data and len(images_result.data) >= 3:
            # Sort by image_index to ensure correct order
            sorted_images = sorted(images_result.data, key=lambda x: x["image_index"])
            image_urls = []
            for img in sorted_images:
                image_url = img["image_url"]
                # Fix malformed Supabase Storage URLs
                fixed_url = fix_supabase_storage_url(image_url)
                image_urls.append(fixed_url)
                print(f"Shared analogy {analogy_id}, Image {img['image_index']}: Original={image_url}, Fixed={fixed_url}")
        else:
            # Fallback to default images if no images found or insufficient images
            print(f"No images found in database (found {len(images_result.data) if images_result.data else 0}), using fallback static assets")
            image_urls = get_fallback_images_for_analogy()

        print("Returning shared analogy response")
        return {
            "status": "success",
            "id": analogy_data["id"],
            "analogy": analogy_json,
            "analogy_images": image_urls,
            "topic": analogy_data["topic"],
            "audience": analogy_data["audience"],
            "created_at": analogy_data["created_at"],
            "background_image": analogy_data.get("background_image", "/static/backgrounds/BlueComicBackground.png"),
            "creator_username": creator_username,
            "is_public": True
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_shared_analogy: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/user/{user_id}/profile")
async def get_user_profile(user_id: str, authenticated_user_id: str = Depends(get_current_user)):
    """
    Get user profile information.
    Users can only access their own profile.
    """
    try:
        # Verify that the authenticated user is accessing their own profile
        if user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="You can only access your own profile")
        
        # Get user profile from user_information table
        result = supabase_client.table("user_information").select("*").eq("id", user_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        return {
            "status": "success",
            "profile": result.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_user_profile: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.patch("/user/{user_id}/profile")
async def update_user_profile(user_id: str, request: UpdateUserProfileRequest, authenticated_user_id: str = Depends(get_current_user)):
    """
    Update user profile information.
    Users can only update their own profile.
    """
    try:
        # Verify that the authenticated user is updating their own profile
        if user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="You can only update your own profile")
        
        # Check if username is already taken by another user
        username_check = supabase_client.table("user_information").select("id").eq("username", request.username).neq("id", user_id).execute()
        if username_check.data:
            raise HTTPException(status_code=400, detail="Username is already taken")
        
        # Update user profile
        update_response = supabase_client.table("user_information").update({
            "username": request.username,
            "first_name": request.first_name,
            "last_name": request.last_name,
            "opt_in_email_marketing": request.opt_in_email_marketing,
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        return {
            "status": "success",
            "message": "Profile updated successfully",
            "profile": update_response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in update_user_profile: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.patch("/user/{user_id}/password")
async def update_user_password(user_id: str, request: UpdatePasswordRequest, authenticated_user_id: str = Depends(get_current_user)):
    """
    Update user password.
    Users can only update their own password.
    """
    try:
        # Verify that the authenticated user is updating their own password
        if user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="You can only update your own password")
        
        # Validate password requirements
        if len(request.new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
        # Update password using Supabase Auth
        try:
            # Note: This requires admin privileges in Supabase
            # For now, we'll return an error suggesting the user change password through the frontend
            # In a production environment, you might want to implement a different approach
            raise HTTPException(status_code=501, detail="Password updates should be handled through the frontend authentication system")
        except Exception as e:
            print(f"Error updating password: {e}")
            raise HTTPException(status_code=500, detail="Failed to update password")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in update_user_password: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/user/{user_id}/account")
async def delete_user_account(user_id: str, request: DeleteAccountRequest, authenticated_user_id: str = Depends(get_current_user)):
    """
    Delete user account and all associated data.
    Users can only delete their own account.
    """
    try:
        # Verify that the authenticated user is deleting their own account
        if user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="You can only delete your own account")
        
        # Verify confirmation
        if request.confirmation != "DELETE":
            raise HTTPException(status_code=400, detail="Please type 'DELETE' to confirm account deletion")
        
        # Delete user data from user_information table
        try:
            profile_delete = supabase_client.table("user_information").delete().eq("id", user_id).execute()
            print(f"Deleted user profile: {profile_delete}")
        except Exception as e:
            print(f"Error deleting user profile: {e}")
        
        # Delete user data from personality_answers table
        try:
            personality_delete = supabase_client.table("personality_answers").delete().eq("user_id", user_id).execute()
            print(f"Deleted personality data: {personality_delete}")
        except Exception as e:
            print(f"Error deleting personality data: {e}")
        
        # Delete user's analogies
        try:
            analogies_delete = supabase_client.table("analogies").delete().eq("user_id", user_id).execute()
            print(f"Deleted user analogies: {analogies_delete}")
        except Exception as e:
            print(f"Error deleting user analogies: {e}")
        
        # Delete user's streak logs
        try:
            streak_logs_delete = supabase_client.table("streak_logs").delete().eq("user_id", user_id).execute()
            print(f"Deleted user streak logs: {streak_logs_delete}")
        except Exception as e:
            print(f"Error deleting user streak logs: {e}")
        
        # Note: The actual user account deletion from Supabase Auth should be handled by the frontend
        # as it requires admin privileges. This endpoint handles the data cleanup.
        
        return {
            "status": "success",
            "message": "Account data deleted successfully. Please complete account deletion through the frontend."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in delete_user_account: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/user/{user_id}/pricing-stats", response_model=UserStatsResponse)
async def get_user_pricing_stats(user_id: str, authenticated_user_id: str = Depends(get_current_user)):
    """
    Get user's pricing statistics including plan, usage, and limits.
    
    Args:
        user_id (str): The user's ID
        authenticated_user_id (str): The authenticated user's ID (must match user_id)
        
    Returns:
        UserStatsResponse: User's pricing statistics
    """
    try:
        # Ensure user can only access their own stats
        if user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        print(f"Fetching pricing stats for user: {user_id}")
        
        # Fetch user's plan from user_information table
        user_response = supabase_client.table("user_information").select(
            "plan, subscription_start_date, renewal_date, upcoming_plan, plan_cancelled, daily_analogies_generated, stripe_subscription_id"
        ).eq("id", user_id).single().execute()
        
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_response.data
        current_plan = user_data.get("plan", "curious")  # Use the actual plan value from database
        
        # DEPRECATED: Manual renewal date checking removed - now handled by Stripe webhooks
        # When a subscription actually ends, Stripe sends customer.subscription.updated
        # with status 'canceled' or 'unpaid', which triggers the downgrade automatically
        
        # Define limits based on plan
        if current_plan == "curious":
            daily_limit = 20
            rate_limit_seconds = 60  # 1 analogy per minute
        elif current_plan == "scholar":
            daily_limit = 100
            rate_limit_seconds = 12  # 5 analogies per minute (12 seconds between each)
        else:
            # Default to curious plan limits
            daily_limit = 20
            rate_limit_seconds = 60
        
        # Get renewal date from database
        renewal_date = ""
        if user_data.get("renewal_date"):
            renewal_date = user_data["renewal_date"]
        
        # Fetch today's analogy count from the daily_analogies_generated field
        today_count = user_data.get("daily_analogies_generated", 0) or 0
        print(f"Pricing stats - User data: {user_data}")
        print(f"Pricing stats - Daily analogies generated: {today_count}")
        
        # Fetch total analogies stored
        total_count_response = supabase_client.table("analogies").select(
            "id", count="exact"
        ).eq("user_id", user_id).execute()
        
        total_count = total_count_response.count if total_count_response.count is not None else 0
        print(f"Pricing stats - Total analogies stored: {total_count}")
        
        # Ensure upcomingPlan always has a value
        upcoming_plan = user_data.get("upcoming_plan")
        if not upcoming_plan:
            # If no upcoming_plan is set, use the current plan
            upcoming_plan = current_plan
        
        return UserStatsResponse(
            currentPlan=current_plan,
            renewalDate=renewal_date,
            analogiesGeneratedToday=today_count,
            analogiesStoredTotal=total_count,
            upcomingPlan=upcoming_plan,
            planCancelled=user_data.get("plan_cancelled", False),
            subscriptionStartDate=user_data.get("subscription_start_date"),
            stripe_subscription_id=user_data.get("stripe_subscription_id"),

            dailyLimit=daily_limit,
            rateLimitSeconds=rate_limit_seconds
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_user_pricing_stats: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user/{user_id}/create-checkout-session")
async def create_checkout_session(user_id: str, request: CreateCheckoutSessionRequest, authenticated_user_id: str = Depends(get_current_user)):
    """
    Create a Stripe checkout session for upgrading to Scholar plan.
    
    Args:
        user_id (str): The user's ID
        request (CreateCheckoutSessionRequest): Checkout session request data
        authenticated_user_id (str): The authenticated user's ID (must match user_id)
        
    Returns:
        dict: Checkout session URL
    """
    try:
        # Ensure user can only create checkout for their own plan
        if user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        print(f"Creating checkout session for user: {user_id}")
        
        # Get user information
        user_response = supabase_client.table("user_information").select("*").eq("id", user_id).execute()
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_response.data[0]
        
        # Check if user has an existing Stripe customer (from previous subscription)
        stripe_customer_id = None
        if user_data.get('stripe_subscription_id'):
            try:
                # Try to get the customer ID from the existing subscription
                existing_subscription = stripe.Subscription.retrieve(user_data['stripe_subscription_id'])
                stripe_customer_id = existing_subscription.customer
                print(f"Found existing Stripe customer: {stripe_customer_id}")
            except stripe.error.StripeError as e:
                print(f"Could not retrieve existing subscription: {e}")
                # Continue without customer ID - Stripe will create a new customer
        
        # Create Stripe checkout session
        checkout_session_data = {
            'payment_method_types': ['card'],
            'line_items': [{
                'price': SCHOLAR_PRICE_ID,
                'quantity': 1,
            }],
            'mode': 'subscription',
            'success_url': request.success_url,
            'cancel_url': request.cancel_url,
            'metadata': {
                'user_id': user_id,
                'plan': 'scholar'
            },
            'subscription_data': {
                'metadata': {
                    'user_id': user_id,
                    'plan': 'scholar'
                }
            }
        }
        
        # Use existing customer if available, otherwise create new one
        if stripe_customer_id:
            checkout_session_data['customer'] = stripe_customer_id
            print(f"Reusing existing Stripe customer: {stripe_customer_id}")
        else:
            checkout_session_data['customer_email'] = user_data.get('email')
            print(f"Creating new Stripe customer for email: {user_data.get('email')}")
        
        checkout_session = stripe.checkout.Session.create(**checkout_session_data)
        
        print(f"Successfully created checkout session for user: {user_id}")
        
        return {
            "status": "success",
            "checkout_url": checkout_session.url
        }
        
    except stripe.error.StripeError as e:
        print(f"Stripe error in create_checkout_session: {e}")
        raise HTTPException(status_code=400, detail=f"Payment error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in create_checkout_session: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user/{user_id}/upgrade-plan")
async def upgrade_user_plan(user_id: str, request: UpgradePlanRequest, authenticated_user_id: str = Depends(get_current_user)):
    """
    Upgrade user's plan from free to paid (Scholar).
    
    Args:
        user_id (str): The user's ID
        request (UpgradePlanRequest): Upgrade request data
        authenticated_user_id (str): The authenticated user's ID (must match user_id)
        
    Returns:
        dict: Success message
    """
    try:
        # Ensure user can only upgrade their own plan
        if user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        print(f"Upgrading plan for user: {user_id}")
        
        # Update user plan in database (renewal date will be set by Stripe webhook)
        current_time = datetime.now()
        update_response = supabase_client.table("user_information").update({
            "plan": "scholar",
            "subscription_start_date": current_time.isoformat(),
            "upcoming_plan": "scholar",
            "plan_cancelled": False
            # Note: renewal_date will be set by Stripe webhook when subscription is created
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            raise HTTPException(status_code=500, detail="Failed to upgrade plan")
        
        print(f"Successfully upgraded plan for user: {user_id}")
        
        return {
            "status": "success",
            "message": "Successfully upgraded to Scholar plan!"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in upgrade_user_plan: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user/{user_id}/downgrade-plan")
async def downgrade_user_plan(user_id: str, authenticated_user_id: str = Depends(get_current_user)):
    """
    Downgrade user's plan from paid to free (Curious).
    This will cancel the Stripe subscription at the end of the current billing period.
    
    Args:
        user_id (str): The user's ID
        authenticated_user_id (str): The authenticated user's ID (must match user_id)
        
    Returns:
        dict: Success message
    """
    try:
        # Ensure user can only downgrade their own plan
        if user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        print(f"Downgrading plan for user: {user_id}")
        
        # Get user information to find Stripe subscription
        user_response = supabase_client.table("user_information").select("*").eq("id", user_id).execute()
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_response.data[0]
        stripe_subscription_id = user_data.get('stripe_subscription_id')
        
        # Update local database first
        update_response = supabase_client.table("user_information").update({
            "upcoming_plan": "curious",
            "plan_cancelled": True
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            raise HTTPException(status_code=500, detail="Failed to downgrade plan")
        
        # Cancel Stripe subscription at period end if subscription exists
        if stripe_subscription_id:
            try:
                # Cancel the subscription at the end of the current billing period
                stripe.Subscription.modify(
                    stripe_subscription_id,
                    cancel_at_period_end=True
                )
                print(f"Successfully scheduled Stripe subscription cancellation for user: {user_id}")
            except stripe.error.StripeError as e:
                print(f"Stripe error when canceling subscription: {e}")
                # Don't fail the request if Stripe fails, but log it
                # The webhook will handle the sync when Stripe processes the cancellation
        
        print(f"Successfully downgraded plan for user: {user_id}")
        
        return {
            "status": "success",
            "message": "Successfully scheduled downgrade to Curious plan. Your Scholar benefits will continue until your next billing cycle."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in downgrade_user_plan: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events for subscription management.
    
    Args:
        request (Request): FastAPI request object
        
    Returns:
        dict: Success response
    """
    try:
        # Get the raw body
        body = await request.body()
        signature = request.headers.get('stripe-signature')
        
        if not signature:
            raise HTTPException(status_code=400, detail="No signature provided")
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                body, signature, os.getenv('STRIPE_WEBHOOK_SECRET')
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Handle the event
        print(f"Processing webhook event: {event['type']}")
        
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            print(f"Checkout session metadata: {session.get('metadata', {})}")
            await handle_checkout_session_completed(session)
        elif event['type'] == 'customer.subscription.created':
            subscription = event['data']['object']
            print(f"Subscription metadata: {subscription.get('metadata', {})}")
            await handle_subscription_created(subscription)
        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            print(f"Subscription metadata: {subscription.get('metadata', {})}")
            print(f"Subscription status: {subscription.get('status')}")
            print(f"Cancel at period end: {subscription.get('cancel_at_period_end')}")
            await handle_subscription_updated(subscription)
        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            print(f"Subscription metadata: {subscription.get('metadata', {})}")
            await handle_subscription_deleted(subscription)
        elif event['type'] == 'invoice.paid':
            invoice = event['data']['object']
            await handle_invoice_paid(invoice)
        elif event['type'] == 'invoice.payment_failed':
            invoice = event['data']['object']
            await handle_payment_failed(invoice)
        elif event['type'] == 'customer.subscription.trial_will_end':
            subscription = event['data']['object']
            await handle_subscription_trial_will_end(subscription)
        elif event['type'] == 'customer.subscription.paused':
            subscription = event['data']['object']
            await handle_subscription_paused(subscription)
        elif event['type'] == 'customer.subscription.resumed':
            subscription = event['data']['object']
            await handle_subscription_resumed(subscription)
        elif event['type'] == 'invoice.payment_action_required':
            invoice = event['data']['object']
            await handle_payment_action_required(invoice)
        else:
            print(f"Unhandled event type: {event['type']}")
        
        return {"status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in stripe_webhook: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

async def handle_checkout_session_completed(session):
    """Handle successful checkout session completion."""
    try:
        print(f"Full session object: {session}")
        user_id = session['metadata'].get('user_id')
        if not user_id:
            print("No user_id in session metadata")
            print(f"Available metadata keys: {list(session.get('metadata', {}).keys())}")
            return
        
        print(f"Processing successful checkout for user: {user_id}")
        
        # Update user plan in database
        current_time = datetime.now()
        renewal_date = current_time + timedelta(days=30)
        
        # Get subscription details from Stripe to sync renewal date
        subscription_id = session.get('subscription')
        renewal_date = None
        
        if subscription_id:
            try:
                subscription = stripe.Subscription.retrieve(subscription_id)
                print(f"Retrieved subscription: {subscription.id}")
                print(f"Subscription status: {subscription.status}")
                print(f"Subscription current_period_end: {getattr(subscription, 'current_period_end', 'NOT_FOUND')}")
                
                # Get renewal date directly from Stripe
                if hasattr(subscription, 'current_period_end') and subscription.current_period_end:
                    renewal_date = datetime.fromtimestamp(subscription.current_period_end)
                    print(f"Using Stripe renewal date: {renewal_date}")
                else:
                    print(f"Warning: No current_period_end found in Stripe subscription")
            except stripe.error.StripeError as e:
                print(f"Error retrieving subscription from Stripe: {e}")
            except Exception as e:
                print(f"Unexpected error retrieving subscription: {e}")
                print(f"Error type: {type(e)}")
                import traceback
                traceback.print_exc()
        else:
            print("No subscription ID found in session")
        
        # If we couldn't get renewal date from Stripe, use a fallback
        if not renewal_date:
            print("Using fallback renewal date (30 days from now)")
            renewal_date = current_time + timedelta(days=30)
        
        update_response = supabase_client.table("user_information").update({
            "plan": "scholar",
            "subscription_start_date": current_time.isoformat(),
            "renewal_date": renewal_date.strftime("%Y-%m-%d"),
            "upcoming_plan": "scholar",
            "plan_cancelled": False,
            "stripe_subscription_id": subscription_id
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            print(f"Failed to update user plan for user: {user_id}")
            return
        
        print(f"Successfully updated user plan for user: {user_id}")
        
    except Exception as e:
        print(f"Error handling checkout session completed: {e}")

async def handle_subscription_created(subscription):
    """Handle subscription creation."""
    try:
        user_id = subscription['metadata'].get('user_id')
        if not user_id:
            print("No user_id in subscription metadata")
            return
        
        print(f"Processing subscription creation for user: {user_id}")
        
        # Update user plan in database
        current_time = datetime.now()
        renewal_date = current_time + timedelta(days=30)
        
        # Get renewal date directly from Stripe subscription
        renewal_date = None
        if hasattr(subscription, 'current_period_end') and subscription.current_period_end:
            renewal_date = datetime.fromtimestamp(subscription.current_period_end)
            print(f"Using Stripe renewal date: {renewal_date}")
        else:
            print(f"Warning: No current_period_end found in Stripe subscription")
        
        # If we couldn't get renewal date from Stripe, use a fallback
        if not renewal_date:
            print("Using fallback renewal date (30 days from now)")
            renewal_date = current_time + timedelta(days=30)
        
        update_response = supabase_client.table("user_information").update({
            "plan": "scholar",
            "subscription_start_date": current_time.isoformat(),
            "renewal_date": renewal_date.strftime("%Y-%m-%d"),
            "upcoming_plan": "scholar",
            "plan_cancelled": False,
            "stripe_subscription_id": subscription.get('id')
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            print(f"Failed to update user plan for user: {user_id}")
            return
        
        print(f"Successfully updated user plan for user: {user_id}")
        
    except Exception as e:
        print(f"Error handling subscription created: {e}")

async def handle_subscription_updated(subscription):
    """Handle subscription updates."""
    try:
        user_id = subscription['metadata'].get('user_id')
        if not user_id:
            print("No user_id in subscription metadata")
            return
        
        print(f"Processing subscription update for user: {user_id}")
        
        # Check subscription status
        status = subscription.get('status')
        cancel_at_period_end = subscription.get('cancel_at_period_end', False)
        
        print(f"Subscription status: {status}, cancel_at_period_end: {cancel_at_period_end}")
        
        # Check for cancellation at period end FIRST (this is what happens when user cancels via portal)
        if status == 'active' and cancel_at_period_end:
            # Subscription is active but scheduled for cancellation at period end
            # Keep current plan but mark as cancelled - DON'T clear subscription data
            print(f"Subscription cancelled at period end for user: {user_id}")
            print(f"Keeping subscription data for potential resume")
            
            # Get renewal date from Stripe for cancelled subscription
            renewal_date = None
            if hasattr(subscription, 'current_period_end') and subscription.current_period_end:
                renewal_date = datetime.fromtimestamp(subscription.current_period_end)
                print(f"Using Stripe renewal date for cancelled subscription: {renewal_date}")
            
            update_data = {
                "plan": "scholar",
                "upcoming_plan": "curious",
                "plan_cancelled": True
                # Keep stripe_subscription_id so user can resume
            }
            
            # Add renewal date if we got it from Stripe
            if renewal_date:
                update_data["renewal_date"] = renewal_date.strftime("%Y-%m-%d")
            
            update_response = supabase_client.table("user_information").update(update_data).eq("id", user_id).execute()
            
            if update_response.data:
                print(f"Marked subscription as cancelled at period end for user: {user_id}")
                if renewal_date:
                    print(f"Synced renewal date from Stripe: {renewal_date}")
        
        elif status == 'active':
            # Get renewal date from Stripe for active subscription
            renewal_date = None
            if hasattr(subscription, 'current_period_end') and subscription.current_period_end:
                renewal_date = datetime.fromtimestamp(subscription.current_period_end)
                print(f"Using Stripe renewal date for active subscription: {renewal_date}")
            
            # Subscription is active, ensure user has scholar plan and sync renewal date
            update_data = {
                "plan": "scholar",
                "upcoming_plan": "scholar",
                "plan_cancelled": False
            }
            
            # Add renewal date if we got it from Stripe
            if renewal_date:
                update_data["renewal_date"] = renewal_date.strftime("%Y-%m-%d")
            
            update_response = supabase_client.table("user_information").update(update_data).eq("id", user_id).execute()
            
            if update_response.data:
                print(f"Successfully updated user plan to scholar for user: {user_id}")
                if renewal_date:
                    print(f"Synced renewal date from Stripe: {renewal_date}")
        
        elif status == 'canceled' or status == 'unpaid':
            # Subscription is canceled or unpaid, downgrade to curious
            # This happens when Stripe actually ends the subscription
            print(f"Subscription actually ended (canceled/unpaid) for user: {user_id}")
            print(f"Downgrading to curious while preserving customer relationship")
            
            update_response = supabase_client.table("user_information").update({
                "plan": "curious",
                "upcoming_plan": "curious",
                "plan_cancelled": False,
                # KEEP stripe_subscription_id for customer relationship preservation
                "subscription_start_date": None,
                "renewal_date": None
            }).eq("id", user_id).execute()
            
            if update_response.data:
                print(f"Successfully downgraded user plan to curious for user: {user_id}")
        
        elif status == 'past_due':
            # Subscription is past due, keep current plan but flag for attention
            print(f"Subscription past due for user: {user_id}")
            # You might want to send an email notification here
        
        elif status == 'incomplete' or status == 'incomplete_expired':
            # Subscription setup failed, downgrade to curious
            update_response = supabase_client.table("user_information").update({
                "plan": "curious",
                "upcoming_plan": "curious",
                "plan_cancelled": False
            }).eq("id", user_id).execute()
            
            if update_response.data:
                print(f"Successfully downgraded user plan to curious for failed subscription: {user_id}")
        
    except Exception as e:
        print(f"Error handling subscription updated: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()

async def handle_subscription_deleted(subscription):
    """Handle subscription deletion."""
    try:
        user_id = subscription['metadata'].get('user_id')
        if not user_id:
            print("No user_id in subscription metadata")
            return
        
        print(f"Processing subscription deletion for user: {user_id}")
        
        # When subscription is deleted, downgrade user but KEEP stripe_subscription_id
        # This preserves the customer relationship for future resubscriptions
        update_response = supabase_client.table("user_information").update({
            "plan": "curious",
            "upcoming_plan": "curious",
            "plan_cancelled": False,
            # KEEP stripe_subscription_id for customer relationship preservation
            "subscription_start_date": None,
            "renewal_date": None
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            print(f"Failed to update user plan for user: {user_id}")
            return
        
        print(f"Successfully downgraded user to curious plan while preserving customer relationship: {user_id}")
        
    except Exception as e:
        print(f"Error handling subscription deleted: {e}")

async def handle_invoice_paid(invoice):
    """Handle successful invoice payment."""
    try:
        subscription_id = invoice.get('subscription')
        if not subscription_id:
            return
        
        # Get subscription details
        subscription = stripe.Subscription.retrieve(subscription_id)
        user_id = subscription['metadata'].get('user_id')
        
        if not user_id:
            print("No user_id in subscription metadata")
            return
        
        print(f"Processing successful payment for user: {user_id}")
        
        # Get renewal date directly from Stripe for successful payment
        renewal_date = None
        if hasattr(subscription, 'current_period_end') and subscription.current_period_end:
            renewal_date = datetime.fromtimestamp(subscription.current_period_end)
            print(f"Using Stripe renewal date for payment: {renewal_date}")
        else:
            print(f"Warning: No current_period_end found in Stripe subscription")
        
        # If we couldn't get renewal date from Stripe, use a fallback
        if not renewal_date:
            print("Using fallback renewal date (30 days from now)")
            renewal_date = datetime.now() + timedelta(days=30)
        
        update_response = supabase_client.table("user_information").update({
            "renewal_date": renewal_date.strftime("%Y-%m-%d"),
            "plan": "scholar",
            "upcoming_plan": "scholar",
            "plan_cancelled": False
        }).eq("id", user_id).execute()
        
        if update_response.data:
            print(f"Successfully updated renewal date for user: {user_id}")
        
        # You might want to send a confirmation email here
        
    except Exception as e:
        print(f"Error handling invoice paid: {e}")

async def handle_payment_failed(invoice):
    """Handle failed payment."""
    try:
        subscription_id = invoice.get('subscription')
        if not subscription_id:
            return
        
        # Get subscription details
        subscription = stripe.Subscription.retrieve(subscription_id)
        user_id = subscription['metadata'].get('user_id')
        
        if not user_id:
            print("No user_id in subscription metadata")
            return
        
        print(f"Processing payment failure for user: {user_id}")
        
        # Check if this is the final attempt
        attempt_count = invoice.get('attempt_count', 0)
        next_payment_attempt = invoice.get('next_payment_attempt')
        
        if next_payment_attempt is None:
            # Final attempt failed, downgrade user
            update_response = supabase_client.table("user_information").update({
                "plan": "curious",
                "upcoming_plan": "curious",
                "plan_cancelled": False
            }).eq("id", user_id).execute()
            
            if update_response.data:
                print(f"Successfully downgraded user due to payment failure: {user_id}")
        else:
            # Payment failed but will retry
            print(f"Payment failed for user {user_id}, will retry on {next_payment_attempt}")
        
        # You might want to send an email notification here
        
    except Exception as e:
        print(f"Error handling payment failed: {e}")

async def handle_subscription_trial_will_end(subscription):
    """Handle subscription trial ending soon."""
    try:
        user_id = subscription['metadata'].get('user_id')
        if not user_id:
            print("No user_id in subscription metadata")
            return
        
        print(f"Trial ending soon for user: {user_id}")
        # You might want to send an email notification here
        
    except Exception as e:
        print(f"Error handling trial will end: {e}")

async def handle_subscription_paused(subscription):
    """Handle subscription pause."""
    try:
        user_id = subscription['metadata'].get('user_id')
        if not user_id:
            print("No user_id in subscription metadata")
            return
        
        print(f"Subscription paused for user: {user_id}")
        # Update user plan to reflect pause
        update_response = supabase_client.table("user_information").update({
            "plan": "curious",
            "upcoming_plan": "curious",
            "plan_cancelled": False
        }).eq("id", user_id).execute()
        
        if update_response.data:
            print(f"Successfully updated user plan for paused subscription: {user_id}")
        
    except Exception as e:
        print(f"Error handling subscription paused: {e}")

async def handle_subscription_resumed(subscription):
    """Handle subscription resume."""
    try:
        user_id = subscription['metadata'].get('user_id')
        if not user_id:
            print("No user_id in subscription metadata")
            return
        
        print(f"Subscription resumed for user: {user_id}")
        # Update user plan to reflect resume
        update_response = supabase_client.table("user_information").update({
            "plan": "scholar",
            "upcoming_plan": "scholar",
            "plan_cancelled": False
        }).eq("id", user_id).execute()
        
        if update_response.data:
            print(f"Successfully updated user plan for resumed subscription: {user_id}")
        
    except Exception as e:
        print(f"Error handling subscription resumed: {e}")

async def handle_payment_action_required(invoice):
    """Handle payment requiring action (e.g., 3D Secure)."""
    try:
        subscription_id = invoice.get('subscription')
        if not subscription_id:
            return
        
        # Get subscription details
        subscription = stripe.Subscription.retrieve(subscription_id)
        user_id = subscription['metadata'].get('user_id')
        
        if not user_id:
            print("No user_id in subscription metadata")
            return
        
        print(f"Payment action required for user: {user_id}")
        # You might want to send an email notification here
        
    except Exception as e:
        print(f"Error handling payment action required: {e}")

async def sync_renewal_date_from_stripe(user_id: str, subscription_id: str):
    """
    Sync renewal date from Stripe for a given subscription.
    
    Args:
        user_id (str): The user's ID
        subscription_id (str): The Stripe subscription ID
        
    Returns:
        bool: True if sync was successful, False otherwise
    """
    try:
        print(f"Syncing renewal date from Stripe for user: {user_id}")
        
        # Get subscription from Stripe
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        # Get renewal date from Stripe
        renewal_date = None
        if hasattr(subscription, 'current_period_end') and subscription.current_period_end:
            renewal_date = datetime.fromtimestamp(subscription.current_period_end)
            print(f"Retrieved renewal date from Stripe: {renewal_date}")
        else:
            print(f"Warning: No current_period_end found in Stripe subscription")
            return False
        
        # Update database with Stripe renewal date
        update_response = supabase_client.table("user_information").update({
            "renewal_date": renewal_date.strftime("%Y-%m-%d")
        }).eq("id", user_id).execute()
        
        if update_response.data:
            print(f"Successfully synced renewal date from Stripe for user: {user_id}")
            return True
        else:
            print(f"Failed to update renewal date in database for user: {user_id}")
            return False
            
    except stripe.error.StripeError as e:
        print(f"Stripe error syncing renewal date: {e}")
        return False
    except Exception as e:
        print(f"Error syncing renewal date from Stripe: {e}")
        return False

@app.post("/user/{user_id}/create-portal-session")
async def create_portal_session(user_id: str, authenticated_user_id: str = Depends(get_current_user)):
    """
    Create a Stripe customer portal session for subscription management.
    
    Args:
        user_id (str): The user's ID
        authenticated_user_id (str): The authenticated user's ID (must match user_id)
        
    Returns:
        dict: Portal session URL
    """
    try:
        # Ensure user can only create portal for their own account
        if user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        print(f"Creating portal session for user: {user_id}")
        
        # Get user information
        user_response = supabase_client.table("user_information").select("*").eq("id", user_id).execute()
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_response.data[0]
        stripe_subscription_id = user_data.get('stripe_subscription_id')
        
        if not stripe_subscription_id:
            raise HTTPException(status_code=400, detail="No active subscription found")
        
        # Get subscription to find customer
        subscription = stripe.Subscription.retrieve(stripe_subscription_id)
        customer_id = subscription.customer
        
        # Create portal session
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{os.getenv('NEXT_PUBLIC_API_URL', 'http://localhost:3000')}/dashboard/pricing"
        )
        
        print(f"Successfully created portal session for user: {user_id}")
        
        return {
            "status": "success",
            "portal_url": portal_session.url
        }
        
    except stripe.error.StripeError as e:
        print(f"Stripe error in create_portal_session: {e}")
        raise HTTPException(status_code=400, detail=f"Payment error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in create_portal_session: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user/{user_id}/resume-plan")
async def resume_user_plan(user_id: str, authenticated_user_id: str = Depends(get_current_user)):
    """
    Resume user's cancelled plan (clear downgrade schedule).
    
    Args:
        user_id (str): The user's ID
        authenticated_user_id (str): The authenticated user's ID (must match user_id)
        
    Returns:
        dict: Success message
    """
    try:
        # Ensure user can only resume their own plan
        if user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        print(f"Resuming plan for user: {user_id}")
        
        # Get user information to find Stripe subscription
        user_response = supabase_client.table("user_information").select("*").eq("id", user_id).execute()
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_response.data[0]
        stripe_subscription_id = user_data.get('stripe_subscription_id')
        
        if not stripe_subscription_id:
            raise HTTPException(status_code=400, detail="No active subscription found")
        
        # Resume Stripe subscription
        try:
            stripe.Subscription.modify(
                stripe_subscription_id,
                cancel_at_period_end=False
            )
            print(f"Successfully resumed Stripe subscription for user: {user_id}")
        except stripe.error.StripeError as e:
            print(f"Stripe error when resuming subscription: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to resume subscription: {str(e)}")
        
        # Update local database
        update_response = supabase_client.table("user_information").update({
            "upcoming_plan": "scholar",
            "plan_cancelled": False
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            raise HTTPException(status_code=500, detail="Failed to resume plan")
        
        print(f"Successfully resumed plan for user: {user_id}")
        
        return {
            "status": "success",
            "message": "Successfully resumed your Scholar plan!"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in resume_user_plan: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# DEPRECATED: process_scheduled_downgrades function removed
# This functionality is now handled by Stripe webhooks (customer.subscription.updated)
# When a subscription actually ends, Stripe sends the webhook which triggers the downgrade automatically

@app.post("/admin/sync-user-plan/{user_id}")
async def sync_user_plan_from_stripe(user_id: str):
    """
    Manually sync user's plan and renewal date from Stripe.
    
    Args:
        user_id (str): The user's ID
        
    Returns:
        dict: Sync result
    """
    try:
        print(f"Manually syncing user plan from Stripe for user: {user_id}")
        
        # Get user information
        user_response = supabase_client.table("user_information").select("*").eq("id", user_id).execute()
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_response.data[0]
        stripe_subscription_id = user_data.get('stripe_subscription_id')
        
        if not stripe_subscription_id:
            raise HTTPException(status_code=400, detail="No Stripe subscription found for user")
        
        # Get subscription from Stripe
        subscription = stripe.Subscription.retrieve(stripe_subscription_id)
        
        # Determine plan based on subscription status
        status = subscription.status
        plan = "curious"  # default
        plan_cancelled = False
        
        if status == 'active':
            plan = "scholar"
            if subscription.get('cancel_at_period_end'):
                plan_cancelled = True
        elif status in ['canceled', 'unpaid', 'incomplete', 'incomplete_expired']:
            plan = "curious"
        
        # Get renewal date from Stripe
        renewal_date = None
        if hasattr(subscription, 'current_period_end') and subscription.current_period_end:
            renewal_date = datetime.fromtimestamp(subscription.current_period_end)
            print(f"Retrieved renewal date from Stripe: {renewal_date}")
        
        # Update database with Stripe data
        update_data = {
            "plan": plan,
            "plan_cancelled": plan_cancelled,
            "upcoming_plan": "curious" if plan_cancelled else plan
        }
        
        if renewal_date:
            update_data["renewal_date"] = renewal_date.strftime("%Y-%m-%d")
        
        update_response = supabase_client.table("user_information").update(update_data).eq("id", user_id).execute()
        
        if not update_response.data:
            raise HTTPException(status_code=500, detail="Failed to update user data")
        
        return {
            "status": "success",
            "message": f"Successfully synced user plan from Stripe",
            "plan": plan,
            "plan_cancelled": plan_cancelled,
            "renewal_date": renewal_date.strftime("%Y-%m-%d") if renewal_date else None,
            "stripe_status": status
        }
        
    except HTTPException:
        raise
    except stripe.error.StripeError as e:
        print(f"Stripe error in sync_user_plan_from_stripe: {e}")
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        print(f"Error in sync_user_plan_from_stripe: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/sync-renewal-date/{user_id}")
async def sync_renewal_date_manual(user_id: str):
    """
    Manually sync renewal date from Stripe for a user.
    
    Args:
        user_id (str): The user's ID
        
    Returns:
        dict: Sync result
    """
    try:
        print(f"Manually syncing renewal date from Stripe for user: {user_id}")
        
        # Get user information
        user_response = supabase_client.table("user_information").select("*").eq("id", user_id).execute()
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_response.data[0]
        stripe_subscription_id = user_data.get('stripe_subscription_id')
        
        if not stripe_subscription_id:
            raise HTTPException(status_code=400, detail="No Stripe subscription found for user")
        
        # Sync renewal date from Stripe
        success = await sync_renewal_date_from_stripe(user_id, stripe_subscription_id)
        
        if success:
            return {
                "status": "success",
                "message": "Successfully synced renewal date from Stripe"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to sync renewal date from Stripe")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in sync_renewal_date_manual: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    """
    Manually sync a user's plan status from Stripe.
    This is useful for debugging and fixing sync issues.
    
    Args:
        user_id (str): The user's ID to sync
        
    Returns:
        dict: Sync results
    """
    try:
        print(f"Manually syncing plan for user: {user_id}")
        
        # Get user information
        user_response = supabase_client.table("user_information").select("*").eq("id", user_id).execute()
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_response.data[0]
        stripe_subscription_id = user_data.get('stripe_subscription_id')
        
        if not stripe_subscription_id:
            return {
                "status": "success",
                "message": "User has no Stripe subscription",
                "plan": user_data.get("plan", "curious")
            }
        
        # Get subscription from Stripe
        try:
            subscription = stripe.Subscription.retrieve(stripe_subscription_id)
            
            # Update local database based on Stripe status
            if subscription.status == 'active':
                if subscription.cancel_at_period_end:
                    # Active but cancelling at period end
                    update_data = {
                        "plan": "scholar",
                        "upcoming_plan": "curious",
                        "plan_cancelled": True
                    }
                else:
                    # Fully active
                    update_data = {
                        "plan": "scholar",
                        "upcoming_plan": "scholar",
                        "plan_cancelled": False
                    }
            elif subscription.status == 'canceled':
                # Fully cancelled
                update_data = {
                    "plan": "curious",
                    "upcoming_plan": "curious",
                    "plan_cancelled": False,
                    "stripe_subscription_id": None
                }
            else:
                # Other statuses (past_due, incomplete, etc.)
                update_data = {
                    "plan": "curious",
                    "upcoming_plan": "curious",
                    "plan_cancelled": False
                }
            
            # Update database
            update_response = supabase_client.table("user_information").update(update_data).eq("id", user_id).execute()
            
            if update_response.data:
                print(f"Successfully synced plan for user: {user_id}")
                return {
                    "status": "success",
                    "message": f"Successfully synced plan from Stripe",
                    "stripe_status": subscription.status,
                    "cancel_at_period_end": subscription.cancel_at_period_end,
                    "local_plan": update_data.get("plan")
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to update database")
                
        except stripe.error.StripeError as e:
            print(f"Stripe error when syncing user {user_id}: {e}")
            raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in sync_user_plan_from_stripe: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/process-billing-cycle-renewals")
async def process_billing_cycle_renewals():
    """
    Sync renewal dates from Stripe for users whose renewal dates have passed.
    This endpoint should be called by a cron job daily to sync renewal dates from Stripe.
    
    Returns:
        dict: Processing results
    """
    try:
        print("Processing billing cycle renewals...")
        
        # Get current date
        current_date = datetime.now().date()
        
        # Find active Scholar plans that need renewal
        users_response = supabase_client.table("user_information").select(
            "id, plan, subscription_start_date, renewal_date, upcoming_plan, plan_cancelled"
        ).eq("plan", "scholar").eq("plan_cancelled", False).execute()
        
        if not users_response.data:
            print("No active Scholar plans found")
            return {"processed": 0, "message": "No active Scholar plans found"}
        
        processed_count = 0
        
        for user in users_response.data:
            if not user.get("renewal_date"):
                continue
                
            # Check if renewal date has passed
            renewal_date = datetime.strptime(user["renewal_date"], "%Y-%m-%d").date()
            if renewal_date <= current_date:
                print(f"Processing renewal for user {user['id']}")
                
                # Get subscription from Stripe to sync renewal date
                stripe_subscription_id = user.get('stripe_subscription_id')
                if stripe_subscription_id:
                    try:
                        # Sync renewal date from Stripe
                        success = await sync_renewal_date_from_stripe(user["id"], stripe_subscription_id)
                        if success:
                            processed_count += 1
                            print(f"Successfully synced renewal date from Stripe for user {user['id']}")
                        else:
                            print(f"Failed to sync renewal date from Stripe for user {user['id']}")
                    except Exception as e:
                        print(f"Error syncing renewal date for user {user['id']}: {e}")
                else:
                    print(f"No Stripe subscription found for user {user['id']}, skipping renewal sync")
        
        print(f"Processed {processed_count} billing cycle renewals")
        return {
            "processed": processed_count,
            "message": f"Successfully processed {processed_count} billing cycle renewals"
        }
        
    except Exception as e:
        print(f"Error in process_billing_cycle_renewals: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/test/set-user-plan-state")
async def set_user_plan_state_for_testing(
    user_id: str,
    plan: str,
    subscription_start_date: str = None,
    renewal_date: str = None,
    upcoming_plan: str = None,
    plan_cancelled: bool = False
):
    """
    Admin endpoint to set user plan state for testing purposes.
    This should only be used in development/testing environments.
    
    Args:
        user_id (str): The user's ID
        plan (str): "curious" or "scholar"
        subscription_start_date (str): ISO format date string
        renewal_date (str): YYYY-MM-DD format date string
        upcoming_plan (str): "curious" or None
        plan_cancelled (bool): Whether plan is cancelled
        
    Returns:
        dict: Success message
    """
    try:
        print(f"Setting plan state for testing - User: {user_id}, Plan: {plan}")
        
        # Validate inputs
        if plan not in ["curious", "scholar"]:
            raise HTTPException(status_code=400, detail="Plan must be 'curious' or 'scholar'")
        
        if upcoming_plan and upcoming_plan not in ["curious", "scholar", None]:
            raise HTTPException(status_code=400, detail="Upcoming plan must be 'curious', 'scholar', or None")
        
        # Prepare update data
        update_data = {
            "plan": plan,
            "upcoming_plan": upcoming_plan,
            "plan_cancelled": plan_cancelled
        }
        
        # Add dates if provided
        if subscription_start_date:
            update_data["subscription_start_date"] = subscription_start_date
        else:
            update_data["subscription_start_date"] = None
            
        if renewal_date:
            update_data["renewal_date"] = renewal_date
        else:
            update_data["renewal_date"] = None
        
        # Update user plan state
        update_response = supabase_client.table("user_information").update(update_data).eq("id", user_id).execute()
        
        if not update_response.data:
            raise HTTPException(status_code=500, detail="Failed to update user plan state")
        
        print(f"Successfully set plan state for user {user_id}")
        
        return {
            "status": "success",
            "message": f"Successfully set plan state for user {user_id}",
            "plan_state": update_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in set_user_plan_state_for_testing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/test/simulate-date")
async def simulate_date_for_testing(target_date: str):
    """
    Admin endpoint to simulate a specific date for testing purposes.
    This allows testing of renewal and downgrade logic with different dates.
    
    Args:
        target_date (str): YYYY-MM-DD format date string to simulate
        
    Returns:
        dict: Processing results
    """
    try:
        print(f"Simulating date: {target_date}")
        
        # Validate date format
        try:
            simulated_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Process billing cycle renewals for the simulated date
        users_response = supabase_client.table("user_information").select(
            "id, plan, subscription_start_date, renewal_date, upcoming_plan, plan_cancelled"
        ).eq("plan", "scholar").eq("plan_cancelled", False).execute()
        
        renewal_count = 0
        if users_response.data:
            for user in users_response.data:
                if user.get("renewal_date"):
                    renewal_date = datetime.strptime(user["renewal_date"], "%Y-%m-%d").date()
                    if renewal_date <= simulated_date:
                        # Calculate new billing cycle dates
                        new_subscription_start = renewal_date
                        new_renewal_date = new_subscription_start + timedelta(days=30)
                        
                        # Update subscription dates
                        update_response = supabase_client.table("user_information").update({
                            "subscription_start_date": new_subscription_start.isoformat(),
                            "renewal_date": new_renewal_date.strftime("%Y-%m-%d")
                        }).eq("id", user["id"]).execute()
                        
                        if update_response.data:
                            renewal_count += 1
        
        # Process scheduled downgrades for the simulated date
        users_response = supabase_client.table("user_information").select(
            "id, plan, subscription_start_date, renewal_date, upcoming_plan, plan_cancelled"
        ).eq("plan_cancelled", True).execute()
        
        downgrade_count = 0
        if users_response.data:
            for user in users_response.data:
                if user.get("renewal_date"):
                    renewal_date = datetime.strptime(user["renewal_date"], "%Y-%m-%d").date()
                    if renewal_date <= simulated_date:
                        # Downgrade the user
                        update_response = supabase_client.table("user_information").update({
                            "plan": "free",
                            "subscription_start_date": None,
                            "renewal_date": None,
                            "upcoming_plan": None,
                            "plan_cancelled": False
                        }).eq("id", user["id"]).execute()
                        
                        if update_response.data:
                            downgrade_count += 1
        
        return {
            "status": "success",
            "message": f"Simulated date {target_date}",
            "renewals_processed": renewal_count,
            "downgrades_processed": downgrade_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in simulate_date_for_testing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/test/get-user-plan-state/{user_id}")
async def get_user_plan_state_for_testing(user_id: str):
    """
    Admin endpoint to get user plan state for testing purposes.
    
    Args:
        user_id (str): The user's ID
        
    Returns:
        dict: User's current plan state
    """
    try:
        print(f"Getting plan state for testing - User: {user_id}")
        
        user_response = supabase_client.table("user_information").select(
            "id, plan, subscription_start_date, renewal_date, upcoming_plan, plan_cancelled"
        ).eq("id", user_id).single().execute()
        
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_response.data
        
        return {
            "status": "success",
            "user_id": user_id,
            "plan_state": {
                "plan": user_data.get("plan"),
                "subscription_start_date": user_data.get("subscription_start_date"),
                "renewal_date": user_data.get("renewal_date"),
                "upcoming_plan": user_data.get("upcoming_plan"),
                "plan_cancelled": user_data.get("plan_cancelled", False)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_user_plan_state_for_testing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/debug/daily-count/{user_id}")
async def debug_daily_count(user_id: str):
    """
    Debug endpoint to check a user's daily count and reset date.
    """
    try:
        user_response = supabase_client.table("user_information").select(
            "daily_analogies_generated", "daily_reset_date", "plan"
        ).eq("id", user_id).single().execute()
        
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_response.data
        current_date = datetime.now().date()
        
        return {
            "user_id": user_id,
            "daily_analogies_generated": user_data.get("daily_analogies_generated", 0),
            "daily_reset_date": user_data.get("daily_reset_date"),
            "current_date": current_date.isoformat(),
            "plan": user_data.get("plan"),
            "should_reset": should_reset_daily_count(user_data.get("daily_reset_date"), current_date)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/admin/debug/reset-daily-count/{user_id}")
async def reset_daily_count_manual(user_id: str):
    """
    Manual endpoint to reset a user's daily count for testing.
    """
    try:
        current_date = datetime.now().date()
        
        reset_response = supabase_client.table("user_information").update({
            "daily_reset_date": current_date.isoformat(),
            "daily_analogies_generated": 0
        }).eq("id", user_id).execute()
        
        if not reset_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "message": "Daily count reset successfully",
            "user_id": user_id,
            "new_reset_date": current_date.isoformat(),
            "new_daily_count": 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
    """
    Debug endpoint to check daily count status for a user.
    """
    try:
        # Get user's current data
        user_response = supabase_client.table("user_information").select(
            "plan, daily_analogies_generated, last_analogy_time, daily_reset_date, lifetime_analogies_generated"
        ).eq("id", user_id).single().execute()
        
        if not user_response.data:
            return {"error": "User not found"}
        
        user_data = user_response.data
        current_plan = user_data.get("plan", "curious")
        
        # Define limits based on plan
        if current_plan == "curious":
            daily_limit = 20
            rate_limit_seconds = 60
        elif current_plan == "scholar":
            daily_limit = 100
            rate_limit_seconds = 12
        else:
            daily_limit = 20
            rate_limit_seconds = 60
        
        # Get current date in UTC
        current_date_utc = datetime.utcnow().date()
        current_daily_count = user_data.get("daily_analogies_generated", 0) or 0
        
        return {
            "user_id": user_id,
            "plan": current_plan,
            "daily_limit": daily_limit,
            "current_daily_count": current_daily_count,
            "daily_reset_date": user_data.get("daily_reset_date"),
            "last_analogy_time": user_data.get("last_analogy_time"),
            "lifetime_analogies_generated": user_data.get("lifetime_analogies_generated", 0),
            "current_date_utc": current_date_utc.isoformat(),
            "daily_reset_date_parsed": user_data.get("daily_reset_date"),
            "needs_reset": user_data.get("daily_reset_date") != current_date_utc.isoformat(),
            "limit_exceeded": current_daily_count >= daily_limit,
            "rate_limit_seconds": rate_limit_seconds,
            "debug_info": {
                "comparison": f"{current_daily_count} >= {daily_limit} = {current_daily_count >= daily_limit}",
                "plan_detected": current_plan,
                "raw_daily_count": user_data.get("daily_analogies_generated"),
                "raw_plan": user_data.get("plan")
            }
        }
        
    except Exception as e:
        return {"error": str(e)}

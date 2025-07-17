from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
import requests
import asyncio
import httpx
import uuid
import time
import traceback
import json
import re
from datetime import datetime, date, timezone, timedelta
from dotenv import load_dotenv
import google.generativeai as genai
import supabase
from supabase import create_client, Client

from utils.prompts import ANALOGY_PROMPT, COMIC_STYLE_PREFIX
from utils.helpers import extract_raw_json, generate_image_replicate, check_image_exists

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PRIVATE_KEY")
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Negative Prompt for Replicate SDXL Generations
NEGATIVE_PROMPT = "text, captions, speech bubbles, watermark, low detail, blurry, duplicate face, extra limbs, extra fingers"

# Initialize FastAPI app
app = FastAPI(title="Analogous API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# In-memory storage for analogies (replace with database in production)
# analogies_db = {}  # Removed - now using Supabase table

# Set up the Gemini model
model = genai.GenerativeModel('gemini-2.0-flash')

active_requests = {}

async def generate_analogy_with_httpx(prompt: str, topic: str, audience: str, timeout: float = 30.0, request_id: str = None):
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    brave_api_key = os.getenv("BRAVE_API_KEY")

    if not gemini_api_key or not brave_api_key:
        raise Exception("Missing GEMINI_API_KEY or BRAVE_API_KEY in environment variables")

    gemini_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"

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

def validate_and_update_user_streak(user_id: str):
    """
    Validate the user's current streak and update it if broken.
    This function should be called whenever streak information is queried.
    
    Args:
        user_id (str): The user's ID
        
    Returns:
        dict: Updated streak information, or None if user not found
    """
    try:
        print(f"Validating streak for user: {user_id}")
        
        # Get current date in UTC
        current_date = datetime.now(timezone.utc).date()
        
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
        
        # Convert last_streak_date to date object if it's a string
        if isinstance(last_streak_date, str):
            try:
                last_streak_date = datetime.fromisoformat(last_streak_date.replace('Z', '+00:00')).date()
            except ValueError:
                last_streak_date = None
        
        # Check if streak is broken (more than 1 day since last analogy)
        streak_broken = False
        days_since_last_analogy = 0
        
        if last_streak_date:
            days_since_last_analogy = (current_date - last_streak_date).days
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

def update_user_streak(user_id: str, analogy_id: str = None):
    """
    Update the user's daily streak when they generate an analogy.
    
    Args:
        user_id (str): The user's ID
        analogy_id (str, optional): The ID of the analogy that triggered this streak update
        
    Returns:
        dict: Updated streak information
    """
    try:
        print(f"Updating streak for user: {user_id}, analogy_id: {analogy_id}")
        
        # Get current date in UTC - this should match what we store in the database
        current_date = datetime.now(timezone.utc).date()
        current_timestamp = datetime.now(timezone.utc)
        
        print(f"Current UTC date: {current_date}")
        print(f"Current UTC timestamp: {current_timestamp}")
        
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
                last_streak_date = datetime.fromisoformat(last_streak_date.replace('Z', '+00:00')).date()
            except ValueError:
                last_streak_date = None
        
        # Determine new streak count
        new_streak_count = 1  # Default to 1 for new streak
        
        if last_streak_date:
            if last_streak_date == current_date:
                # User already generated an analogy today, keep current streak
                new_streak_count = current_streak
                print(f"User already generated analogy today, keeping streak at: {new_streak_count}")
            elif last_streak_date == current_date - timedelta(days=1):
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
        
        # Update user information in Supabase
        update_response = supabase_client.table("user_information").update({
            "current_streak_count": new_streak_count,
            "longest_streak_count": new_longest_streak,
            "last_streak_date": current_date.isoformat(),
            "last_analogy_time": current_timestamp.isoformat()
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            print(f"Failed to update streak for user: {user_id}")
            return None
            
        print(f"Successfully updated streak for user {user_id}: current={new_streak_count}, longest={new_longest_streak}")
        
        # Insert a streak log entry for today's date
        print(f"About to insert streak log for date: {current_date}")
        insert_streak_log(user_id, current_date, analogy_id)

        return {
            "current_streak_count": new_streak_count,
            "longest_streak_count": new_longest_streak,
            "last_streak_date": current_date.isoformat(),
            "last_analogy_time": current_timestamp.isoformat()
        }
        
    except Exception as e:
        print(f"Error updating user streak: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        return None

def insert_streak_log(user_id: str, log_date: date, analogy_id: str = None):
    """
    Insert a streak log entry for a specific user and date.
    This function respects the unique_user_day constraint.
    
    Args:
        user_id (str): The user's ID
        log_date (date): The date to log
        analogy_id (str, optional): The ID of the analogy that triggered this streak log
        
    Returns:
        bool: True if successfully inserted, False if already exists
    """
    try:
        print(f"Inserting streak log for user: {user_id}, date: {log_date}, analogy_id: {analogy_id}")
        print(f"Date type: {type(log_date)}, Date value: {log_date}")
        
        # Prepare the data to insert
        log_data = {
            "user_id": user_id,
            "date": log_date.isoformat(),
        }
        
        # Add analogy_id if provided
        if analogy_id:
            log_data["analogy_id"] = analogy_id
        
        # Insert streak log entry
        insert_response = supabase_client.table("streak_logs").insert(log_data).execute()
        
        if insert_response.data:
            print(f"Successfully inserted streak log for user {user_id}, date {log_date}, analogy_id {analogy_id}")
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
    user_id: str  # Made required since we need it for the database

class GenerateAnalogyResponse(BaseModel):
    status: str
    analogy: dict
    id: str
    analogy_images: list[str]
    topic: str
    audience: str
    created_at: str
    streak_popup_shown: bool

class GetAnalogyResponse(BaseModel):
    status: str
    id: str
    analogy: dict
    analogy_images: list[str]
    topic: str
    audience: str
    created_at: str
    streak_popup_shown: bool

class SignUpRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    opt_in_email_marketing: bool
        
@app.get("/")
async def home():
    return {"status": "ok", "message": "Analogous API is running"}

@app.post("/signup")
def sign_up_user(payload: SignUpRequest):
    response = supabase_client.auth.sign_up({
        "email": payload.email,
        "password": payload.password,
    })

    if response.user is None:
        raise HTTPException(status_code=400, detail="Failed to create user account")

    user_id = response.user.id

    stripped_email = payload.email.strip()
    capitalized_first_name = payload.first_name.strip().capitalize()
    capitalized_last_name = payload.last_name.strip().capitalize()

    try:
        insert_response = supabase_client.table("user_information").insert({
            "id": user_id,
            "email": stripped_email,
            "first_name": capitalized_first_name,
            "last_name": capitalized_last_name,
            "onboarding_complete": False,
            "plan": "free",
            "opt_in_email_marketing": payload.opt_in_email_marketing,
            "current_streak_count": 0,
            "longest_streak_count": 0,
            "last_streak_date": None,
            "last_analogy_time": None,
            "streak_reset_acknowledged": True,  # New users don't need to see reset notification
        }).execute()

        if not insert_response.data:
            raise HTTPException(status_code=500, detail="Insert into user_information failed or returned no data")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase insert error: {str(e)}")

    return {"message": "User created successfully"}

@app.post("/generate-analogy", response_model=GenerateAnalogyResponse)
async def generate_analogy(request: GenerateAnalogyRequest):
    try:
        topic = request.topic
        audience = request.audience
        user_id = request.user_id
        user_first_name = supabase_client.table("user_information").select("first_name").eq("id", user_id).single().execute().data.get("first_name")

        if not topic or not audience:
            raise HTTPException(status_code=400, detail="Both topic and audience are required")

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

        image_prompts = [
            analogy_json["imagePrompt1"],
            analogy_json["imagePrompt2"],
            analogy_json["imagePrompt3"]
        ]

        # Generate images with timeout and cancellation support
        try:
            image_urls = await asyncio.gather(
                generate_image_replicate(image_prompts[0], 0, NEGATIVE_PROMPT, timeout=20.0),
                generate_image_replicate(image_prompts[1], 1, NEGATIVE_PROMPT, timeout=20.0),
                generate_image_replicate(image_prompts[2], 2, NEGATIVE_PROMPT, timeout=20.0)
            )
            
            # Verify that all images exist, use fallbacks if not
            verified_image_urls = []
            for i, image_url in enumerate(image_urls):
                verified_url = check_image_exists(image_url, i)
                verified_image_urls.append(verified_url)
                if verified_url != image_url:
                    print(f"Image {i} not found, using fallback: {verified_url}")
            
            image_urls = verified_image_urls
            
        except Exception as e:
            print(f"Error generating images: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate images")

        # Check if this analogy will update the streak before saving
        will_update_streak = False
        try:
            # Get current user streak info to check if this analogy will update the streak
            user_response = supabase_client.table("user_information").select(
                "current_streak_count, longest_streak_count, last_streak_date"
            ).eq("id", user_id).single().execute()
            
            if user_response.data:
                user_data = user_response.data
                current_streak = user_data.get("current_streak_count", 0) or 0
                last_streak_date = user_data.get("last_streak_date")
                
                # Convert last_streak_date to date object if it's a string
                if isinstance(last_streak_date, str):
                    try:
                        last_streak_date = datetime.fromisoformat(last_streak_date.replace('Z', '+00:00')).date()
                    except ValueError:
                        last_streak_date = None
                
                current_date = datetime.now(timezone.utc).date()
                
                # Determine if this analogy will update the streak
                if last_streak_date:
                    if last_streak_date == current_date:
                        # User already generated an analogy today, won't update streak
                        will_update_streak = False
                    elif last_streak_date == current_date - timedelta(days=1):
                        # User generated analogy yesterday, will increment streak
                        will_update_streak = True
                    else:
                        # User missed a day or more, will reset to 1
                        will_update_streak = True
                else:
                    # First time generating an analogy, will set streak to 1
                    will_update_streak = True
        except Exception as e:
            print(f"Error checking streak update: {e}")
            # Default to False if we can't determine
            will_update_streak = False

        # Supabase analogies table
        try:
            print("reached here and now trying to save analogy to supabase")
            start_time = time.time()
            insert_response = supabase_client.table("analogies").insert({
                "id": analogy_id,
                "user_id": user_id,
                "topic": topic,
                "audience": audience,
                "analogy_json": analogy_json,  # Fixed field name to match schema
                "image_urls": list(image_urls),  # Fixed field name to match schema
                "created_at": created_at,
                "streak_popup_shown": not will_update_streak,  # True if won't update streak, False if will update
            }).execute()
            end_time = time.time()
            print(f"Time taken to save analogy to supabase: {end_time - start_time} seconds")
            if not insert_response.data:
                raise HTTPException(status_code=500, detail="Insert into analogies failed or returned no data")

        except Exception as e:
            print(f"Supabase analogies insert error: {e}")
            raise HTTPException(status_code=500, detail=f"Supabase analogies insert error: {str(e)}")

        # Update user streak after successfully saving the analogy
        try:
            print("Updating user streak after successful analogy generation")
            streak_update = update_user_streak(user_id, analogy_id)
            if streak_update:
                print(f"Streak updated successfully: {streak_update}")
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

        return GenerateAnalogyResponse(
            status="success",
            id=analogy_id,
            analogy=analogy_json,
            analogy_images=list(image_urls),
            topic=topic,
            audience=audience,
            created_at=created_at,
            streak_popup_shown=not will_update_streak  # Show popup only if this analogy updates the streak
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

        # Verify that all images exist, use fallbacks if not
        image_urls = analogy_data["image_urls"]
        verified_image_urls = []
        for i, image_url in enumerate(image_urls):
            verified_url = check_image_exists(image_url, i)
            verified_image_urls.append(verified_url)
            if verified_url != image_url:
                print(f"Image {i} not found for analogy {analogy_id}, using fallback: {verified_url}")

        print("reached here and now trying to send back the response")
        return GetAnalogyResponse(
            status="success",
            analogy=analogy_json,  # Now guaranteed to be a dict
            id=analogy_data["id"],
            analogy_images=verified_image_urls,
            topic=analogy_data["topic"],
            audience=analogy_data["audience"],
            created_at=analogy_data["created_at"],
            streak_popup_shown=analogy_data.get("streak_popup_shown", True)  # Default to True if field doesn't exist
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

            # Verify that all images exist, use fallbacks if not
            image_urls = analogy_data["image_urls"]
            verified_image_urls = []
            for i, image_url in enumerate(image_urls):
                verified_url = check_image_exists(image_url, i)
                verified_image_urls.append(verified_url)
                if verified_url != image_url:
                    print(f"Image {i} not found for analogy {analogy_data.get('id', 'no-id')}, using fallback: {verified_url}")

            # Structure the analogy data to match frontend expectations
            analogy = {
                "id": analogy_data["id"],
                "topic": analogy_data["topic"],
                "audience": analogy_data["audience"],
                "analogy_json": analogy_json,
                "image_urls": verified_image_urls,
                "created_at": analogy_data["created_at"]
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

@app.delete("/analogy/{analogy_id}")
async def delete_analogy(analogy_id: str):
    try:
        print(f"Deleting analogy: {analogy_id}")
        
        # First check if the analogy exists
        result = supabase_client.table("analogies").select("id, user_id").eq("id", analogy_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Analogy not found")
        
        # Delete the analogy from Supabase
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
async def regenerate_analogy(analogy_id: str):
    try:
        print(f"Regenerating analogy: {analogy_id}")
        
        # First get the existing analogy to extract topic and audience
        result = supabase_client.table("analogies").select("*").eq("id", analogy_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Original analogy not found")
        
        original_analogy = result.data
        topic = original_analogy["topic"]
        audience = original_analogy["audience"]
        user_id = original_analogy["user_id"]
        
        print(f"Regenerating for topic: {topic}, audience: {audience}, user: {user_id}")
        
        # Generate new analogy using the same topic and audience
        user_first_name = "ignore name if seeing this"
        user_info = ""
        
        prompt = ANALOGY_PROMPT.format(topic=topic, audience=audience, user_first_name=user_first_name, user_info=user_info, COMIC_STYLE_PREFIX=COMIC_STYLE_PREFIX)
        print(f"Regeneration prompt: {prompt}")
        
        # Generate a unique request ID for tracking
        request_id = str(uuid.uuid4())
        
        # Generate analogy with timeout and cancellation support
        try:
            start_time = time.time()
            
            # Use httpx for cancellable Gemini API calls
            response_text = await generate_analogy_with_httpx(prompt, timeout=30.0, request_id=request_id)
            
            print(f"Regeneration response: {response_text}")
            end_time = time.time()
            print(f"Time taken to regenerate response: {end_time - start_time} seconds")
            analogy_json = extract_raw_json(response_text)
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

        image_prompts = [
            analogy_json["imagePrompt1"],
            analogy_json["imagePrompt2"],
            analogy_json["imagePrompt3"]
        ]

        # Generate images with timeout and cancellation support
        try:
            image_urls = await asyncio.gather(
                generate_image_replicate(image_prompts[0], 0, NEGATIVE_PROMPT, timeout=20.0),
                generate_image_replicate(image_prompts[1], 1, NEGATIVE_PROMPT, timeout=20.0),
                generate_image_replicate(image_prompts[2], 2, NEGATIVE_PROMPT, timeout=20.0)
            )
            
            # Verify that all images exist, use fallbacks if not
            verified_image_urls = []
            for i, image_url in enumerate(image_urls):
                verified_url = check_image_exists(image_url, i)
                verified_image_urls.append(verified_url)
                if verified_url != image_url:
                    print(f"Image {i} not found, using fallback: {verified_url}")
            
            image_urls = verified_image_urls
            
        except Exception as e:
            print(f"Error generating images: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate images")

        # Check if this regenerated analogy will update the streak before saving
        will_update_streak = False
        try:
            # Get current user streak info to check if this analogy will update the streak
            user_response = supabase_client.table("user_information").select(
                "current_streak_count, longest_streak_count, last_streak_date"
            ).eq("id", user_id).single().execute()
            
            if user_response.data:
                user_data = user_response.data
                current_streak = user_data.get("current_streak_count", 0) or 0
                last_streak_date = user_data.get("last_streak_date")
                
                # Convert last_streak_date to date object if it's a string
                if isinstance(last_streak_date, str):
                    try:
                        last_streak_date = datetime.fromisoformat(last_streak_date.replace('Z', '+00:00')).date()
                    except ValueError:
                        last_streak_date = None
                
                current_date = datetime.now(timezone.utc).date()
                
                # Determine if this analogy will update the streak
                if last_streak_date:
                    if last_streak_date == current_date:
                        # User already generated an analogy today, won't update streak
                        will_update_streak = False
                    elif last_streak_date == current_date - timedelta(days=1):
                        # User generated analogy yesterday, will increment streak
                        will_update_streak = True
                    else:
                        # User missed a day or more, will reset to 1
                        will_update_streak = True
                else:
                    # First time generating an analogy, will set streak to 1
                    will_update_streak = True
        except Exception as e:
            print(f"Error checking streak update: {e}")
            # Default to False if we can't determine
            will_update_streak = False

        # Save new analogy to Supabase
        try:
            print("Saving regenerated analogy to supabase")
            start_time = time.time()
            insert_response = supabase_client.table("analogies").insert({
                "id": new_analogy_id,
                "user_id": user_id,
                "topic": topic,
                "audience": audience,
                "analogy_json": analogy_json,
                "image_urls": list(image_urls),
                "created_at": created_at,
                "streak_popup_shown": not will_update_streak,  # Show popup only if this analogy updates the streak
            }).execute()
            end_time = time.time()
            print(f"Time taken to save regenerated analogy to supabase: {end_time - start_time} seconds")
            if not insert_response.data:
                raise HTTPException(status_code=500, detail="Insert into analogies failed or returned no data")

        except Exception as e:
            print(f"Supabase analogies insert error: {e}")
            raise HTTPException(status_code=500, detail=f"Supabase analogies insert error: {str(e)}")

        # Update user streak after successfully saving the analogy
        try:
            print("Updating user streak after successful analogy regeneration")
            streak_update = update_user_streak(user_id, new_analogy_id)
            if streak_update:
                print(f"Streak updated successfully: {streak_update}")
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

        return GenerateAnalogyResponse(
            status="success",
            id=new_analogy_id,
            analogy=analogy_json,
            analogy_images=list(image_urls),
            topic=topic,
            audience=audience,
            created_at=created_at,
            streak_popup_shown=not will_update_streak  # Show popup only if this analogy updates the streak
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in regenerate_analogy: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/user/{user_id}/streak")
async def get_user_streak(user_id: str):
    """
    Get the current streak information for a user.
    This endpoint automatically validates and resets broken streaks.
    
    Args:
        user_id (str): The user's ID
        
    Returns:
        dict: User's streak information
    """
    try:
        print(f"Fetching streak info for user: {user_id}")
        
        # Validate and potentially update the user's streak
        streak_data = validate_and_update_user_streak(user_id)
        
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
async def get_user_streak_logs(user_id: str, year: int = None, month: int = None):
    """
    Get streak logs for a user, optionally scoped to a specific month.
    
    Args:
        user_id (str): The user's ID
        year (int, optional): Year to filter by (defaults to current year)
        month (int, optional): Month to filter by (defaults to current month)
        
    Returns:
        dict: List of streak log dates
    """
    try:
        print(f"Fetching streak logs for user: {user_id}, year: {year}, month: {month}")
        
        # If year and month are not provided, use current date in UTC
        if year is None or month is None:
            current_date = datetime.now(timezone.utc)
            year = year or current_date.year
            month = month or current_date.month
        
        # Calculate first and last day of the month
        first_day = date(year, month, 1)
        if month == 12:
            last_day = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = date(year, month + 1, 1) - timedelta(days=1)
        
        print(f"Fetching streak logs from {first_day} to {last_day}")
        
        # Fetch streak logs for the specified month
        result = supabase_client.table("streak_logs").select("date").eq("user_id", user_id).gte("date", first_day.isoformat()).lte("date", last_day.isoformat()).execute()
        
        if not result.data:
            print(f"No streak logs found for user {user_id} in {year}-{month}")
            return {
                "status": "success",
                "streak_logs": [],
                "year": year,
                "month": month
            }
        
        # Extract dates from the result
        streak_dates = [log["date"] for log in result.data]
        print(f"Found {len(streak_dates)} streak logs for user {user_id} in {year}-{month}")
        print(f"Streak dates: {streak_dates}")
        
        # Debug: Check if any dates are in the wrong timezone
        current_utc = datetime.now(timezone.utc).date()
        print(f"Current UTC date: {current_utc}")
        for date_str in streak_dates:
            parsed_date = datetime.fromisoformat(date_str).date()
            print(f"Parsed date {date_str} -> {parsed_date}, matches current: {parsed_date == current_utc}")
        
        return {
            "status": "success",
            "streak_logs": streak_dates,
            "year": year,
            "month": month
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

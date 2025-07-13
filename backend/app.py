from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
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
from utils.helpers import extract_raw_json, generate_image_stability

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PRIVATE_KEY")
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Negative Prompt for Stability AI Generations
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

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# In-memory storage for analogies (replace with database in production)
# analogies_db = {}  # Removed - now using Supabase table

# Set up the Gemini model
model = genai.GenerativeModel('gemini-2.0-flash')

# Store active requests for cancellation
active_requests = {}

async def generate_analogy_with_httpx(prompt: str, timeout: float = 30.0, request_id: str = None):
    """
    Generate analogy using httpx for proper cancellation support.
    
    Args:
        prompt (str): The prompt to send to Gemini
        timeout (float): Timeout in seconds
        request_id (str): Optional request ID for tracking
        
    Returns:
        dict: The generated analogy JSON
        
    Raises:
        asyncio.TimeoutError: If the request times out
        httpx.RequestError: If there's a network error
        Exception: For other errors
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise Exception("GEMINI_API_KEY not found in environment variables")
    
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    
    headers = {
        "Content-Type": "application/json",
    }
    
    data = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 8192,
        }
    }
    
    # Store the request for potential cancellation
    if request_id:
        active_requests[request_id] = {"status": "running", "start_time": time.time()}
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                url,
                headers=headers,
                json=data,
                params={"key": gemini_api_key}
            )
            
            if response.status_code != 200:
                raise Exception(f"Gemini API error: {response.status_code} - {response.text}")
            
            result = response.json()
            
            # Extract the generated text from the response
            if "candidates" in result and len(result["candidates"]) > 0:
                content = result["candidates"][0]["content"]
                if "parts" in content and len(content["parts"]) > 0:
                    generated_text = content["parts"][0]["text"]
                    return generated_text
                else:
                    raise Exception("No text content found in Gemini response")
            else:
                raise Exception("No candidates found in Gemini response")
    finally:
        # Clean up the request tracking
        if request_id and request_id in active_requests:
            del active_requests[request_id]

def update_user_streak(user_id: str):
    """
    Update the user's daily streak when they generate an analogy.
    
    Args:
        user_id (str): The user's ID
        
    Returns:
        dict: Updated streak information
    """
    try:
        print(f"Updating streak for user: {user_id}")
        
        # Get current date in UTC
        current_date = datetime.now(timezone.utc).date()
        current_timestamp = datetime.now(timezone.utc)
        
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
        user_first_name = "ignore name if seeing this"

        if not topic or not audience:
            raise HTTPException(status_code=400, detail="Both topic and audience are required")

        user_info = ""
        # if user_id:
        #     try:
        #         print(f"Fetching user info for user_id: {user_id}\n")
        #         start_time = time.time()
        #         user_response = supabase_client.table("personality_answers").select("*").eq("user_id", user_id).limit(1).execute()
        #         end_time = time.time()
        #         print(f"Supabase request took: {end_time - start_time} seconds")

        #         if user_response.data:
        #             data = user_response.data
        #             print(f"User response: {data}")
        #             context_parts = []
        #             if data["context"]:
        #                 context_parts.append(f"They are in the {data['context']} category.")
        #             if data["role"]:
        #                 context_parts.append(f"They work as a {data['role']}.")
        #             if data["analogy_style"]:
        #                 context_parts.append(f"They prefer analogies that are {', '.join(data['analogy_style'])}.")
        #             if data["interests"]:
        #                 context_parts.append(f"They are interested in {', '.join(data['interests'])}.")
        #             if data["hobbies"]:
        #                 context_parts.append(f"They enjoy {', '.join(data['hobbies'])}.")
        #             if data["likes"]:
        #                 context_parts.append(f"They like {', '.join(data['likes'])}.")
        #             if data["dislikes"]:
        #                 context_parts.append(f"They dislike {', '.join(data['dislikes'])}.")
        #             user_info = " ".join(context_parts)
        #     except Exception as e:
        #         print(f"Error fetching user info: {e}")
        #     print(f"Fetched User info for user_id: {user_id} is: {user_info}\n")

        prompt = ANALOGY_PROMPT.format(topic=topic, audience=audience, user_first_name=user_first_name, user_info=user_info, COMIC_STYLE_PREFIX=COMIC_STYLE_PREFIX)
        print(f"Prompt: {prompt}")
        
        # Generate a unique request ID for tracking
        request_id = str(uuid.uuid4())
        
        # Generate analogy with timeout and cancellation support
        try:
            start_time = time.time()
            
            # Use httpx for cancellable Gemini API calls
            response_text = await generate_analogy_with_httpx(prompt, timeout=30.0, request_id=request_id)
            
            print(f"Response: {response_text}")
            end_time = time.time()
            print(f"Time taken to generate response: {end_time - start_time} seconds")
            analogy_json = extract_raw_json(response_text)
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
                generate_image_stability(image_prompts[0], 0, NEGATIVE_PROMPT, timeout=20.0),
                generate_image_stability(image_prompts[1], 1, NEGATIVE_PROMPT, timeout=20.0),
                generate_image_stability(image_prompts[2], 2, NEGATIVE_PROMPT, timeout=20.0)
            )
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
            streak_update = update_user_streak(user_id)
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

        print("reached here and now trying to send back the response")
        return GetAnalogyResponse(
            status="success",
            analogy=analogy_json,  # Now guaranteed to be a dict
            id=analogy_data["id"],
            analogy_images=analogy_data["image_urls"],
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

            # Structure the analogy data to match frontend expectations
            analogy = {
                "id": analogy_data["id"],
                "topic": analogy_data["topic"],
                "audience": analogy_data["audience"],
                "analogy_json": analogy_json,
                "image_urls": analogy_data["image_urls"],
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
                generate_image_stability(image_prompts[0], 0, NEGATIVE_PROMPT, timeout=20.0),
                generate_image_stability(image_prompts[1], 1, NEGATIVE_PROMPT, timeout=20.0),
                generate_image_stability(image_prompts[2], 2, NEGATIVE_PROMPT, timeout=20.0)
            )
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
            streak_update = update_user_streak(user_id)
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
    
    Args:
        user_id (str): The user's ID
        
    Returns:
        dict: User's streak information
    """
    try:
        print(f"Fetching streak info for user: {user_id}")
        
        # Fetch user streak info
        user_response = supabase_client.table("user_information").select(
            "current_streak_count, longest_streak_count, last_streak_date, last_analogy_time"
        ).eq("id", user_id).single().execute()
        
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        user_data = user_response.data
        
        # Get current date in UTC for comparison
        current_date = datetime.now(timezone.utc).date()
        
        # Check if streak is still active (user generated analogy today or yesterday)
        is_streak_active = False
        last_streak_date = user_data.get("last_streak_date")
        
        if last_streak_date:
            if isinstance(last_streak_date, str):
                try:
                    last_streak_date = datetime.fromisoformat(last_streak_date.replace('Z', '+00:00')).date()
                except ValueError:
                    last_streak_date = None
            
            if last_streak_date:
                days_since_last_analogy = (current_date - last_streak_date).days
                is_streak_active = days_since_last_analogy <= 1
        
        return {
            "status": "success",
            "current_streak_count": user_data.get("current_streak_count", 0) or 0,
            "longest_streak_count": user_data.get("longest_streak_count", 0) or 0,
            "last_streak_date": user_data.get("last_streak_date"),
            "last_analogy_time": user_data.get("last_analogy_time"),
            "is_streak_active": is_streak_active,
            "days_since_last_analogy": (current_date - last_streak_date).days if last_streak_date else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_user_streak: {e}")
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

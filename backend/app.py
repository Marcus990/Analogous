from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
import httpx
import uuid
from datetime import datetime
from dotenv import load_dotenv
import google.generativeai as genai
import supabase
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PRIVATE_KEY")
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
analogies_db = {}

# Set up the Gemini model
model = genai.GenerativeModel('gemini-2.0-flash')

# Pydantic models for request/response
class GenerateAnalogyRequest(BaseModel):
    topic: str
    audience: str
    user_id: str | None = None

class GenerateAnalogyResponse(BaseModel):
    status: str
    analogy: str
    id: str

class GetAnalogyResponse(BaseModel):
    status: str
    analogy: str
    id: str
    topic: str
    audience: str
    created_at: str

class SignUpRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    opt_in_email_marketing: bool

ANALOGY_PROMPT = """
You are an expert analogy creator whose job is to explain complex topics using vivid, creative analogies tailored to specific audiences.

Objective:
Create an analogy that explains the concept of "{topic}" to an audience of "{audience}".

Audience context: {user_info}

---

Rules and Structure:
1. The analogy must be **relatable** to the audience's background, interests, or life experiences.
2. It should **deconstruct complex ideas** into familiar, everyday scenarios.
3. The analogy should be **2–4 paragraphs**, rich in detail, but clear and digestible.
4. Use **vivid metaphors**, **clear comparisons**, and **tangible examples**.
5. Keep the tone **engaging, concise, and educational**.
6. Do not include any other text other than the analogy. So no preamble, no postamble, no nothing. Just provide the analogy.

Good Examples:

Topic: Machine Learning | Audience: High School Students
> "Imagine you're trying to teach a dog new tricks. At first, you give it treats when it sits, then when it rolls over. Over time, the dog starts to figure out what gets rewarded. Machine learning is similar — the algorithm is like the dog, and the data we feed it acts like those treats, helping it learn patterns."

---

Topic: Blockchain | Audience: Grandparents
> "Think of a digital ledger like a family recipe book. Each recipe page is written in pen and copied to everyone’s book in the family. If someone tries to change a recipe, it’s obvious — because their page won’t match anyone else's. Blockchain works like that: every block is a page, and everyone has a copy, making it secure and tamper-proof."

---

Bad Examples:

- "Blockchain is a decentralized system for maintaining distributed ledgers." This is too technical.
- "It’s like a thing that does stuff with data." This is too vague and uninformative.

---

Step-by-Step Generation Process:

1. Identify what the audience likely knows well (e.g. games, school, cooking).
2. Choose a familiar metaphor that maps onto the concept of "{topic}".
3. Walk through the metaphor with logical structure.
4. Use sensory language, real-world examples, and relatable phrasing.
5. End with a sentence that ties the analogy back to the original topic.

---

Final Instructions:
Think carefully and creatively. The analogy should **help someone understand the topic for the first time**.

Begin writing the analogy now:
"""

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

    try:
        insert_response = supabase_client.table("user_information").insert({
            "id": user_id,
            "email": payload.email,
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "onboarding_complete": False,
            "plan": "free",
            "opt_in_email_marketing": payload.opt_in_email_marketing,
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
        if not topic or not audience:
            raise HTTPException(status_code=400, detail="Both topic and audience are required")

        user_info = ""
        if user_id:
            try:
                user_response = supabase_client.table("personality_answers").select("*").eq("user_id", user_id).single().execute()
                if user_response.data:
                    data = user_response.data
                    context_parts = []
                    if data.get("context"):
                        context_parts.append(f"They are in the {data['context']} category.")
                    if data.get("role"):
                        context_parts.append(f"They work as a {data['role']}.")
                    if data.get("analogy_style"):
                        context_parts.append(f"They prefer analogies that are {', '.join(data['analogy_style'])}.")
                    if data.get("interests"):
                        context_parts.append(f"They are interested in {', '.join(data['interests'])}.")
                    if data.get("hobbies"):
                        context_parts.append(f"They enjoy {', '.join(data['hobbies'])}.")
                    if data.get("likes"):
                        context_parts.append(f"They like {', '.join(data['likes'])}.")
                    if data.get("dislikes"):
                        context_parts.append(f"They dislike {', '.join(data['dislikes'])}.")
                    user_info = " ".join(context_parts)
            except Exception as e:
                print(f"Error fetching user info: {e}")

        # Generate analogy using Gemini
        prompt = ANALOGY_PROMPT.format(topic=topic, audience=audience, user_info=user_info)
        print(f"Prompt: {prompt}")
        try:
            response = model.generate_content(prompt)
            analogy_text = response.text.strip()
            print(f"Analogy response: {response}")
        except Exception as e:
            analogy_text = f"Here's a simple analogy: {topic} is like explaining {audience} to a {audience}. Just as a {audience} needs clear, simple explanations, {topic} can be understood through familiar concepts that {audience} would relate to."
            print(f"Gemini API error: {e}")

        analogy_id = str(uuid.uuid4())

        analogies_db[analogy_id] = {
            "id": analogy_id,
            "topic": topic,
            "audience": audience,
            "analogy": analogy_text,
            "created_at": datetime.utcnow().isoformat()
        }

        return GenerateAnalogyResponse(
            status="success",
            analogy=analogy_text,
            id=analogy_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/analogy/{analogy_id}", response_model=GetAnalogyResponse)
async def get_analogy(analogy_id: str):
    try:
        if analogy_id not in analogies_db:
            raise HTTPException(status_code=404, detail="Analogy not found")

        analogy_data = analogies_db[analogy_id]
        return GetAnalogyResponse(
            status="success",
            analogy=analogy_data["analogy"],
            id=analogy_data["id"],
            topic=analogy_data["topic"],
            audience=analogy_data["audience"],
            created_at=analogy_data["created_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

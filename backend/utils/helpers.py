import json
import re
import os
import uuid
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Stability AI client
STABILITY_API_KEY = os.getenv("STABILITY_API_KEY")
STABILITY_API_URL = os.getenv("STABILITY_API_URL")

FALLBACK_IMAGES = [
    "/assets/default_image0.jpeg",
    "/assets/default_image1.jpeg",
    "/assets/default_image2.jpeg",
]

async def generate_image_stability(prompt: str, fallback_index: int, negative_prompt: str = "", timeout: float = 20.0) -> str:
    print(f"Stability Api Key: {STABILITY_API_KEY}")
    print(f"Stability Api Url: {STABILITY_API_URL}")
    if not STABILITY_API_KEY or not STABILITY_API_URL:
        print("Missing Stability API credentials. Using fallback.")
        return FALLBACK_IMAGES[fallback_index]

    headers = {
        "Authorization": f"Bearer {STABILITY_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "output_format": "jpeg",
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            res = await client.post(STABILITY_API_URL, headers=headers, json=payload)
            res.raise_for_status()
            image_data = res.content
            file_name = f"{uuid.uuid4()}.jpg"
            file_path = f"static/images/{file_name}"

            os.makedirs(os.dirname(file_path), exist_ok=True)
            with open(file_path, "wb") as f:
                f.write(image_data)

            return f"/static/images/{file_name}"
        except httpx.TimeoutException:
            print(f"Stability image generation timed out for prompt [{prompt[:40]}...]")
            return FALLBACK_IMAGES[fallback_index]
        except Exception as e:
            print(f"Stability image gen error for prompt [{prompt[:40]}...]: {e}")
            return FALLBACK_IMAGES[fallback_index]
        
def extract_raw_json(response: str) -> dict:
    # Remove backticks and any ```json\n or trailing ```
    clean = re.sub(r"```json|```", "", response).strip()
    return json.loads(clean)
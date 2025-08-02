import json
import re
import os
import uuid
import httpx
import replicate
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Replicate client
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

FALLBACK_IMAGES = [
    "/static/assets/default_image0.jpeg",
    "/static/assets/default_image1.jpeg",
    "/static/assets/default_image2.jpeg",
]

def check_image_exists(image_path: str, fallback_index: int) -> str:
    """
    Check if an image exists at the given path, return fallback if not.
    
    Args:
        image_path (str): The image path to check (e.g., "/static/images/filename.jpg")
        fallback_index (int): Index of fallback image to use (0, 1, or 2)
        
    Returns:
        str: Original path if image exists, fallback path if not
    """
    # Remove leading slash for file system check
    file_path = image_path.lstrip('/')
    
    # Check if the file exists in the static/images directory
    if os.path.exists(file_path):
        print(f"Image found at {image_path}")
        return image_path
    else:
        print(f"Image not found at {image_path}, using fallback {fallback_index}")
        return FALLBACK_IMAGES[fallback_index]

def get_fallback_image_for_slide(slide_index: int) -> str:
    """
    Get the appropriate fallback image for a specific carousel slide.
    
    Carousel structure:
    - Index 0: Title page (no image)
    - Index 1: Original slide 1 → default_image0.jpeg
    - Index 2: Blurred slide 1 → default_image0.jpeg  
    - Index 3: Original slide 2 → default_image1.jpeg
    - Index 4: Blurred slide 2 → default_image1.jpeg
    - Index 5: Original slide 3 → default_image2.jpeg
    - Index 6: Blurred slide 3 → default_image2.jpeg
    - Index 7: Back cover (uses first image)
    
    Args:
        slide_index (int): The carousel slide index
        
    Returns:
        str: Path to the appropriate fallback image
    """
    if slide_index == 0 or slide_index == 7:
        # Title page or back cover - use first fallback
        return FALLBACK_IMAGES[0]
    elif slide_index in [1, 2]:
        # First image and its blurred version
        return FALLBACK_IMAGES[0]
    elif slide_index in [3, 4]:
        # Second image and its blurred version
        return FALLBACK_IMAGES[1]
    elif slide_index in [5, 6]:
        # Third image and its blurred version
        return FALLBACK_IMAGES[2]
    else:
        # Fallback to first image for any other case
        return FALLBACK_IMAGES[0]

async def generate_image_replicate(prompt: str, fallback_index: int, negative_prompt: str = "", timeout: float = 20.0) -> str:
    print(f"Replicate API Token: {REPLICATE_API_TOKEN}")
    if not REPLICATE_API_TOKEN:
        print("Missing Replicate API token. Using fallback.")
        return FALLBACK_IMAGES[fallback_index]

    try:
        # Set the API token for replicate
        os.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_TOKEN
        
        # Ensure static/images directory exists
        os.makedirs("static/images", exist_ok=True)
        
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
            
            # Save the image locally
            file_name = f"{uuid.uuid4()}.jpg"
            file_path = f"static/images/{file_name}"
            
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "wb") as f:
                f.write(image_data)
            
            # Verify the file was created successfully
            if not os.path.exists(file_path):
                print(f"Failed to save image to {file_path}")
                return FALLBACK_IMAGES[fallback_index]
            
            print(f"Successfully saved image to {file_path}")
            return f"/static/images/{file_name}"
            
    except Exception as e:
        print(f"Replicate image generation error for prompt [{prompt[:40]}...]: {e}")
        return FALLBACK_IMAGES[fallback_index]
        
def extract_raw_json(response: str) -> dict:
    # Remove backticks and any ```json\n or trailing ```
    clean = re.sub(r"```json|```", "", response).strip()
    return json.loads(clean)
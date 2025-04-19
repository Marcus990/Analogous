from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List
from app.services.supabase import supabase
from app.schemas.analogy import AnalogyCreate, AnalogyResponse
from app.middleware.auth import verify_token

router = APIRouter()

@router.get("/analogies", response_model=List[AnalogyResponse])
async def get_analogies(request: Request = Depends(verify_token)):
    try:
        response = supabase.table('analogies').select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analogies", response_model=AnalogyResponse)
async def create_analogy(
    analogy: AnalogyCreate,
    request: Request = Depends(verify_token)
):
    try:
        user = request.state.user
        response = supabase.table('analogies').insert({
            "topic": analogy.topic,
            "explanation": analogy.explanation,
            "user_id": user.id
        }).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
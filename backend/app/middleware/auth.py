from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer
from app.services.supabase import supabase
from typing import Optional

security = HTTPBearer()

class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 401):
        self.message = message
        self.status_code = status_code
        super().__init__(message)

async def verify_token(request: Request) -> dict:
    if "authorization" not in request.headers:
        raise AuthError("Missing authentication token")
    
    try:
        token = request.headers["authorization"].split(" ")[1]
        user = supabase.auth.get_user(token)
        return user.user
    except Exception as e:
        raise AuthError("Invalid authentication token") 
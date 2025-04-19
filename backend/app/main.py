from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.endpoints import analogies
from app.middleware.auth import AuthError

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for the Analogous web application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(AuthError)
async def auth_error_handler(request: Request, exc: AuthError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message}
    )

# Include routers
app.include_router(analogies.router, prefix="/api", tags=["analogies"])

@app.get("/")
async def root():
    return {"message": "Welcome to Analogous API"} 
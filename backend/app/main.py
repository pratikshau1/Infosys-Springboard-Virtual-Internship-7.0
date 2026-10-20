import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import router
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure storage directory exists on startup
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    yield

app = FastAPI(
    title="AI Project Intelligence & Risk Advisor",
    version="1.0.0",
    description="Automated project risk assessment, milestone tracking, and RAG-powered project knowledge advisor.",
    lifespan=lifespan
)

# Configure CORS dynamically for development or production
origins = settings.cors_origins_list
allow_credentials = False if origins == ["*"] else True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router.api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "service": "AI Project Intelligence & Risk Advisor API",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }

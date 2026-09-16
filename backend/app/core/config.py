import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator


class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Waste Management & Disposal Platform"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "supersecretkey_change_in_production_1234567890!@#$%^"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # Strict 15 minute access token
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database & Connection Pooling
    DATABASE_URL: str = "sqlite:///./waste_management.db"
    DB_POOL_SIZE: int = 25
    DB_MAX_OVERFLOW: int = 35
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    
    # Redis & Distributed Caching
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_ENABLED: bool = True
    CACHE_DEFAULT_TTL: int = 300
    CACHE_FACILITY_TTL: int = 300
    CACHE_POLICY_TTL: int = 600
    CACHE_ARTICLE_TTL: int = 1800
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    
    # File Uploads
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
    MAX_UPLOAD_SIZE_MB: int = 10
    
    # AI & RAG Configuration
    LLM_PROVIDER: str = "groq"  # "groq", "gemini", "openai", "hybrid", "mock"
    GROQ_API_KEY: str = ""
    GROQ_PRIMARY_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_FALLBACK_MODELS: List[str] = ["qwen/qwen3.8-27b", "groq/compound-mini"]
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    RAG_SIMILARITY_THRESHOLD: float = 0.35
    RAG_TOP_K: int = 4
    
    # Default Admin / Citizen Seed Credentials
    ADMIN_EMAIL: str = "admin@wastecare.gov"
    ADMIN_PASSWORD: str = "Admin@123456"
    CITIZEN_EMAIL: str = "citizen@wastecare.gov"
    CITIZEN_PASSWORD: str = "Citizen@123456"
    
    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

"""
Authentication Configuration
Settings for JWT tokens and security
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = "your-super-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    class Config:
        env_file = ".env"


settings = Settings()

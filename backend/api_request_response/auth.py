"""
Authentication API Schemas
Request/Response models for authentication endpoints
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Authentication Requests
class UserLogin(BaseModel):
    username: str
    password: str


class UserRegister(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None

class TokenRefresh(BaseModel):
    refresh_token: str


class UserCreate(BaseModel):
    username: str
    password: str
    is_active: bool = True
    is_superuser: bool = False
    roles: Optional[List[str]] = []


# Authentication Responses
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    roles: List[str] = []


class UserResponse(BaseModel):
    id: int
    username: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    roles: List[str] = []
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    password: Optional[str] = None
    roles: Optional[List[str]] = None


# Role Schemas
class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Token Refresh
class TokenRefresh(BaseModel):
    refresh_token: str

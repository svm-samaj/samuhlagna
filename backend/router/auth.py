"""
Authentication Router
HTTP endpoints for authentication operations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from models.auth import User
from sqlalchemy.orm import Session
from typing import Annotated

from database import get_db
from api_request_response.auth import UserLogin, UserCreate, UserRegister, TokenRefresh, Token
from login.dependencies import get_current_user, require_admin
from controller import auth as auth_controller

router = APIRouter(prefix="/auth", tags=["authentication"])
db_dependency = Annotated[Session, Depends(get_db)]


@router.post("/login", response_model=Token, status_code=status.HTTP_200_OK)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    OAuth2 compatible token login endpoint.
    Login with username and password to get access token.
    """
    try:
        # Convert form data to our UserLogin model
        user_creds = UserLogin(username=form_data.username, password=form_data.password)
        response = auth_controller.login_controller(user_creds, db)
        
        # Return in OAuth2 compatible format
        if response.get("status") == "success":
            token_data = response["data"]
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data["refresh_token"], 
                "token_type": "bearer",
                "expires_in": token_data["expires_in"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: db_dependency):
    """
    User registration endpoint
    Creates new user with default user_data_viewer role
    """
    try:
        response = auth_controller.register_controller(user_data, db)
        return response
    except Exception as e:
        raise


@router.post("/create-user", status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate, 
    db: db_dependency,
    current_user: User = Depends(require_admin)
):
    """
    Admin user creation endpoint
    Allows creating users with specific roles (admin access required)
    """
    try:
        response = auth_controller.create_user_controller(user_data, db)
        return response
    except Exception as e:
        raise


@router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh_token(token_data: TokenRefresh, db: db_dependency):
    """
    Refresh access token using refresh token
    """
    try:
        response = auth_controller.refresh_token_controller(token_data.refresh_token, db)
        return response
    except Exception as e:
        raise


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(token_data: TokenRefresh, db: db_dependency):
    """
    User logout endpoint
    Revokes the refresh token
    """
    try:
        response = auth_controller.logout_controller(token_data.refresh_token, db)
        return response
    except Exception as e:
        raise


@router.get("/me", status_code=status.HTTP_200_OK)
async def get_current_user_info(
    db: db_dependency,
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user details
    Requires valid access token
    """
    try:
        response = auth_controller.get_current_user_controller(current_user.username, db)
        return response
    except Exception as e:
        raise


@router.get("/users", status_code=status.HTTP_200_OK)
async def get_all_users(
    db: db_dependency,
    current_user: User = Depends(require_admin)
):
    """
    Get all users (admin only)
    Requires: admin role
    """
    try:
        response = auth_controller.get_all_users_controller(db)
        return response
    except Exception as e:
        raise

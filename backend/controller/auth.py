"""
Authentication Controller
Business logic orchestration for authentication operations
"""

from typing import Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import timedelta

from api_request_response.auth import UserLogin, UserCreate, UserRegister, UserUpdate
from manager import auth as auth_manager
from login.security import create_access_token
from login.config import settings


def login_controller(user_data: UserLogin, db_session: Session) -> Dict[str, Any]:
    """Handle user login"""
    try:
        # Authenticate user
        user = auth_manager.authenticate_user(db_session, user_data.username, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        # Get user roles
        roles = auth_manager.get_user_roles(db_session, user.id)
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user.username, "user_id": user.id, "roles": roles},
            expires_delta=access_token_expires
        )
        
        # Create refresh token
        refresh_token = auth_manager.create_refresh_token_record(db_session, user.id)
        
        response = {
            "status": "success",
            "message": "Login successful",
            "data": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": settings.access_token_expire_minutes * 60,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "roles": roles
                }
            }
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def register_controller(user_data: UserRegister, db_session: Session) -> Dict[str, Any]:
    """Handle user registration (simplified - no email required)"""
    try:
        # Create user with default viewer role
        user_create_data = UserCreate(
            username=user_data.username,
            password=user_data.password,
            is_active=True,
            is_superuser=False,
            roles=["user_data_viewer"]  # Default role for new registrations
        )
        
        # Create user
        created_user = auth_manager.create_user(db_session, user_create_data)
        
        response = {
            "status": "success",
            "message": "User registered successfully",
            "data": {
                "id": created_user.id,
                "username": created_user.username,
                "is_active": created_user.is_active
            }
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def create_user_controller(user_data: UserCreate, db_session: Session) -> Dict[str, Any]:
    """Handle admin user creation"""
    try:
        # Create user
        created_user = auth_manager.create_user(db_session, user_data)
        
        # Get assigned roles
        roles = auth_manager.get_user_roles(db_session, created_user.id)
        
        response = {
            "status": "success",
            "message": "User created successfully",
            "data": {
                "id": created_user.id,
                "username": created_user.username,
                "is_active": created_user.is_active,
                "is_superuser": created_user.is_superuser,
                "roles": roles
            }
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def refresh_token_controller(refresh_token: str, db_session: Session) -> Dict[str, Any]:
    """Handle token refresh"""
    try:
        # Verify refresh token
        user = auth_manager.verify_refresh_token(db_session, refresh_token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user roles
        roles = auth_manager.get_user_roles(db_session, user.id)
        
        # Create new access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user.username, "user_id": user.id, "roles": roles},
            expires_delta=access_token_expires
        )
        
        response = {
            "status": "success",
            "message": "Token refreshed successfully",
            "data": {
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": settings.access_token_expire_minutes * 60
            }
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def logout_controller(refresh_token: str, db_session: Session) -> Dict[str, Any]:
    """Handle user logout"""
    try:
        # Revoke refresh token
        auth_manager.revoke_refresh_token(db_session, refresh_token)
        
        response = {
            "status": "success",
            "message": "Logout successful"
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def get_current_user_controller(username: str, db_session: Session) -> Dict[str, Any]:
    """Get current user details"""
    try:
        user = auth_manager.get_user_by_username(db_session, username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        roles = auth_manager.get_user_roles(db_session, user.id)
        
        response = {
            "status": "success",
            "message": "User details retrieved successfully",
            "data": {
                "id": user.id,
                "username": user.username,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "roles": roles,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def get_all_users_controller(db_session: Session) -> Dict[str, Any]:
    """Get all users (admin only)"""
    try:
        # This would typically have admin-only access
        users = db_session.query(auth_manager.User).all()
        
        user_list = []
        for user in users:
            roles = auth_manager.get_user_roles(db_session, user.id)
            user_list.append({
                "id": user.id,
                "username": user.username,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "roles": roles,
                "created_at": user.created_at.isoformat() if user.created_at else None
            })
        
        response = {
            "status": "success",
            "message": "Users retrieved successfully",
            "data": user_list
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def update_user_controller(user_id: int, user_data: UserUpdate, db_session: Session) -> Dict[str, Any]:
    """Handle admin user update"""
    try:
        # Update user
        updated_user = auth_manager.update_user(db_session, user_id, user_data)
        
        # Get updated roles
        roles = auth_manager.get_user_roles(db_session, updated_user.id)
        
        response = {
            "status": "success",
            "message": "User updated successfully",
            "data": {
                "id": updated_user.id,
                "username": updated_user.username,
                "is_active": updated_user.is_active,
                "is_superuser": updated_user.is_superuser,
                "roles": roles,
                "updated_at": updated_user.updated_at.isoformat() if updated_user.updated_at else None
            }
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}"
        )

"""
Authentication Dependencies
FastAPI dependency injection for authentication and authorization
"""

from typing import List
from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from login.security import decode_access_token
from manager import auth as auth_manager
from models.auth import User
from login.permissions import Permission, user_has_permission

# OAuth2 scheme that points to our login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode token
        username = decode_access_token(token)
        if username is None:
            raise credentials_exception
            
    except Exception:
        raise credentials_exception
    
    # Get user from database
    user = auth_manager.get_user_by_username(db, username)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current superuser"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


def require_roles(allowed_roles: List[str]):
    """Dependency factory for role-based access control"""
    def role_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        user_roles = auth_manager.get_user_roles(db, current_user.id)
        
        # Superuser has all permissions
        if current_user.is_superuser:
            return current_user
        
        # Check if user has any of the required roles
        if not any(role in user_roles for role in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {allowed_roles}"
            )
        
        return current_user
    
    return role_checker


def require_permission(permission: Permission):
    """Dependency factory for permission-based access control"""
    def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        # Superuser has all permissions
        if current_user.is_superuser:
            return current_user
        
        # Get user roles and check permission
        user_roles = auth_manager.get_user_roles(db, current_user.id)
        
        if not user_has_permission(user_roles, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required permission: {permission.value}"
            )
        
        return current_user
    
    return permission_checker


# Common role dependencies for your custom roles
require_admin = require_roles(["admin"])
require_user_data_editor = require_roles(["admin", "user_data_editor"])
require_user_data_viewer = require_roles(["admin", "user_data_editor", "user_data_viewer"])
require_receipt_report_viewer = require_roles(["admin", "receipt_report_viewer"])
require_receipt_creator = require_roles(["admin", "receipt_creator"])
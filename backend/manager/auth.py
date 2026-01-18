"""
Authentication Manager
Database operations for user authentication and authorization
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException, status
from datetime import datetime, timedelta

from models.auth import User, Role, UserRole, RefreshToken
from api_request_response.auth import UserCreate, UserUpdate
from login.security import get_password_hash, verify_password, create_refresh_token
from login.config import settings


def create_user(db_session: Session, user_data: UserCreate) -> User:
    """Create new user in database"""
    # Check if username already exists
    existing_user = db_session.query(User).filter(User.username == user_data.username).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    db_user = User(
        username=user_data.username,
        hashed_password=hashed_password,
        is_active=user_data.is_active,
        is_superuser=user_data.is_superuser
    )
    
    db_session.add(db_user)
    db_session.commit()
    db_session.refresh(db_user)
    
    # Assign roles
    if user_data.roles:
        assign_user_roles(db_session, db_user.id, user_data.roles)
    
    return db_user


def authenticate_user(db_session: Session, username: str, password: str) -> Optional[User]:
    """Authenticate user by username and password"""
    user = db_session.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def get_user_by_username(db_session: Session, username: str) -> Optional[User]:
    """Get user by username"""
    return db_session.query(User).filter(User.username == username).first()


def get_user_by_id(db_session: Session, user_id: int) -> Optional[User]:
    """Get user by ID"""
    return db_session.query(User).filter(User.id == user_id).first()


def get_user_roles(db_session: Session, user_id: int) -> List[str]:
    """Get user roles"""
    roles = db_session.query(Role).join(UserRole).filter(
        UserRole.user_id == user_id
    ).all()
    return [role.name for role in roles]


def assign_user_roles(db_session: Session, user_id: int, role_names: List[str]):
    """Assign roles to user"""
    # Remove existing roles
    db_session.query(UserRole).filter(UserRole.user_id == user_id).delete()
    
    # Add new roles
    for role_name in role_names:
        role = db_session.query(Role).filter(Role.name == role_name).first()
        if role:
            user_role = UserRole(user_id=user_id, role_id=role.id)
            db_session.add(user_role)
    
    db_session.commit()


def create_refresh_token_record(db_session: Session, user_id: int) -> str:
    """Create and store refresh token"""
    token = create_refresh_token()
    expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    
    refresh_token = RefreshToken(
        token=token,
        user_id=user_id,
        expires_at=expires_at
    )
    
    db_session.add(refresh_token)
    db_session.commit()
    
    return token


def verify_refresh_token(db_session: Session, token: str) -> Optional[User]:
    """Verify refresh token and return user"""
    refresh_token = db_session.query(RefreshToken).filter(
        and_(
            RefreshToken.token == token,
            RefreshToken.expires_at > datetime.utcnow(),
            RefreshToken.is_revoked == False
        )
    ).first()
    
    if not refresh_token:
        return None
    
    return refresh_token.user


def revoke_refresh_token(db_session: Session, token: str):
    """Revoke refresh token"""
    refresh_token = db_session.query(RefreshToken).filter(
        RefreshToken.token == token
    ).first()
    
    if refresh_token:
        refresh_token.is_revoked = True
        db_session.commit()


def update_user(db_session: Session, user_id: int, user_data: UserUpdate) -> User:
    """Update user details"""
    user = db_session.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    if user_data.is_superuser is not None:
        user.is_superuser = user_data.is_superuser
    
    if user_data.password:
        user.hashed_password = get_password_hash(user_data.password)
    
    # Update roles
    if user_data.roles is not None:
        assign_user_roles(db_session, user_id, user_data.roles)
    
    db_session.commit()
    db_session.refresh(user)
    
    return user


# Role management
def create_role(db_session: Session, name: str, description: str = None) -> Role:
    """Create new role"""
    existing_role = db_session.query(Role).filter(Role.name == name).first()
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role already exists"
        )
    
    role = Role(name=name, description=description)
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)
    
    return role


def get_all_roles(db_session: Session) -> List[Role]:
    """Get all roles"""
    return db_session.query(Role).all()


def get_role_by_name(db_session: Session, name: str) -> Optional[Role]:
    """Get role by name"""
    return db_session.query(Role).filter(Role.name == name).first()

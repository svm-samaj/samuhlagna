"""
User Data Router
Handles HTTP requests for user data operations
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Annotated, Optional, List
from sqlalchemy.orm import Session

from database import get_db
from api_request_response.user_data import User_dataCreate, User_dataUpdate
from controller import user_data as user_data_controller
from login.dependencies import require_user_data_viewer, require_user_data_editor, get_current_user
from models.auth import User

router = APIRouter()
db_dependency = Annotated[Session, Depends(get_db)]


@router.post("/user_data/", status_code=status.HTTP_201_CREATED)
def create_user_data(
    user_data: User_dataCreate, 
    db: db_dependency,
    current_user: User = Depends(require_user_data_editor)
):
    """
    API to create a new user data record.
    Requires: user_data_editor or admin role
    """
    try:
        response = user_data_controller.create_user_data_controller(user_data, db)
        return response
    except Exception as e:
        raise


@router.get("/user_data/", status_code=status.HTTP_200_OK)
def read_user_data(
    db: db_dependency,
    page_num: Optional[int] = 1,
    page_size: Optional[int] = 10,
    name: Optional[str] = Query(None),
    type_filter: Optional[List[str]] = Query(None),
    area_ids: Optional[List[int]] = Query(None),
    village_ids: Optional[List[int]] = Query(None),
    user_ids: Optional[List[int]] = Query(None),
    pdf: Optional[bool] = False,
    csv: Optional[bool] = False,
    current_user: User = Depends(require_user_data_viewer)
):
    """
    API to get user data records with filtering and pagination.
    Requires: user_data_viewer, user_data_editor, or admin role
    """
    try:
        response = user_data_controller.get_user_data_controller(
            db, page_num, page_size, name, type_filter, area_ids, village_ids, user_ids, pdf, csv
        )
        return response
    except Exception as e:
        raise


@router.put("/user_data/{user_id}", status_code=status.HTTP_200_OK)
def update_user_data(
    user_id: int, 
    updated_user_data: User_dataUpdate, 
    db: db_dependency,
    current_user: User = Depends(require_user_data_editor)
):
    """
    API to update a user data record.
    Requires: user_data_editor or admin role
    """
    try:
        response = user_data_controller.update_user_data_controller(user_id, updated_user_data, db)
        return response
    except Exception as e:
        raise


@router.delete("/user_data/{user_id}", status_code=status.HTTP_200_OK)
def delete_user_data(
    user_id: int, 
    db: db_dependency,
    current_user: User = Depends(require_user_data_editor)
):
    """
    API to soft delete a user data record.
    Requires: user_data_editor or admin role
    """
    try:
        response = user_data_controller.delete_user_data_controller(user_id, db)
        return response
    except Exception as e:
        raise


@router.get("/user_data/stats", status_code=status.HTTP_200_OK)
def get_user_data_stats(
    db: db_dependency,
    current_user: User = Depends(get_current_user)
):
    """
    API to get user data statistics.
    
    **Permissions**:
    - **admin, user_data_editor, user_data_viewer**: Get full user data statistics
    - **receipt_creator, receipt_report_viewer**: Get default/empty statistics (graceful handling)
    """
    try:
        # Get user roles
        from manager.auth import get_user_roles
        user_roles = get_user_roles(db, current_user.id)
        
        # Check if user has permission for user data statistics
        allowed_roles = ["admin", "user_data_editor", "user_data_viewer"]
        has_user_data_access = any(role in allowed_roles for role in user_roles)
        
        if has_user_data_access:
            # User has permission - return real statistics
            response = user_data_controller.get_user_data_stats_controller(db)
            return response
        else:
            # User doesn't have permission - return default/empty statistics gracefully
            print(f"DEBUG: User {current_user.username} with roles {user_roles} doesn't have user_data access - returning default stats")
            return {
                "status": "success",
                "message": "User statistics not available for your role",
                "data": {
                    "total_users": 0,
                    "active_users": 0,
                    "inactive_users": 0,
                    "recently_added": 0,
                    "total_villages": 0,
                    "total_areas": 0
                }
            }
    except Exception as e:
        # Return default stats on any error to prevent breaking the frontend
        print(f"ERROR in /user_data/stats: {str(e)}")
        return {
            "status": "success",
            "message": "Statistics unavailable",
            "data": {
                "total_users": 0,
                "active_users": 0,
                "inactive_users": 0,
                "recently_added": 0,
                "total_villages": 0,
                "total_areas": 0
            }
        }
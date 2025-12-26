"""
Village and Area Router
Handles HTTP requests for village and area operations
"""

from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import Annotated, Optional
from sqlalchemy.orm import Session

from database import get_db
from api_request_response.village_area import VillageBase, AreaBase
from controller import village_area as village_area_controller
from login.dependencies import require_user_data_viewer, require_user_data_editor
from models.auth import User

router = APIRouter()
db_dependency = Annotated[Session, Depends(get_db)]


# --- Village Routes ---
@router.post("/village/", status_code=status.HTTP_201_CREATED)
async def create_village(
    village: VillageBase, 
    db: db_dependency,
    current_user: User = Depends(require_user_data_editor)
):
    """
    API to create a new village record.
    Requires: user_data_editor or admin role
    """
    try:
        response = village_area_controller.create_village_controller(village, db)
        return response
    except Exception as e:
        raise


@router.get("/village/", status_code=status.HTTP_200_OK)
async def read_village(
    db: db_dependency,
    village: Optional[str] = None,
    page_num: Optional[int] = 1,
    current_user: User = Depends(require_user_data_viewer)
):
    """
    API to get village records with user count and pagination.
    Requires: user_data_viewer, user_data_editor, or admin role
    """
    try:
        response = village_area_controller.get_villages_controller(db, village, page_num)
        return response
    except Exception as e:
        raise


@router.delete("/village/{village_id}", status_code=status.HTTP_200_OK)
async def delete_village(
    village_id: int, 
    db: db_dependency,
    current_user: User = Depends(require_user_data_editor)
):
    """
    API to delete a village record.
    Requires: user_data_editor or admin role
    """
    try:
        response = village_area_controller.delete_village_controller(village_id, db)
        return response
    except Exception as e:
        raise


# --- Area Routes ---
@router.post("/area/", status_code=status.HTTP_201_CREATED)
async def create_area(
    area: AreaBase, 
    db: db_dependency,
    current_user: User = Depends(require_user_data_editor)
):
    """
    API to create a new area record.
    Requires: user_data_editor or admin role
    """
    try:
        response = village_area_controller.create_area_controller(area, db)
        return response
    except Exception as e:
        raise


@router.get("/area/", status_code=status.HTTP_200_OK)
async def read_area(
    db: db_dependency,
    area: Optional[str] = None,
    page_num: Optional[int] = 1,
    current_user: User = Depends(require_user_data_viewer)
):
    """
    API to get area records with user count and pagination.
    Requires: user_data_viewer, user_data_editor, or admin role
    """
    try:
        response = village_area_controller.get_areas_controller(db, area, page_num)
        return response
    except Exception as e:
        raise


@router.delete("/area/{area_id}", status_code=status.HTTP_200_OK)
async def delete_area(
    area_id: int, 
    db: db_dependency,
    current_user: User = Depends(require_user_data_editor)
):
    """
    API to delete an area record.
    Requires: user_data_editor or admin role
    """
    try:
        response = village_area_controller.delete_area_controller(area_id, db)
        return response
    except Exception as e:
        raise
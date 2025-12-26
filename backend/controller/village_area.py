"""
Village and Area Controller
Handles business logic orchestration for village and area operations
"""

from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from api_request_response.village_area import VillageBase, AreaBase
from manager import village_area as village_area_manager


def create_village_controller(village_data: VillageBase, db_session: Session):
    """
    Controller to create new village
    """
    try:
        # Create village through manager
        created_village = village_area_manager.create_village(db_session, village_data)
        
        # Structure the response
        response = {
            "status": "success",
            "message": "Village created successfully",
            "data": created_village
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def get_villages_controller(
    db_session: Session,
    village_filter: Optional[str] = None,
    page_num: int = 1
):
    """
    Controller to get villages with user count
    """
    try:
        # Get villages through manager
        get_response = village_area_manager.get_villages_with_user_count(
            db_session, village_filter, page_num
        )
        
        data = get_response.get('data', [])
        total_count = get_response.get('total_count')
        
        # Structure the response
        response = {
            "status": "success",
            "message": "Villages retrieved successfully",
            "total_count": total_count,
            "page_num": page_num,
            "data": data
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def delete_village_controller(village_id: int, db_session: Session):
    """
    Controller to delete village
    """
    try:
        # Check if village exists
        village_exists = village_area_manager.get_village_by_id(db_session, village_id)
        if not village_exists:
            raise HTTPException(status_code=404, detail="Village not found")
        
        # Delete village through manager
        deleted = village_area_manager.delete_village(db_session, village_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Village not found")
        
        # Structure the response
        response = {
            "status": "success",
            "message": "Village deleted successfully"
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def create_area_controller(area_data: AreaBase, db_session: Session):
    """
    Controller to create new area
    """
    try:
        # Create area through manager
        created_area = village_area_manager.create_area(db_session, area_data)
        
        # Structure the response
        response = {
            "status": "success",
            "message": "Area created successfully",
            "data": created_area
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def get_areas_controller(
    db_session: Session,
    area_filter: Optional[str] = None,
    page_num: int = 1
):
    """
    Controller to get areas with user count
    """
    try:
        # Get areas through manager
        get_response = village_area_manager.get_areas_with_user_count(
            db_session, area_filter, page_num
        )
        
        data = get_response.get('data', [])
        total_count = get_response.get('total_count')
        
        # Structure the response
        response = {
            "status": "success",
            "message": "Areas retrieved successfully",
            "total_count": total_count,
            "page_num": page_num,
            "data": data
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def delete_area_controller(area_id: int, db_session: Session):
    """
    Controller to delete area
    """
    try:
        # Check if area exists
        area_exists = village_area_manager.get_area_by_id(db_session, area_id)
        if not area_exists:
            raise HTTPException(status_code=404, detail="Area not found")
        
        # Delete area through manager
        deleted = village_area_manager.delete_area(db_session, area_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Area not found")
        
        # Structure the response
        response = {
            "status": "success",
            "message": "Area deleted successfully"
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e

"""
User Data Controller
Handles business logic orchestration for user data operations
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from models.user_data import User_data
from api_request_response.user_data import User_dataCreate, User_dataUpdate
from manager import user_data as user_data_manager


def create_user_data_controller(user_data: User_dataCreate, db_session: Session):
    """
    Controller to create new user data with business logic
    """
    try:
        # Validate area and village existence through manager
        if user_data.fk_area_id:
            area_exists = user_data_manager.check_area_exists(db_session, user_data.fk_area_id)
            if not area_exists:
                raise HTTPException(status_code=400, detail="Area ID not found")
        
        if user_data.fk_village_id:
            village_exists = user_data_manager.check_village_exists(db_session, user_data.fk_village_id)
            if not village_exists:
                raise HTTPException(status_code=400, detail="Village ID not found")

        # Create user data through manager
        created_user_data = user_data_manager.create_user_data(db_session, user_data)
        
        # Structure the response
        response = {
            "status": "success",
            "message": "User data created successfully",
            "data": created_user_data
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def get_user_data_controller(
    db_session: Session,
    page_num: int = 1,
    page_size: int = 10,
    name: Optional[str] = None,
    type_filter: Optional[List[str]] = None,
    area_ids: Optional[List[int]] = None,
    village_ids: Optional[List[int]] = None,
    user_ids: Optional[List[int]] = None,
    pdf: bool = False,
    csv: bool = False
):
    """
    Controller to get user data with filtering and pagination
    """
    try:
        # Handle PDF/CSV export
        if pdf or csv:
            export_data = user_data_manager.get_user_data_for_export(
                db_session, name, type_filter, area_ids, village_ids, user_ids, pdf, csv
            )
            return export_data

        # Get paginated user data through manager
        get_response = user_data_manager.get_user_data_paginated(
            db_session, page_num, page_size, name, type_filter, area_ids, village_ids, user_ids
        )
        
        data = get_response.get('data', [])
        total_count = get_response.get('total_count')
        
        # Structure the response
        response = {
            "status": "success",
            "message": "User data retrieved successfully",
            "page_num": page_num,
            "total_count": total_count,
            "data": [{
                "user_id": u.user_id,
                "name": u.name,
                "surname": u.surname,
                "father_or_husband_name": u.father_or_husband_name,
                "mobile_no1": u.mobile_no1,
                "mobile_no2": u.mobile_no2,
                "address": u.address,
                "state": u.state,
                "pincode": u.pincode,
                "email_id": u.email_id,
                "area": u.area.area if u.area else None,
                "village": u.village.village if u.village else None,
                "type": u.type,
                "status": u.status,
            } for u in data]
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def update_user_data_controller(user_id: int, updated_data: User_dataUpdate, db_session: Session):
    """
    Controller to update user data
    """
    try:
        # Get existing user data
        user_data = user_data_manager.get_user_data_by_id(db_session, user_id, for_update=True)
        if not user_data:
            raise HTTPException(status_code=404, detail="User data not found")
        
        # Update user data through manager
        updated_user_data = user_data_manager.update_user_data(db_session, user_id, updated_data)
        
        # Structure the response
        response = {
            "status": "success",
            "message": "User data updated successfully",
            "data": updated_user_data
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def delete_user_data_controller(user_id: int, db_session: Session):
    """
    Controller to soft delete user data
    """
    try:
        # Check if user data exists
        user_data = user_data_manager.get_user_data_by_id(db_session, user_id)
        if not user_data:
            raise HTTPException(status_code=404, detail="User data not found")
        
        # Soft delete through manager
        deleted = user_data_manager.soft_delete_user_data(db_session, user_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="User data not found")
        
        # Structure the response
        response = {
            "status": "success",
            "message": "User data deleted successfully"
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def get_user_data_stats_controller(db_session: Session):
    """
    Controller to get user data statistics
    """
    try:
        # Get stats through manager
        stats = user_data_manager.get_user_data_stats(db_session)
        
        # Structure the response
        response = {
            "status": "success",
            "message": "User data statistics retrieved successfully",
            "data": stats
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e

"""
Village and Area Manager
Handles database operations for villages and areas
"""

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy import func
from fastapi import HTTPException, status
import time

from models.village_area import Village, Area
from models.user_data import User_data
from api_request_response.village_area import VillageBase, AreaBase


def create_village(db_session: Session, village_data: VillageBase) -> Village:
    """Create new village in database"""
    try:
        db_village = Village(**village_data.dict())
        db_session.add(db_village)
        db_session.commit()
        db_session.refresh(db_village)
        return db_village
    except IntegrityError:
        db_session.rollback()
        raise HTTPException(status_code=400, detail="Village with this name already exists")


def get_village_by_id(db_session: Session, village_id: int) -> Optional[Village]:
    """Get village by ID"""
    return db_session.query(Village).filter(Village.village_id == village_id).first()


def get_villages_with_user_count(
    db_session: Session,
    village_filter: Optional[str] = None,
    page_num: int = 1,
    page_size: int = 10
):
    """Get villages with user count and pagination"""
    try:
        offset = page_size * (page_num - 1)

        # Query with user_data count
        query = db_session.query(
            Village.village_id,
            Village.village,
            func.count(User_data.user_id).label("user_count")
        ).outerjoin(
            User_data,
            (Village.village_id == User_data.fk_village_id) &
            ((User_data.delete_flag == False) | (User_data.delete_flag == None))
        ).group_by(
            Village.village_id,
            Village.village
        )

        if village_filter:
            query = query.filter(Village.village.ilike(f"%{village_filter}%"))

        result = query.order_by(Village.village).offset(offset).limit(page_size).all()

        # Get total count with retry logic
        max_retries = 3
        total_count = 0

        for attempt in range(max_retries):
            try:
                if village_filter:
                    total_count = db_session.query(Village).filter(
                        Village.village.ilike(f"%{village_filter}%")
                    ).count()
                else:
                    total_count = db_session.query(Village).count()
                break
            except OperationalError as e:
                if attempt < max_retries - 1:
                    time.sleep(0.1 * (attempt + 1))
                    continue
                else:
                    total_count = len(result) if len(result) < page_size else (page_num * page_size)

        return {
            "message": "Villages fetched successfully.",
            "total_count": total_count,
            "page_num": page_num,
            "data": [{
                "village_id": r.village_id,
                "village": r.village,
                "user_count": r.user_count
            } for r in result]
        }

    except OperationalError as e:
        raise HTTPException(
            status_code=503,
            detail="Database connection temporarily unavailable. Please try again."
        )


def delete_village(db_session: Session, village_id: int) -> bool:
    """Delete village by ID"""
    try:
        db_village = db_session.query(Village).filter(Village.village_id == village_id).first()
        if not db_village:
            return False
        
        db_session.delete(db_village)
        db_session.commit()
        return True
        
    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error deleting village")


def create_area(db_session: Session, area_data: AreaBase) -> Area:
    """Create new area in database"""
    try:
        db_area = Area(**area_data.dict())
        db_session.add(db_area)
        db_session.commit()
        db_session.refresh(db_area)
        return db_area
    except IntegrityError:
        db_session.rollback()
        raise HTTPException(status_code=400, detail="Area with this name already exists")


def get_area_by_id(db_session: Session, area_id: int) -> Optional[Area]:
    """Get area by ID"""
    return db_session.query(Area).filter(Area.area_id == area_id).first()


def get_areas_with_user_count(
    db_session: Session,
    area_filter: Optional[str] = None,
    page_num: int = 1,
    page_size: int = 10
):
    """Get areas with user count and pagination"""
    try:
        offset = page_size * (page_num - 1)

        # Query with user_data count
        query = db_session.query(
            Area.area_id,
            Area.area,
            func.count(User_data.user_id).label("user_count")
        ).outerjoin(
            User_data, 
            (Area.area_id == User_data.fk_area_id) & 
            ((User_data.delete_flag == False) | (User_data.delete_flag == None))
        ).group_by(
            Area.area_id,
            Area.area
        )

        if area_filter:
            query = query.filter(Area.area.ilike(f"%{area_filter}%"))

        total_count = db_session.query(Area).count()
        result = query.order_by(Area.area).offset(offset).limit(page_size).all()

        return {
            "message": "Areas fetched successfully.",
            "total_count": total_count, 
            "page_num": page_num, 
            "data": [{
                "area_id": r.area_id,
                "area": r.area,
                "user_count": r.user_count
            } for r in result]
        }

    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching areas")


def delete_area(db_session: Session, area_id: int) -> bool:
    """Delete area by ID"""
    try:
        db_area = db_session.query(Area).filter(Area.area_id == area_id).first()
        if not db_area:
            return False
        
        db_session.delete(db_area)
        db_session.commit()
        return True
        
    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error deleting area")
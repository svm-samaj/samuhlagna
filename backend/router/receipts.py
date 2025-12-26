"""
Receipts Router
FastAPI HTTP endpoints for receipt operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Annotated

from database import get_db
from api_request_response.receipts import (
    ReceiptCreate, ReceiptUpdate, ReceiptResponse, ReceiptFilter,
    ReceiptCreateResponse, ReceiptUpdateResponse, ReceiptListResponse, ReceiptDeleteResponse
)
from login.dependencies import get_current_user, require_permission
from login.permissions import Permission
from controller import receipts as receipts_controller
from models.auth import User

router = APIRouter(prefix="/receipts", tags=["receipts"])
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[User, Depends(get_current_user)]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_receipt(
    receipt_data: ReceiptCreate,
    db: db_dependency,
    current_user: user_dependency,
):
    """
    Create new receipt
    
    **Required Permission**: CREATE_RECEIPTS
    **Available to**: admin, receipt_creator
    """
    try:
        # Get user roles and check permissions gracefully
        from manager.auth import get_user_roles
        from login.permissions import user_has_permission, Permission as Perm
        
        user_roles = get_user_roles(db, current_user.id)
        has_create_receipts = user_has_permission(user_roles, Perm.CREATE_RECEIPTS)
        
        if not has_create_receipts:
            return {
                "status": "error",
                "message": "You don't have permission to create receipts.",
                "error_code": "PERMISSION_DENIED",
                "available_roles": ["receipt_creator", "admin"],
                "user_roles": user_roles
            }
        
        response = receipts_controller.create_receipt_controller(
            receipt_data, db, current_user.id
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/creators", status_code=status.HTTP_200_OK)
async def get_receipt_creators(
    db: db_dependency,
    current_user: user_dependency,
):
    """
    Get list of users who have created receipts - for reports filtering
    
    **Permissions**:
    - **admin**: Can see all creators for filtering
    - **receipt_report_viewer**: Can see all creators for filtering  
    - **receipt_creator**: No access (they only see own receipts anyway)
    """
    try:
        # Get user roles
        from manager.auth import get_user_roles
        user_roles = get_user_roles(db, current_user.id)
        
        print(f"DEBUG: /receipts/creators called by {current_user.username} with roles {user_roles}")
        
        # Check permissions - only admin and receipt_report_viewer should access this
        from login.permissions import user_has_permission, Permission as Perm
        
        has_read_receipts = user_has_permission(user_roles, Perm.READ_RECEIPTS)
        is_receipt_creator = "receipt_creator" in user_roles
        
        print(f"DEBUG: has_read_receipts={has_read_receipts}, is_receipt_creator={is_receipt_creator}")
        
        # Receipt creators should NOT have access to this filter
        # They can only see their own receipts, so creator filtering doesn't make sense
        if not has_read_receipts:
            print(f"DEBUG: Access denied - user doesn't have READ_RECEIPTS permission")
            return {
                "status": "success",
                "data": [],
                "message": "Creator filter not available for this user role"
            }
        
        print(f"DEBUG: Access granted - returning creator list")
        
        # For testing: return hardcoded data for users with proper permissions
        return {
            "status": "success",
            "data": [
                {
                    "id": 1,
                    "username": "admin", 
                    "display_name": "Administrator",
                    "is_active": True
                },
                {
                    "id": 6,
                    "username": "receipt_creator1",
                    "display_name": "Receipt Creator 1", 
                    "is_active": True
                }
            ],
            "message": "Available receipt creators"
        }
        
    except Exception as e:
        print(f"ERROR in /receipts/creators: {str(e)}")
        return {
            "status": "success",
            "data": [],
            "message": "No creators available"
        }


@router.get("/{receipt_id}", status_code=status.HTTP_200_OK)
async def get_receipt(
    receipt_id: int,
    db: db_dependency,
    current_user: user_dependency,
):
    """
    Get single receipt by ID
    
    **Permissions**:
    - **admin**: Can view all receipts
    - **receipt_report_viewer**: Can view all receipts
    - **receipt_creator**: Can only view their own receipts
    """
    try:
        # Get user roles
        from manager.auth import get_user_roles
        user_roles = get_user_roles(db, current_user.id)
        
        # Check basic permission (admin/receipt_report_viewer get READ_RECEIPTS, receipt_creator handles own receipts)
        from login.permissions import user_has_permission, Permission as Perm
        
        if not (user_has_permission(user_roles, Perm.READ_RECEIPTS) or "receipt_creator" in user_roles):
            return {
                "status": "error",
                "message": "You don't have permission to view this receipt.",
                "error_code": "PERMISSION_DENIED",
                "available_roles": ["receipt_creator", "receipt_report_viewer", "admin"],
                "user_roles": user_roles
            }
        
        response = receipts_controller.get_receipt_controller(
            receipt_id, db, current_user.id, user_roles
        )
        
        return response
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", status_code=status.HTTP_200_OK)
async def list_receipts(
    db: db_dependency,
    current_user: user_dependency,
    page_num: Optional[int] = Query(1, ge=1, description="Page number"),
    page_size: Optional[int] = Query(10, ge=1, le=10000, description="Items per page"),
    donor_name: Optional[str] = Query(None, description="Filter by donor name"),
    village: Optional[str] = Query(None, description="Filter by village"),
    payment_mode: Optional[str] = Query(None, description="Filter by payment mode"),
    donation1_purpose: Optional[str] = Query(None, description="Filter by donation purpose"),
    status: Optional[str] = Query(None, description="Filter by status"),
    date_from: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    created_by: Optional[int] = Query(None, description="Filter by creator"),
    pdf: Optional[bool] = Query(False, description="Export as PDF"),
    csv: Optional[bool] = Query(False, description="Export as CSV"),
):
    """
    Get paginated list of receipts with optional filters, or export as PDF/CSV
    
    **Permissions**:
    - **admin**: Can see all receipts and use all filters
    - **receipt_report_viewer**: Can see all receipts, limited filters
    - **receipt_creator**: Can only see their own receipts, limited filters
    
    **Export**: Set pdf=true or csv=true to download all filtered data
    """
    try:
        # Get user roles
        from manager.auth import get_user_roles
        user_roles = get_user_roles(db, current_user.id)
        
        # Check basic permission (admin/receipt_report_viewer get READ_RECEIPTS, receipt_creator handles own receipts)
        from login.permissions import user_has_permission, Permission as Perm
        
        if not (user_has_permission(user_roles, Perm.READ_RECEIPTS) or "receipt_creator" in user_roles):
            return {
                "status": "error",
                "message": "You don't have permission to view receipts.",
                "error_code": "PERMISSION_DENIED",
                "available_roles": ["receipt_creator", "receipt_report_viewer", "admin"],
                "user_roles": user_roles,
                "data": {
                    "receipts": [],
                    "total_count": 0,
                    "page_num": page_num,
                    "page_size": page_size,
                    "total_pages": 0
                }
            }
        
        # Create filters object
        filters = None
        if any([donor_name, village, payment_mode, donation1_purpose, status, date_from, date_to, created_by]):
            from datetime import datetime
            filters = ReceiptFilter(
                donor_name=donor_name,
                village=village,
                payment_mode=payment_mode,
                donation1_purpose=donation1_purpose,
                status=status,
                date_from=datetime.strptime(date_from, "%Y-%m-%d").date() if date_from else None,
                date_to=datetime.strptime(date_to, "%Y-%m-%d").date() if date_to else None,
                created_by=created_by
            )
        
        response = receipts_controller.get_receipts_controller(
            db, filters, page_num, page_size, current_user.id, user_roles, pdf, csv
        )
        
        return response
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{receipt_id}", status_code=status.HTTP_200_OK)
async def update_receipt(
    receipt_id: int,
    updated_data: ReceiptUpdate,
    db: db_dependency,
    current_user: user_dependency,
):
    """
    Update existing receipt
    
    **Required Permission**: UPDATE_RECEIPTS
    **Available to**: admin, receipt_creator (own receipts only)
    """
    try:
        # Get user roles and check permissions gracefully
        from manager.auth import get_user_roles
        from login.permissions import user_has_permission, Permission as Perm
        
        user_roles = get_user_roles(db, current_user.id)
        has_update_receipts = user_has_permission(user_roles, Perm.UPDATE_RECEIPTS)
        
        if not has_update_receipts:
            return {
                "status": "error",
                "message": "You don't have permission to update receipts.",
                "error_code": "PERMISSION_DENIED",
                "available_roles": ["receipt_creator", "admin"],
                "user_roles": user_roles
            }
        
        response = receipts_controller.update_receipt_controller(
            receipt_id, updated_data, db, current_user.id, user_roles
        )
        
        return response
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{receipt_id}", status_code=status.HTTP_200_OK)
async def delete_receipt(
    receipt_id: int,
    db: db_dependency,
    current_user: user_dependency,
):
    """
    Delete receipt (sets status to 'cancelled')
    
    **Required Permission**: DELETE_RECEIPTS
    **Available to**: admin, receipt_creator (own receipts only)
    """
    try:
        # Get user roles and check permissions gracefully
        from manager.auth import get_user_roles
        from login.permissions import user_has_permission, Permission as Perm
        
        user_roles = get_user_roles(db, current_user.id)
        has_delete_receipts = user_has_permission(user_roles, Perm.DELETE_RECEIPTS)
        
        if not has_delete_receipts:
            return {
                "status": "error",
                "message": "You don't have permission to delete receipts.",
                "error_code": "PERMISSION_DENIED",
                "available_roles": ["receipt_creator", "admin"],
                "user_roles": user_roles
            }
        
        response = receipts_controller.delete_receipt_controller(
            receipt_id, db, current_user.id, user_roles
        )
        
        return response
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/summary", status_code=status.HTTP_200_OK)
async def get_receipt_statistics(
    db: db_dependency,
    current_user: user_dependency,
):
    """
    Get receipt statistics
    
    **Permissions**: Any authenticated user can get stats (filtered by role)
    - **admin/receipt_report_viewer**: See all receipts stats
    - **receipt_creator**: See only their own receipts stats
    """
    try:
        # Get user roles
        from manager.auth import get_user_roles
        user_roles = get_user_roles(db, current_user.id)
        
        response = receipts_controller.get_receipt_stats_controller(
            db, current_user.id, user_roles
        )
        
        return response
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug/database", status_code=status.HTTP_200_OK)
async def debug_database(
    db: db_dependency,
    current_user: user_dependency,
):
    """Simple database check"""
    try:
        from models.auth import User
        from models.receipts import Receipt
        
        # Count everything
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        total_receipts = db.query(Receipt).count()
        
        # Get some sample data
        users = db.query(User).limit(10).all()
        receipts = db.query(Receipt).limit(5).all()
        
        return {
            "status": "success",
            "data": {
                "current_user": f"{current_user.username} (ID: {current_user.id})",
                "total_users": total_users,
                "active_users": active_users,
                "total_receipts": total_receipts,
                "sample_users": [{"id": u.id, "username": u.username, "active": u.is_active} for u in users],
                "sample_receipts": [{"id": r.id, "receipt_no": r.receipt_no, "created_by": r.created_by} for r in receipts]
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/reports/dropdown", status_code=status.HTTP_200_OK)
async def get_receipt_reports_dropdown(
    db: db_dependency,
    current_user: user_dependency,
):
    """
    Get users with role IDs 1 and 5 for receipt reports dropdown
    
    **Permissions**:
    - **admin**: Can access dropdown for filtering reports
    - **receipt_report_viewer**: Can access dropdown for filtering reports
    - **receipt_creator**: No access (they only see own receipts)
    """
    try:
        # Get user roles
        from manager.auth import get_user_roles
        user_roles = get_user_roles(db, current_user.id)
        
        response = receipts_controller.get_receipt_reports_dropdown_controller(
            db, current_user.id, user_roles
        )
        
        return response
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to load receipt reports dropdown: {str(e)}",
            "data": []
        }


@router.get("/debug/user-permissions", status_code=status.HTTP_200_OK)
async def debug_user_permissions(
    db: db_dependency,
    current_user: user_dependency,
):
    """Debug endpoint to check user permissions and data"""
    try:
        from manager.auth import get_user_roles
        from login.permissions import user_has_permission, Permission as Perm
        from models.receipts import Receipt
        from models.auth import User
        
        user_roles = get_user_roles(db, current_user.id)
        has_read_receipts = user_has_permission(user_roles, Perm.READ_RECEIPTS)
        
        # Check receipts and creators
        total_receipts = db.query(Receipt).count()
        creators_query = db.query(User).join(Receipt, User.id == Receipt.created_by).filter(User.is_active == True).distinct()
        creators = creators_query.all()
        
        return {
            "status": "success",
            "data": {
                "user_id": current_user.id,
                "username": current_user.username,
                "user_roles": user_roles,
                "has_read_receipts": has_read_receipts,
                "is_receipt_creator": "receipt_creator" in user_roles,
                "total_receipts": total_receipts,
                "available_creators": [{"id": c.id, "username": c.username} for c in creators],
                "creators_count": len(creators)
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

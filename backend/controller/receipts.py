"""
Receipts Controller
Handles business logic orchestration for receipt operations
"""

import logging
from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from manager import receipts as receipts_manager
from api_request_response.receipts import ReceiptCreate, ReceiptUpdate, ReceiptFilter

# Setup logger
logger = logging.getLogger(__name__)


def create_receipt_controller(receipt_data: ReceiptCreate, db_session: Session, user_id: int):
    """
    Controller to create new receipt
    
    Args:
        receipt_data: Receipt creation data
        db_session: Database session
        user_id: ID of user creating the receipt
        
    Returns:
        Response dictionary with created receipt data
    """
    try:
        # Create receipt through manager
        created_receipt = receipts_manager.create_receipt(db_session, receipt_data, user_id)
        
        # Get creator username
        creators_map = receipts_manager.get_creators_usernames(db_session, [created_receipt.created_by])
        
        # Convert receipt to dictionary with creator username
        receipt_dict = {
            "id": created_receipt.id,
            "receipt_no": created_receipt.receipt_no,
            "receipt_date": created_receipt.receipt_date,
            "donor_name": created_receipt.donor_name,
            "village": created_receipt.village,
            "residence": created_receipt.residence,
            "mobile": created_receipt.mobile,
            "relation_address": created_receipt.relation_address,
            "payment_mode": created_receipt.payment_mode,
            "payment_details": created_receipt.payment_details,
            "donation1_purpose": created_receipt.donation1_purpose,
            "donation1_amount": float(created_receipt.donation1_amount) if created_receipt.donation1_amount else 0.0,
            "donation2_amount": float(created_receipt.donation2_amount) if created_receipt.donation2_amount else 0.0,
            "total_amount": float(created_receipt.total_amount),
            "total_amount_words": created_receipt.total_amount_words,
            "status": created_receipt.status,
            "created_by": created_receipt.created_by,
            "created_by_username": creators_map.get(created_receipt.created_by, f"User{created_receipt.created_by}"),
            "created_at": created_receipt.created_at,
            "updated_at": created_receipt.updated_at
        }
        
        response = {
            "status": "success", 
            "message": "Receipt created successfully",
            "data": receipt_dict
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def get_receipt_controller(receipt_id: int, db_session: Session, user_id: int, user_roles: List[str]):
    """
    Controller to get single receipt by ID
    
    Args:
        receipt_id: Receipt ID
        db_session: Database session
        user_id: Current user ID
        user_roles: Current user roles
        
    Returns:
        Response dictionary with receipt data
    """
    try:
        # Get receipt
        receipt = receipts_manager.get_receipt_by_id(db_session, receipt_id)
        
        if not receipt:
            raise HTTPException(status_code=404, detail="Receipt not found")
        
        # Check permissions for receipt_creator
        # Ensure both values are integers for proper comparison
        current_user_id = int(user_id)
        receipt_creator_id = int(receipt.created_by)
        
        if "receipt_creator" in user_roles and receipt_creator_id != current_user_id:
            raise HTTPException(status_code=403, detail="You can only view your own receipts")
        
        # Get creator username
        creators_map = receipts_manager.get_creators_usernames(db_session, [receipt.created_by])
        
        # Convert receipt to dictionary with creator username
        receipt_dict = {
            "id": receipt.id,
            "receipt_no": receipt.receipt_no,
            "receipt_date": receipt.receipt_date,
            "donor_name": receipt.donor_name,
            "village": receipt.village,
            "residence": receipt.residence,
            "mobile": receipt.mobile,
            "relation_address": receipt.relation_address,
            "payment_mode": receipt.payment_mode,
            "payment_details": receipt.payment_details,
            "donation1_purpose": receipt.donation1_purpose,
            "donation1_amount": float(receipt.donation1_amount) if receipt.donation1_amount else 0.0,
            "donation2_amount": float(receipt.donation2_amount) if receipt.donation2_amount else 0.0,
            "total_amount": float(receipt.total_amount),
            "total_amount_words": receipt.total_amount_words,
            "status": receipt.status,
            "created_by": receipt.created_by,
            "created_by_username": creators_map.get(receipt.created_by, f"User{receipt.created_by}"),
            "created_at": receipt.created_at,
            "updated_at": receipt.updated_at
        }
        
        response = {
            "status": "success",
            "message": "Receipt retrieved successfully",
            "data": receipt_dict
        }
        
        return response
        
    except Exception as e:
        if not isinstance(e, HTTPException):
            db_session.rollback()
        raise e


def get_receipts_controller(
    db_session: Session,
    filters: Optional[ReceiptFilter] = None,
    page_num: int = 1,
    page_size: int = 10,
    user_id: Optional[int] = None,
    user_roles: Optional[List[str]] = None,
    pdf: bool = False,
    csv: bool = False
):
    """
    Controller to get receipts with pagination and filtering, or export as PDF/CSV
    
    Args:
        db_session: Database session
        filters: Optional filters to apply
        page_num: Page number
        page_size: Items per page
        user_id: Current user ID
        user_roles: Current user roles
        pdf: Export as PDF
        csv: Export as CSV
        
    Returns:
        Response dictionary with paginated receipts or StreamingResponse for exports
    """
    try:
        # Handle PDF/CSV export
        if pdf or csv:
            export_data = receipts_manager.get_receipts_for_export(
                db_session, filters, user_id, user_roles, pdf, csv
            )
            return export_data

        # Get receipts from manager
        result = receipts_manager.get_receipts_paginated(
            db_session, filters, page_num, page_size, user_id, user_roles
        )
        
        # Get creator usernames for the receipts
        creator_ids = list(set([receipt.created_by for receipt in result["data"]]))
        creators_map = receipts_manager.get_creators_usernames(db_session, creator_ids)
        
        # Convert receipt objects to dictionaries with creator usernames
        receipts_data = []
        for receipt in result["data"]:
            receipt_dict = {
                "id": receipt.id,
                "receipt_no": receipt.receipt_no,
                "receipt_date": receipt.receipt_date,
                "donor_name": receipt.donor_name,
                "village": receipt.village,
                "residence": receipt.residence,
                "mobile": receipt.mobile,
                "relation_address": receipt.relation_address,
                "payment_mode": receipt.payment_mode,
                "payment_details": receipt.payment_details,
                "donation1_purpose": receipt.donation1_purpose,
                "donation1_amount": float(receipt.donation1_amount) if receipt.donation1_amount else 0.0,
                "donation2_amount": float(receipt.donation2_amount) if receipt.donation2_amount else 0.0,
                "total_amount": float(receipt.total_amount),
                "total_amount_words": receipt.total_amount_words,
                "status": receipt.status,
                "created_by": receipt.created_by,
                "created_by_username": creators_map.get(receipt.created_by, f"User{receipt.created_by}"),
                "created_at": receipt.created_at,
                "updated_at": receipt.updated_at
            }
            receipts_data.append(receipt_dict)
        
        response = {
            "status": "success",
            "message": "Receipts retrieved successfully",
            "total_count": result["total_count"],
            "page_num": result["page_num"],
            "page_size": result["page_size"],
            "data": receipts_data
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def update_receipt_controller(receipt_id: int, updated_data: ReceiptUpdate, db_session: Session, user_id: int, user_roles: List[str]):
    """
    Controller to update receipt
    
    Args:
        receipt_id: Receipt ID to update
        updated_data: Updated receipt data
        db_session: Database session
        user_id: Current user ID
        user_roles: Current user roles
        
    Returns:
        Response dictionary with updated receipt data
    """
    try:
        # Update receipt through manager
        updated_receipt = receipts_manager.update_receipt(db_session, receipt_id, updated_data, user_id, user_roles)
        
        # Get creator username
        creators_map = receipts_manager.get_creators_usernames(db_session, [updated_receipt.created_by])
        
        # Convert receipt to dictionary with creator username
        receipt_dict = {
            "id": updated_receipt.id,
            "receipt_no": updated_receipt.receipt_no,
            "receipt_date": updated_receipt.receipt_date,
            "donor_name": updated_receipt.donor_name,
            "village": updated_receipt.village,
            "residence": updated_receipt.residence,
            "mobile": updated_receipt.mobile,
            "relation_address": updated_receipt.relation_address,
            "payment_mode": updated_receipt.payment_mode,
            "payment_details": updated_receipt.payment_details,
            "donation1_purpose": updated_receipt.donation1_purpose,
            "donation1_amount": float(updated_receipt.donation1_amount) if updated_receipt.donation1_amount else 0.0,
            "donation2_amount": float(updated_receipt.donation2_amount) if updated_receipt.donation2_amount else 0.0,
            "total_amount": float(updated_receipt.total_amount),
            "total_amount_words": updated_receipt.total_amount_words,
            "status": updated_receipt.status,
            "created_by": updated_receipt.created_by,
            "created_by_username": creators_map.get(updated_receipt.created_by, f"User{updated_receipt.created_by}"),
            "created_at": updated_receipt.created_at,
            "updated_at": updated_receipt.updated_at
        }
        
        response = {
            "status": "success",
            "message": "Receipt updated successfully", 
            "data": receipt_dict
        }
        
        return response
        
    except Exception as e:
        if not isinstance(e, HTTPException):
            db_session.rollback()
        raise e


def delete_receipt_controller(receipt_id: int, db_session: Session, user_id: int, user_roles: List[str]):
    """
    Controller to delete receipt (sets status to cancelled)
    
    Args:
        receipt_id: Receipt ID to delete
        db_session: Database session
        user_id: Current user ID
        user_roles: Current user roles
        
    Returns:
        Response dictionary
    """
    try:
        # Delete receipt through manager
        deleted = receipts_manager.delete_receipt(db_session, receipt_id, user_id, user_roles)
        
        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete receipt")
        
        response = {
            "status": "success",
            "message": "Receipt cancelled successfully"
        }
        
        return response
        
    except Exception as e:
        if not isinstance(e, HTTPException):
            db_session.rollback()
        raise e


def get_receipt_stats_controller(db_session: Session, user_id: int, user_roles: List[str]):
    """
    Controller to get receipt statistics
    
    Args:
        db_session: Database session
        user_id: Current user ID
        user_roles: Current user roles
        
    Returns:
        Response dictionary with statistics
    """
    try:
        # Get stats from manager
        stats = receipts_manager.get_receipt_stats(db_session, user_id, user_roles)
        
        response = {
            "status": "success",
            "message": "Receipt statistics retrieved successfully",
            "data": stats
        }
        
        return response
        
    except Exception as e:
        db_session.rollback()
        raise e


def get_receipt_creators_controller(db_session: Session, user_id: int, user_roles: List[str]):
    """
    Controller to get list of users who have created receipts
    
    Args:
        db_session: Database session
        user_id: Current user ID
        user_roles: Current user roles
        
    Returns:
        List of receipt creators with their basic info
    """
    try:
        print(f"DEBUG: Controller - Getting receipt creators for user {user_id} with roles {user_roles}")
        
        creators = receipts_manager.get_receipt_creators(db_session, user_id, user_roles)
        
        print(f"DEBUG: Controller - Manager returned {len(creators) if creators else 0} creators")
        
        # Format response - handle empty results gracefully
        formatted_creators = []
        if creators:
            for creator in creators:
                formatted_creators.append({
                    "id": creator.id,
                    "username": creator.username,
                    "display_name": creator.username,  # You can modify this if you want different display names
                    "is_active": creator.is_active
                })
        
        print(f"DEBUG: Controller - Formatted {len(formatted_creators)} creators for response")
        
        response = {
            "status": "success",
            "data": formatted_creators,
            "message": f"Retrieved {len(formatted_creators)} receipt creators"
        }
        
        print(f"DEBUG: Controller - Final response: {response}")
        return response
        
    except Exception as e:
        print(f"ERROR: Controller - Failed to get receipt creators: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return empty result instead of raising error for graceful degradation
        return {
            "status": "success",
            "data": [],
            "message": "No creators available"
        }


def get_receipt_reports_dropdown_controller(db_session: Session, user_id: int, user_roles: List[str]):
    """
    Controller to get users with role IDs 1 and 5 for receipt reports dropdown
    
    Args:
        db_session: Database session
        user_id: Current user ID
        user_roles: Current user roles
        
    Returns:
        List of users with role IDs 1 and 5
    """
    try:
        # Check if user has permission to access reports
        from login.permissions import user_has_permission, Permission as Perm
        
        has_read_receipts = user_has_permission(user_roles, Perm.READ_RECEIPTS)
        is_admin = "admin" in user_roles
        
        # Only admin and receipt_report_viewer should access this dropdown
        # receipt_creator doesn't need this since they only see their own receipts
        if not (has_read_receipts or is_admin):
            return {
                "status": "error",
                "message": "You don't have permission to access receipt reports dropdown.",
                "error_code": "PERMISSION_DENIED",
                "data": []
            }
        
        # Get users with role IDs 1 and 5
        users = receipts_manager.get_users_by_role_ids(db_session, [1, 5])
        
        response = {
            "status": "success",
            "data": users,
            "message": f"Retrieved {len(users)} users for receipt reports dropdown"
        }
        
        return response
        
    except Exception as e:
        print(f"ERROR: Controller - Failed to get receipt reports dropdown: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": "Failed to load dropdown data",
            "data": []
        }
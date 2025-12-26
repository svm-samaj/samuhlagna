"""
Receipts API Schemas
Request/Response models for receipt endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


# Receipt Request Models
class ReceiptCreate(BaseModel):
    """Request model for creating new receipt"""
    receipt_date: date
    donor_name: str = Field(..., min_length=1, max_length=255)
    village: Optional[str] = Field(None, max_length=255)
    residence: Optional[str] = Field(None, max_length=255)
    mobile: Optional[str] = Field(None, max_length=15)
    relation_address: Optional[str] = None
    payment_mode: str = Field(..., pattern="^(Cash|Check|Online)$")
    payment_details: Optional[str] = Field(None, max_length=500)
    donation1_purpose: Optional[str] = Field(None, max_length=500)
    donation1_amount: Optional[float] = Field(0.00, ge=0)
    donation2_amount: Optional[float] = Field(0.00, ge=0)
    total_amount: float = Field(..., gt=0)
    total_amount_words: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "receipt_date": "2025-11-30",
                "donor_name": "John Doe",
                "village": "Village Name",
                "residence": "Residence Address",
                "mobile": "9876543210",
                "relation_address": "Address or relation",
                "payment_mode": "Cash",
                "payment_details": "Cash payment details",
                "donation1_purpose": "Temple construction",
                "donation1_amount": 1000.00,
                "donation2_amount": 500.00,
                "total_amount": 1500.00,
                "total_amount_words": "One thousand five hundred only"
            }
        }


class ReceiptUpdate(BaseModel):
    """Request model for updating existing receipt"""
    receipt_date: Optional[date] = None
    donor_name: Optional[str] = Field(None, min_length=1, max_length=255)
    village: Optional[str] = Field(None, max_length=255)
    residence: Optional[str] = Field(None, max_length=255)
    mobile: Optional[str] = Field(None, max_length=15)
    relation_address: Optional[str] = None
    payment_mode: Optional[str] = Field(None, pattern="^(Cash|Check|Online)$")
    payment_details: Optional[str] = Field(None, max_length=500)
    donation1_purpose: Optional[str] = Field(None, max_length=500)
    donation1_amount: Optional[float] = Field(None, ge=0)
    donation2_amount: Optional[float] = Field(None, ge=0)
    total_amount: Optional[float] = Field(None, gt=0)
    total_amount_words: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(completed|cancelled)$")


# Receipt Response Models
class ReceiptResponse(BaseModel):
    """Response model for receipt data"""
    id: int
    receipt_no: str
    receipt_date: date
    donor_name: str
    village: Optional[str] = None
    residence: Optional[str] = None
    mobile: Optional[str] = None
    relation_address: Optional[str] = None
    payment_mode: str
    payment_details: Optional[str] = None
    donation1_purpose: Optional[str] = None
    donation1_amount: float
    donation2_amount: float
    total_amount: float
    total_amount_words: Optional[str] = None
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # For Pydantic V2 compatibility


class ReceiptListResponse(BaseModel):
    """Response model for paginated receipt list"""
    status: str = "success"
    message: str
    total_count: int
    page_num: int
    page_size: int
    data: List[ReceiptResponse]


class ReceiptCreateResponse(BaseModel):
    """Response model for receipt creation"""
    status: str = "success"
    message: str
    data: ReceiptResponse


class ReceiptUpdateResponse(BaseModel):
    """Response model for receipt update"""
    status: str = "success"
    message: str
    data: ReceiptResponse


class ReceiptDeleteResponse(BaseModel):
    """Response model for receipt deletion"""
    status: str = "success"
    message: str


# Query Parameter Models
class ReceiptFilter(BaseModel):
    """Query parameters for filtering receipts"""
    donor_name: Optional[str] = None
    village: Optional[str] = None
    payment_mode: Optional[str] = None
    donation1_purpose: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    created_by: Optional[int] = None  # For admin to filter by creator

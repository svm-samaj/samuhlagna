"""
Receipt models for the donation management system
Matches the PostgreSQL receipts table schema
"""

from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text, CheckConstraint, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Receipt(Base):
    __tablename__ = "receipts"
    
    # Primary key - PostgreSQL SERIAL
    id = Column(Integer, primary_key=True, index=True)
    
    # Receipt identification (format: RC1/2025/1234)
    receipt_no = Column(String(50), unique=True, nullable=False, index=True)
    receipt_date = Column(DateTime, nullable=False, index=True)
    
    # Donor information (person giving donation)
    donor_name = Column(String(255), nullable=False, index=True)
    village = Column(String(255))
    residence = Column(String(255))
    mobile = Column(String(15), index=True)
    relation_address = Column(Text)
    
    # Payment information
    payment_mode = Column(String(10), nullable=False)
    payment_details = Column(String(500))
    
    # Donation amounts (using Numeric for PostgreSQL DECIMAL)
    donation1_purpose = Column(String(500))
    donation1_amount = Column(Numeric(15, 2), default=0.00)
    donation2_amount = Column(Numeric(15, 2), default=0.00)
    total_amount = Column(Numeric(15, 2), nullable=False)
    total_amount_words = Column(Text)
    
    # Status tracking
    status = Column(String(10), default='completed')
    
    # User reference - links to existing auth system
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships - links to your existing User model
    creator = relationship("User", back_populates="created_receipts")
    
    # Table constraints (matching PostgreSQL CHECK constraints)
    __table_args__ = (
        CheckConstraint("payment_mode IN ('Cash', 'Check', 'Online')", name='check_payment_mode'),
        CheckConstraint("status IN ('completed', 'cancelled')", name='check_status'),
    )
    
    def __repr__(self):
        return f"<Receipt(receipt_no='{self.receipt_no}', donor='{self.donor_name}', total={self.total_amount})>"
        
    def to_dict(self):
        """Convert receipt to dictionary for API responses"""
        return {
            "id": self.id,
            "receipt_no": self.receipt_no,
            "receipt_date": self.receipt_date.isoformat() if self.receipt_date else None,
            "donor_name": self.donor_name,
            "village": self.village,
            "residence": self.residence,
            "mobile": self.mobile,
            "relation_address": self.relation_address,
            "payment_mode": self.payment_mode,
            "payment_details": self.payment_details,
            "donation1_purpose": self.donation1_purpose,
            "donation1_amount": float(self.donation1_amount) if self.donation1_amount else 0.00,
            "donation2_amount": float(self.donation2_amount) if self.donation2_amount else 0.00,
            "total_amount": float(self.total_amount),
            "total_amount_words": self.total_amount_words,
            "status": self.status,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

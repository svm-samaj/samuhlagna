"""
User Data Manager
Handles database operations for user data
"""

from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_, func
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse

from collections import defaultdict
from io import BytesIO, StringIO

from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import pandas as pd

from models.user_data import User_data
from models.village_area import Village, Area
from api_request_response.user_data import User_dataCreate, User_dataUpdate


def check_area_exists(db_session: Session, area_id: int) -> bool:
    """Check if area exists"""
    return db_session.query(Area).filter(Area.area_id == area_id).first() is not None


def check_village_exists(db_session: Session, village_id: int) -> bool:
    """Check if village exists"""
    return db_session.query(Village).filter(Village.village_id == village_id).first() is not None


def create_user_data(db_session: Session, user_data: User_dataCreate) -> User_data:
    """Create new user data in database"""
    try:
        db_user_data = User_data(**user_data.dict())
        db_session.add(db_user_data)
        db_session.commit()
        db_session.refresh(db_user_data)
        return db_user_data
    except IntegrityError:
        db_session.rollback()
        raise HTTPException(status_code=400, detail="Integrity error while creating user_data")


def get_user_data_by_id(db_session: Session, user_id: int, for_update: bool = False) -> Optional[User_data]:
    """Get user data by ID"""
    query = db_session.query(User_data).filter(User_data.user_id == user_id)
    
    if not for_update:
        query = query.filter(User_data.delete_flag == False)
    
    return query.first()


def get_user_data_paginated(
    db_session: Session,
    page_num: int = 1,
    page_size: int = 10,
    name: Optional[str] = None,
    type_filter: Optional[List[str]] = None,
    area_ids: Optional[List[int]] = None,
    village_ids: Optional[List[int]] = None,
    user_ids: Optional[List[int]] = None
):
    """Get paginated user data with filtering"""
    try:
        # Initialize query
        query = db_session.query(User_data).options(
            joinedload(User_data.area), 
            joinedload(User_data.village)
        ).filter(User_data.delete_flag == False)

        # Apply filters
        if name:
            search = f"%{name}%"
            query = query.filter(
                or_(
                    User_data.name.ilike(search),
                    User_data.father_or_husband_name.ilike(search),
                    User_data.mobile_no1.ilike(search),
                    User_data.mobile_no2.ilike(search)
                )
            )

        if type_filter:
            query = query.filter(User_data.type.in_([t.upper() for t in type_filter]))

        if area_ids:
            query = query.filter(User_data.fk_area_id.in_(area_ids))

        if village_ids:
            query = query.filter(User_data.fk_village_id.in_(village_ids))

        if user_ids:
            query = query.filter(User_data.user_id.in_(user_ids))

        # Calculate total count before pagination
        total_count = query.count()

        # Apply pagination
        offset_value = (page_num - 1) * page_size
        data = query.join(Village, User_data.fk_village_id == Village.village_id, isouter=True)\
                   .join(Area, User_data.fk_area_id == Area.area_id, isouter=True)\
                   .order_by(User_data.type, Village.village, User_data.name)\
                   .offset(offset_value).limit(page_size).all()

        return {
            "message": "User data records fetched successfully.",
            "total_count": total_count,
            "data": data
        }

    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching user data")


def update_user_data(db_session: Session, user_id: int, updated_data: User_dataUpdate) -> User_data:
    """Update user data"""
    try:
        user_data = db_session.query(User_data).filter(
            User_data.user_id == user_id, 
            User_data.delete_flag == False
        ).first()
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User Data not found")
        
        # Update fields
        for key, value in updated_data.dict(exclude_unset=True).items():
            setattr(user_data, key, value)
        
        db_session.commit()
        db_session.refresh(user_data)
        return user_data
        
    except IntegrityError:
        db_session.rollback()
        raise HTTPException(status_code=400, detail="Integrity error while updating user_data")


def soft_delete_user_data(db_session: Session, user_id: int) -> bool:
    """Soft delete user data (set delete_flag = True)"""
    try:
        user_data = db_session.query(User_data).filter(User_data.user_id == user_id).first()
        if not user_data:
            return False
        
        user_data.delete_flag = True
        db_session.commit()
        return True
        
    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error deleting user data")


def get_user_data_stats(db_session: Session) -> dict:
    """Get user data statistics"""
    try:
        # Get total count
        total_count = db_session.query(User_data).filter(User_data.delete_flag == False).count()
        
        # Get counts by type
        type_counts = db_session.query(
            User_data.type,
            func.count(User_data.user_id).label("count")
        ).filter(
            User_data.delete_flag == False
        ).group_by(User_data.type).all()
        
        # Convert to dictionary
        stats = {"total": total_count}
        for type_name, count in type_counts:
            if type_name:  # Only include non-null types
                stats[type_name.lower()] = count
        
        return stats
        
    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching user statistics")


def get_user_data_for_export(
    db_session: Session,
    name: Optional[str] = None,
    type_filter: Optional[List[str]] = None,
    area_ids: Optional[List[int]] = None,
    village_ids: Optional[List[int]] = None,
    user_ids: Optional[List[int]] = None,
    pdf: bool = False,
    csv: bool = False
):
    """Get user data for PDF/CSV export"""
    try:
        # Build query with filters
        query = db_session.query(User_data).options(
            joinedload(User_data.area), 
            joinedload(User_data.village)
        ).filter(User_data.delete_flag == False)

        # Apply same filters as pagination
        if name:
            search = f"%{name}%"
            query = query.filter(
                or_(
                    User_data.name.ilike(search),
                    User_data.father_or_husband_name.ilike(search),
                    User_data.mobile_no1.ilike(search),
                    User_data.mobile_no2.ilike(search)
                )
            )

        if type_filter:
            query = query.filter(User_data.type.in_([t.upper() for t in type_filter]))

        if area_ids:
            query = query.filter(User_data.fk_area_id.in_(area_ids))

        if village_ids:
            query = query.filter(User_data.fk_village_id.in_(village_ids))

        if user_ids:
            query = query.filter(User_data.user_id.in_(user_ids))

        # Get all data for export
        user_data = query.join(Village, User_data.fk_village_id == Village.village_id, isouter=True)\
                         .join(Area, User_data.fk_area_id == Area.area_id, isouter=True)\
                         .order_by(User_data.type, Village.village, User_data.name).all()

        if pdf:
            return generate_pdf_export(user_data)
        elif csv:
            return generate_csv_export(user_data)

    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error generating export")


def add_page_number(canvas, doc):
    """Utility function to add page numbers to PDF"""
    canvas.saveState()
    canvas.setFont('Helvetica', 10)
    canvas.drawString(270, 20, f"Page {doc.page}")
    canvas.restoreState()


def generate_pdf_export(user_data):
    """Generate PDF export of user data"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title="User Data Report", 
                          leftMargin=30, rightMargin=30, topMargin=40, bottomMargin=40)
    elements = []

    styles = getSampleStyleSheet()
    red_normal = ParagraphStyle(
        name='RedNormal', 
        parent=styles['Normal'], 
        fontName='Helvetica', 
        fontSize=11, 
        textColor=colors.red
    )
    
    table_style = TableStyle([
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.red),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ])

    # Group user data by type
    user_data_groups = defaultdict(list)
    for u in user_data:
        user_data_groups[u.type].append(u)

    # Create PDF content for each group
    for i, (user_type, group_user_data) in enumerate(user_data_groups.items()):
        if i > 0:
            elements.append(PageBreak())

        # Group block for this user_type
        group_block = []

        # Header for each type
        header_para = Paragraph(f"<b>Type: {user_type}</b>", ParagraphStyle(
            name='HeaderStyle',
            fontName='Helvetica-Bold',
            fontSize=11,
            textColor=colors.red,
            alignment=1,  # centered
            spaceAfter=10,
        ))
        group_block.append(header_para)

        # Create rows for table (2 columns per row)
        rows = []
        current_row = []
        for u in group_user_data:
            # Clean and concatenate name parts
            name_parts = [
                (u.name or '').strip(),
                (u.father_or_husband_name or '').strip(),
                (u.surname or '').strip()
            ]
            name = ' '.join(part for part in name_parts if part)
            
            # Generate user code
            village_name = u.village.village if u.village else 'UNKNOWN'
            user_code = f"SMHLGN-{u.type or 'UNKNOWN'}-{village_name}-{u.user_id}"
            
            # Create paragraph for this user
            para_text = f"""
                <b>TO: {u.area.area if u.area else ''}</b><br/>
                {name}<br/>
                {u.address or ''} - {u.pincode or ''}<br/>
                MOBILE: {u.mobile_no1 or ''} / {u.mobile_no2 or ''}<br/>
                <font size="10">{user_code}</font>
            """
            para = Paragraph(para_text, red_normal)
            
            if len(current_row) == 2:
                rows.append(current_row)
                current_row = [para]
            else:
                current_row.append(para)
        
        # Add last row if it has content
        if current_row:
            rows.append(current_row)

        # Create and style table
        table = Table(rows, colWidths=[280, 280])
        table.setStyle(table_style)
        group_block.append(table)

        # Keep the whole group together
        elements.append(KeepTogether(group_block))

    # Build PDF
    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)
    buffer.seek(0)
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": "attachment; filename=user_data_report.pdf"}
    )



def generate_csv_export(user_data):
    """Generate CSV export of user data"""
    # Prepare data for CSV export
    csv_data = []
    for u in user_data:
        # Generate user code
        village_name = u.village.village if u.village else 'UNKNOWN'
        user_code = f"SMHLGN-{u.type or 'UNKNOWN'}-{village_name}-{u.user_id}"
        
        csv_data.append({
            "User ID": u.user_id,
            "Name": u.name or "",
            "Father/Husband Name": u.father_or_husband_name or "",
            "Surname": u.surname or "",
            "Village": u.village.village if u.village else "",
            "Area": u.area.area if u.area else "",
            "Status": u.status or "",
            "Type": u.type or "",
            "Address": u.address or "",
            "Pincode": u.pincode or "",
            "State": u.state or "",
            "User Code": user_code,
            "Mother Name": getattr(u, 'mother_name', '') or "",
            "Gender": getattr(u, 'gender', '') or "",
            "Birth Date": str(getattr(u, 'birth_date', '')) if getattr(u, 'birth_date', '') else "",
            "Mobile No 1": u.mobile_no1 or "",
            "Mobile No 2": u.mobile_no2 or "",
            "Email ID": u.email_id or "",
            "Occupation": getattr(u, 'occupation', '') or "",
            "Country": getattr(u, 'country', '') or ""
        })

    # Create DataFrame and convert to CSV
    df = pd.DataFrame(csv_data)
    
    # Create CSV string buffer
    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False, encoding='utf-8')
    csv_buffer.seek(0)
    
    # Convert to bytes for streaming response
    csv_bytes = BytesIO(csv_buffer.getvalue().encode('utf-8'))
    csv_bytes.seek(0)
    
    return StreamingResponse(
        csv_bytes, 
        media_type="text/csv", 
        headers={"Content-Disposition": "attachment; filename=user_data_report.csv"}
    )
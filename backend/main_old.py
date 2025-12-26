from fastapi import FastAPI, HTTPException, Depends, status, Query
from typing import Annotated, Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from collections import defaultdict
from io import BytesIO, StringIO

from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from sqlalchemy import or_
import pandas as pd

import models
from database import engine, SessionLocal
from req_resp import *

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

# --- Village Routes ---
@app.post("/village/", status_code=status.HTTP_201_CREATED)
async def create_village(village: VillageBase, db: db_dependency):
    try:
        db_village = models.Village(**village.dict())
        db.add(db_village)
        db.commit()
        db.refresh(db_village)
        return db_village
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Village with this name already exists")

@app.get("/village/", status_code=status.HTTP_200_OK)
async def read_village(
    db: db_dependency,
    village: Optional[str] = None,
    page_num: Optional[int] = 1
):
    from sqlalchemy import func
    from sqlalchemy.exc import OperationalError
    import time
    
    offset = 10 * (page_num - 1)
    
    try:
        # Query with user_data count
        query = db.query(
            models.Village.village_id,
            models.Village.village,
            func.count(models.User_data.user_id).label("user_count")
        ).outerjoin(
            models.User_data,
            (models.Village.village_id == models.User_data.fk_village_id) &
            ((models.User_data.delete_flag == False) | (models.User_data.delete_flag == None))
        ).group_by(
            models.Village.village_id,
            models.Village.village
        )
        
        if village:
            query = query.filter(models.Village.village.ilike(f"%{village}%"))
        
        # Use a single query instead of separate count query to reduce connection load
        result = query.order_by(models.Village.village).offset(offset).limit(10).all()
        
        # Get total count with retry logic
        max_retries = 3
        total_count = 0
        
        for attempt in range(max_retries):
            try:
                if village:
                    total_count = db.query(models.Village).filter(
                        models.Village.village.ilike(f"%{village}%")
                    ).count()
                else:
                    total_count = db.query(models.Village).count()
                break
            except OperationalError as e:
                if attempt < max_retries - 1:
                    time.sleep(0.1 * (attempt + 1))  # Exponential backoff
                    continue
                else:
                    # If count fails after retries, estimate from results
                    total_count = len(result) if len(result) < 10 else (page_num * 10)
                    print(f"Count query failed after {max_retries} attempts: {str(e)}")
        
        return {
            "total_count": total_count,
            "page_num": page_num,
            "data": [{
                "village_id": r.village_id,
                "village": r.village,
                "user_count": r.user_count
            } for r in result]
        }
        
    except OperationalError as e:
        print(f"Database connection error in read_village: {str(e)}")
        raise HTTPException(
            status_code=503, 
            detail="Database connection temporarily unavailable. Please try again."
        )
@app.delete("/village/{village_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_village(village_id: int, db: db_dependency):
    db_village = db.query(models.Village).filter(models.Village.village_id == village_id).first()
    if not db_village:
        raise HTTPException(status_code=404, detail="Village not found")
    db.delete(db_village)
    db.commit()

# --- Area Routes ---
@app.post("/area/", status_code=status.HTTP_201_CREATED)
async def create_area(area: AreaBase, db: db_dependency):
    try:
        db_area = models.Area(**area.dict())
        db.add(db_area)
        db.commit()
        db.refresh(db_area)
        return db_area
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Area with this name already exists")

@app.get("/area/", status_code=status.HTTP_200_OK)
async def read_area(
    db: db_dependency,
    area: Optional[str] = None,
    page_num: Optional[int] = 1
):
    from sqlalchemy import func
    
    offset = 10 * (page_num - 1)
    
    # Query with user_data count
    query = db.query(
        models.Area.area_id,
        models.Area.area,
        func.count(models.User_data.user_id).label("user_count")
    ).outerjoin(
        models.User_data, 
        (models.Area.area_id == models.User_data.fk_area_id) & 
        ((models.User_data.delete_flag == False) | (models.User_data.delete_flag == None))
    ).group_by(
        models.Area.area_id,
        models.Area.area
    )
    
    if area:
        query = query.filter(models.Area.area.ilike(f"%{area}%"))
    
    total_count = db.query(models.Area).count()
    result = query.order_by(models.Area.area).offset(offset).limit(10).all()
    
    return {
        "total_count": total_count, 
        "page_num": page_num, 
        "data": [{
            "area_id": r.area_id,
            "area": r.area,
            "user_count": r.user_count
        } for r in result]
    }

@app.delete("/area/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_area(area_id: int, db: db_dependency):
    db_area = db.query(models.Area).filter(models.Area.area_id == area_id).first()
    if not db_area:
        raise HTTPException(status_code=404, detail="Area not found")
    db.delete(db_area)
    db.commit()

# --- User_data Routes ---
@app.post("/user_data/", status_code=status.HTTP_201_CREATED, response_model=User_dataCreate)
def create_user_data(user_data: User_dataCreate, db: db_dependency):
    if user_data.fk_area_id:
        if not db.query(models.Area).filter(models.Area.area_id == user_data.fk_area_id).first():
            raise HTTPException(status_code=400, detail="Area ID not found")
    if user_data.fk_village_id:
        if not db.query(models.Village).filter(models.Village.village_id == user_data.fk_village_id).first():
            raise HTTPException(status_code=400, detail="Village ID not found")

    try:
        db_user_data = models.User_data(**user_data.dict())
        db.add(db_user_data)
        db.commit()
        db.refresh(db_user_data)
        return db_user_data
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Integrity error while creating user_data")


# Utility: Page number for PDF
def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 10)
    canvas.drawString(270, 20, f"Page {doc.page}")
    canvas.restoreState()

@app.get("/user_data/", status_code=status.HTTP_200_OK)
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
    csv: Optional[bool] = False
):
    query = db.query(models.User_data).options(joinedload(models.User_data.area), joinedload(models.User_data.village)).filter(models.User_data.delete_flag == False)

    if name:
        search = f"%{name}%"
        query = query.filter(
            or_(
                models.User_data.name.ilike(search),
                models.User_data.father_or_husband_name.ilike(search),
                models.User_data.mobile_no1.ilike(search),
                models.User_data.mobile_no2.ilike(search)
            )
        )

    if type_filter:
        query = query.filter(models.User_data.type.in_([t.upper() for t in type_filter]))

    if area_ids:
        query = query.filter(models.User_data.fk_area_id.in_(area_ids))

    if village_ids:
        query = query.filter(models.User_data.fk_village_id.in_(village_ids))

    # Filter by specific user_data IDs if provided (for selected user_data download)
    if user_ids:
        query = query.filter(models.User_data.user_id.in_(user_ids))

    if pdf:
        user_data = (
            query
            .join(models.Village, models.User_data.fk_village_id == models.Village.village_id, isouter=True)
            .join(models.Area, models.User_data.fk_area_id == models.Area.area_id, isouter=True)
            .options(joinedload(models.User_data.area), joinedload(models.User_data.village))
            .filter(models.User_data.delete_flag == False)
            .order_by(models.User_data.type, models.Village.village, models.User_data.name)
            .all()
        )

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title="User_data Report", 
                              leftMargin=30, rightMargin=30, topMargin=40, bottomMargin=40)
        elements = []

        styles = getSampleStyleSheet()
        # Current version (previous line spacing):
        red_normal = ParagraphStyle(name='RedNormal', parent=styles['Normal'], fontName='Helvetica', fontSize=11, textColor=colors.red)
        
        # Alternative version (with extra line spacing):
        # red_normal = ParagraphStyle(name='RedNormal', parent=styles['Normal'], fontName='Helvetica', fontSize=11, textColor=colors.red, leading=14, spaceAfter=6)

        # Previous version (more congested):
        # table_style = TableStyle([
        #     ('TEXTCOLOR', (0, 0), (-1, -1), colors.red),
        #     ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        #     ('FONTSIZE', (0, 0), (-1, -1), 11),
        #     ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        #     ('TOPPADDING', (0, 0), (-1, -1), 8),
        #     ('LEFTPADDING', (0, 0), (-1, -1), 8),
        #     ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        #     ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        # ])
        
        # Current version (optimized spacing):
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

        user_data_groups = defaultdict(list)
        for u in user_data:
            user_data_groups[u.type].append(u)

        for i, (user_type, group_user_data) in enumerate(user_data_groups.items()):
            if i > 0:
                elements.append(PageBreak())

            # Group block for this user_type
            group_block = []

            # Fake header inside content flow (looks like a canvas header)
            header_para = Paragraph(f"<b>Type: {user_type}</b>", ParagraphStyle(
                name='HeaderStyle',
                fontName='Helvetica-Bold',
                fontSize=11,
                textColor=colors.red,
                alignment=1,  # centered
                spaceAfter=10,
            ))
            group_block.append(header_para)

            rows = []
            current_row = []
            for u in group_user_data:
                # Clean and concatenate name parts, avoiding extra spaces
                name_parts = [
                    (u.name or '').strip(),
                    (u.father_or_husband_name or '').strip(),
                    (u.surname or '').strip()
                ]
                name = ' '.join(part for part in name_parts if part)
                # Generate user code: SMHLGN-(Type)-(VILLAGE)-(ID)
                village_name = u.village.village if u.village else 'UNKNOWN'
                user_code = f"SMHLGN-{u.type or 'UNKNOWN'}-{village_name}-{u.user_id}"
                
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
            if current_row:
                rows.append(current_row)

            table = Table(rows, colWidths=[280, 280])
            table.setStyle(table_style)

            group_block.append(table)

            # Keep the whole group together to ensure the header stays on the same page
            elements.append(KeepTogether(group_block))


        doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=user_data_report.pdf"})

    if csv:
        user_data = (
            query
            .join(models.Village, models.User_data.fk_village_id == models.Village.village_id, isouter=True)
            .join(models.Area, models.User_data.fk_area_id == models.Area.area_id, isouter=True)
            .options(joinedload(models.User_data.area), joinedload(models.User_data.village))
            .filter(models.User_data.delete_flag == False)
            .order_by(models.User_data.type, models.Village.village, models.User_data.name)
            .all()
        )

        # Prepare data for CSV export with all columns from the show user_data table
        csv_data = []
        for u in user_data:
            # Generate user code: SMHLGN-(Type)-(VILLAGE)-(ID)
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
                "Birth Date": getattr(u, 'birth_date', '') or "",
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

    return {
        "page_num": page_num,
        "total_count": query.count(),
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
        } for u in query.join(models.Village, models.User_data.fk_village_id == models.Village.village_id, isouter=True).join(models.Area, models.User_data.fk_area_id == models.Area.area_id, isouter=True).order_by(models.User_data.type, models.Village.village, models.User_data.name).offset((page_num - 1) * page_size).limit(page_size).all()]
    }

@app.put("/user_data/{user_id}", response_model=User_dataUpdate)
def update_user_data(user_id: int, updated_user_data: User_dataUpdate, db: db_dependency):
    user_data = db.query(models.User_data).filter(models.User_data.user_id == user_id, models.User_data.delete_flag == False).first()
    if not user_data:
        raise HTTPException(status_code=404, detail="User_data not found")
    try:
        for key, value in updated_user_data.dict(exclude_unset=True).items():
            setattr(user_data, key, value)
        db.commit()
        db.refresh(user_data)
        return updated_user_data
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Integrity error while updating user_data")

@app.delete("/user_data/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_data(user_id: int, db: db_dependency):
    user_data = db.query(models.User_data).filter(models.User_data.user_id == user_id).first()
    if not user_data:
        raise HTTPException(status_code=404, detail="User_data not found")
    user_data.delete_flag = True
    db.commit()

@app.get("/user_data/stats", status_code=status.HTTP_200_OK)
def get_user_data_stats(db: db_dependency):
    from sqlalchemy import func
    
    # Get total count
    total_count = db.query(models.User_data).filter(models.User_data.delete_flag == False).count()
    
    # Get counts by type
    type_counts = db.query(
        models.User_data.type,
        func.count(models.User_data.user_id).label("count")
    ).filter(
        models.User_data.delete_flag == False
    ).group_by(models.User_data.type).all()
    
    # Convert to dictionary
    stats = {"total": total_count}
    for type_name, count in type_counts:
        if type_name:  # Only include non-null types
            stats[type_name.lower()] = count
    
    return stats

from sqlalchemy import (
    Column, Integer, String, Date, Boolean, DECIMAL,
    ForeignKey, DateTime, func, Enum as ENUM  # ← this is important
)
from sqlalchemy.orm import relationship, validates
from database import Base  # Ensure your `Base = declarative_base()` is defined in this module
from datetime import datetime


class BaseModel(Base):
    __abstract__ = True  # Prevent table creation

    @validates("area", "village")
    def validate_lowercase(self, key, value):
        return value.lower() if value else value


class Village(BaseModel):
    __tablename__ = "village"

    village_id = Column(Integer, primary_key=True, index=True)
    village = Column(String(50), unique=True, nullable=False)


class Area(BaseModel):
    __tablename__ = "area"

    area_id = Column(Integer, primary_key=True, index=True)
    area = Column(String(50), unique=True, nullable=False)

user_status_enum = ENUM(
    'Active', 'Inactive', 'Shifted', 'Passed away',
    name='user_status_enum',
    create_type=True
)

user_type_enum = ENUM(
    'NRS', 'ALL', 'COMMITEE', 'SIDDHPUR',
    name='user_type_enum',
    create_type=True
)

class User_data(Base):
    __tablename__ = "user_data"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    usercode = Column(String(50))
    name = Column(String(100))
    surname = Column(String(100))
    father_or_husband_name = Column(String(100))
    mother_name = Column(String(100))
    gender = Column(String(10))
    birth_date = Column(Date)

    mobile_no1 = Column(String(15))
    mobile_no2 = Column(String(15))

    fk_area_id = Column(Integer, ForeignKey("area.area_id"))
    fk_village_id = Column(Integer, ForeignKey("village.village_id"))

    area = relationship("Area", backref="user_data")
    village = relationship("Village", backref="user_data")

    address = Column(String(255))
    pincode = Column(String(10))
    occupation = Column(String(100))
    country = Column(String(100))
    state = Column(String(100))
    email_id = Column(String(100))

    active_flag = Column(Boolean, default=True)
    delete_flag = Column(Boolean, default=False)
    death_flag = Column(Boolean, default=False)
    receipt_flag = Column(Boolean, default=False)

    receipt_no = Column(String(50))
    receipt_date = Column(Date)
    receipt_amt = Column(DECIMAL(10, 2))

    status = Column(user_status_enum, default="Active", nullable=True)
    type = Column(user_type_enum, default="ALL", nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

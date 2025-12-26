from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import validates
from database import Base


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

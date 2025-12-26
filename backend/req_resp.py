from pydantic import BaseModel
from typing import Optional
from datetime import date


class User_dataCreate(BaseModel):
    usercode: Optional[str]
    name: str
    surname: Optional[str]
    father_or_husband_name: Optional[str]
    mother_name: Optional[str]
    gender: Optional[str]
    birth_date: Optional[date]

    mobile_no1: Optional[str]
    mobile_no2: Optional[str]

    fk_area_id: Optional[int]
    fk_village_id: Optional[int]

    address: Optional[str]
    pincode: Optional[str]
    occupation: Optional[str]
    country: Optional[str]
    state: Optional[str]
    email_id: Optional[str]

    active_flag: Optional[bool] = True
    delete_flag: Optional[bool] = False
    death_flag: Optional[bool] = False
    receipt_flag: Optional[bool] = False

    receipt_no: Optional[str]
    receipt_date: Optional[date]
    receipt_amt: Optional[float]

class User_dataUpdate(BaseModel):
    usercode: Optional[str] = None
    name: Optional[str] = None
    surname: Optional[str] = None
    father_or_husband_name: Optional[str] = None
    mother_name: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[date] = None

    mobile_no1: Optional[str] = None
    mobile_no2: Optional[str] = None

    address: Optional[str] = None
    pincode: Optional[str] = None
    occupation: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    email_id: Optional[str] = None

    fk_area_id: Optional[int] = None
    fk_village_id: Optional[int] = None
    status: Optional[str] = None  # should match enum values
    type: Optional[str] = None    # should match enum values

    class Config:
        # orm_mode = True
        from_attributes = True




class VillageBase(BaseModel):
    village: str

class AreaBase(BaseModel):
    area: str

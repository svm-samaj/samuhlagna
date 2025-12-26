from pydantic import BaseModel


class VillageBase(BaseModel):
    village: str


class AreaBase(BaseModel):
    area: str

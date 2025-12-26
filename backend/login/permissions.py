"""
Role-based Permissions
Permission definitions and role-permission mappings
"""

from enum import Enum
from typing import List, Dict


class Permission(Enum):
    """System permissions"""
    # User Data permissions
    READ_USER_DATA = "read_user_data"
    CREATE_USER_DATA = "create_user_data"
    UPDATE_USER_DATA = "update_user_data"
    DELETE_USER_DATA = "delete_user_data"
    EXPORT_USER_DATA = "export_user_data"
    
    # Village/Area permissions
    READ_VILLAGE_AREA = "read_village_area"
    CREATE_VILLAGE_AREA = "create_village_area"
    UPDATE_VILLAGE_AREA = "update_village_area"
    DELETE_VILLAGE_AREA = "delete_village_area"
    
    # Receipts permissions
    READ_RECEIPTS = "read_receipts"
    CREATE_RECEIPTS = "create_receipts"
    UPDATE_RECEIPTS = "update_receipts"
    DELETE_RECEIPTS = "delete_receipts"
    EXPORT_RECEIPTS = "export_receipts"
    
    # Admin permissions
    MANAGE_USERS = "manage_users"
    MANAGE_ROLES = "manage_roles"
    VIEW_SYSTEM_STATS = "view_system_stats"


# Role-Permission mapping based on your custom requirements
ROLE_PERMISSIONS: Dict[str, List[Permission]] = {
    "admin": [
        # Full access to everything
        Permission.READ_USER_DATA,
        Permission.CREATE_USER_DATA,
        Permission.UPDATE_USER_DATA,
        Permission.DELETE_USER_DATA,
        Permission.EXPORT_USER_DATA,
        Permission.READ_VILLAGE_AREA,
        Permission.CREATE_VILLAGE_AREA,
        Permission.UPDATE_VILLAGE_AREA,
        Permission.DELETE_VILLAGE_AREA,
        Permission.READ_RECEIPTS,
        Permission.CREATE_RECEIPTS,
        Permission.UPDATE_RECEIPTS,
        Permission.DELETE_RECEIPTS,
        Permission.EXPORT_RECEIPTS,
        Permission.MANAGE_USERS,
        Permission.MANAGE_ROLES,
        Permission.VIEW_SYSTEM_STATS,
    ],
    "user_data_editor": [
        # Full CRUD access to user data and village/area - NO receipts access
        Permission.READ_USER_DATA,
        Permission.CREATE_USER_DATA,
        Permission.UPDATE_USER_DATA,
        Permission.DELETE_USER_DATA,
        Permission.EXPORT_USER_DATA,
        Permission.READ_VILLAGE_AREA,
        Permission.CREATE_VILLAGE_AREA,
        Permission.UPDATE_VILLAGE_AREA,
        Permission.DELETE_VILLAGE_AREA,
        Permission.VIEW_SYSTEM_STATS,
    ],
    "user_data_viewer": [
        # Read-only access to user data and village/area + export - NO receipts access
        Permission.READ_USER_DATA,
        Permission.READ_VILLAGE_AREA,
        Permission.EXPORT_USER_DATA,
    ],
    "receipt_report_viewer": [
        # Can only view receipts and get reports - NO create/edit receipts
        Permission.READ_RECEIPTS,
        Permission.EXPORT_RECEIPTS,
    ],
    "receipt_creator": [
        # Can create and edit only their own receipts - NO reports access
        Permission.CREATE_RECEIPTS,
        Permission.UPDATE_RECEIPTS,
        Permission.DELETE_RECEIPTS,
    ]
}


def get_role_permissions(role: str) -> List[Permission]:
    """Get permissions for a role"""
    return ROLE_PERMISSIONS.get(role, [])


def user_has_permission(user_roles: List[str], required_permission: Permission) -> bool:
    """Check if user has required permission"""
    for role in user_roles:
        if required_permission in get_role_permissions(role):
            return True
    return False
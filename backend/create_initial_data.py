"""
Database Initialization Script
Creates initial roles, admin user, and test data for the authentication system
"""

from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models.auth import User, Role, UserRole
from models import user_data, village_area, auth
from manager import auth as auth_manager
from api_request_response.auth import UserCreate


def create_initial_roles(db: Session):
    """Create the initial roles in the database"""
    
    roles_data = [
        {
            "name": "admin",
            "description": "Full system access - can manage everything including users and roles"
        },
        {
            "name": "user_data_editor", 
            "description": "Full CRUD access to user data, villages, and areas. No receipts access."
        },
        {
            "name": "user_data_viewer",
            "description": "Read-only access to user data, villages, areas + export capabilities. No receipts access."
        },
        {
            "name": "receipt_report_viewer",
            "description": "Can view receipts and generate reports. Cannot create or edit receipts."
        },
        {
            "name": "receipt_creator",
            "description": "Can create and edit only their own receipts. No reports access."
        }
    ]
    
    print("🔧 Creating initial roles...")
    
    for role_data in roles_data:
        # Check if role already exists
        existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
        
        if not existing_role:
            role = Role(name=role_data["name"], description=role_data["description"])
            db.add(role)
            print(f"   ✅ Created role: {role_data['name']}")
        else:
            print(f"   ⚠️  Role already exists: {role_data['name']}")
    
    db.commit()
    print("✅ All roles created successfully!")


def create_admin_user(db: Session):
    """Create the initial admin user"""
    
    print("\n👑 Creating admin user...")
    
    # Check if admin user already exists
    existing_admin = db.query(User).filter(User.username == "admin").first()
    
    if existing_admin:
        print("   ⚠️  Admin user already exists!")
        return existing_admin
    
    # Create admin user
    admin_data = UserCreate(
        username="admin",
        password="admin123",  # You should change this in production!
        is_active=True,
        is_superuser=True,
        roles=["admin"]
    )
    
    try:
        admin_user = auth_manager.create_user(db, admin_data)
        print("   ✅ Admin user created successfully!")
        print("   📋 Username: admin")
        print("   🔑 Password: admin123")
        print("   ⚠️  IMPORTANT: Change the admin password in production!")
        return admin_user
    except Exception as e:
        print(f"   ❌ Error creating admin user: {e}")
        return None


def create_test_users(db: Session):
    """Create test users for each role"""
    
    print("\n👥 Creating test users...")
    
    test_users_data = [
        {
            "username": "editor1",
            "password": "editor123",
            "roles": ["user_data_editor"],
            "description": "Test user with editor permissions"
        },
        {
            "username": "viewer1", 
            "password": "viewer123",
            "roles": ["user_data_viewer"],
            "description": "Test user with viewer permissions"
        },
        {
            "username": "receipt_viewer1",
            "password": "receipt123", 
            "roles": ["receipt_report_viewer"],
            "description": "Test user for receipt viewing"
        },
        {
            "username": "receipt_creator1",
            "password": "creator123",
            "roles": ["receipt_creator"],
            "description": "Test user for receipt creation"
        }
    ]
    
    for user_data in test_users_data:
        # Check if user already exists
        existing_user = db.query(User).filter(User.username == user_data["username"]).first()
        
        if existing_user:
            print(f"   ⚠️  User already exists: {user_data['username']}")
            continue
        
        # Create user
        user_create_data = UserCreate(
            username=user_data["username"],
            password=user_data["password"],
            is_active=True,
            is_superuser=False,
            roles=user_data["roles"]
        )
        
        try:
            created_user = auth_manager.create_user(db, user_create_data)
            print(f"   ✅ Created user: {user_data['username']} ({', '.join(user_data['roles'])})")
        except Exception as e:
            print(f"   ❌ Error creating user {user_data['username']}: {e}")
    
    print("✅ Test users created successfully!")


def verify_setup(db: Session):
    """Verify that the setup was successful"""
    
    print("\n🔍 Verifying setup...")
    
    # Check roles
    roles = db.query(Role).all()
    print(f"   📋 Total roles created: {len(roles)}")
    for role in roles:
        print(f"      - {role.name}: {role.description}")
    
    # Check users
    users = db.query(User).all()
    print(f"\n   👥 Total users created: {len(users)}")
    for user in users:
        user_roles = auth_manager.get_user_roles(db, user.id)
        roles_str = ", ".join(user_roles) if user_roles else "No roles"
        superuser_str = " (SUPERUSER)" if user.is_superuser else ""
        print(f"      - {user.username}: {roles_str}{superuser_str}")
    
    print("\n✅ Setup verification complete!")


def main():
    """Main initialization function"""
    
    print("🚀 INITIALIZING AUTHENTICATION SYSTEM")
    print("=" * 50)
    
    # Create all database tables
    print("📊 Creating database tables...")
    user_data.Base.metadata.create_all(bind=engine)
    village_area.Base.metadata.create_all(bind=engine)
    auth.Base.metadata.create_all(bind=engine)
    print("✅ Database tables created!")
    
    # Initialize database session
    db = SessionLocal()
    
    try:
        # Create roles
        create_initial_roles(db)
        
        # Create admin user
        create_admin_user(db)
        
        # Create test users
        create_test_users(db)
        
        # Verify setup
        verify_setup(db)
        
        print("\n" + "=" * 50)
        print("🎉 AUTHENTICATION SYSTEM INITIALIZATION COMPLETE!")
        print("=" * 50)
        print("\n📝 Quick Start Guide:")
        print("1. Admin Login:")
        print("   Username: admin")
        print("   Password: admin123")
        print("\n2. Test Users:")
        print("   - editor1/editor123    (user_data_editor)")
        print("   - viewer1/viewer123    (user_data_viewer)")
        print("   - receipt_viewer1/receipt123    (receipt_report_viewer)")
        print("   - receipt_creator1/creator123   (receipt_creator)")
        print("\n3. API Endpoints:")
        print("   - POST /auth/login     (Login)")
        print("   - GET  /auth/me        (Get current user)")
        print("   - GET  /user_data/     (Protected - requires auth)")
        print("\n⚠️  Remember to change admin password in production!")
        
    except Exception as e:
        print(f"\n❌ Error during initialization: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()

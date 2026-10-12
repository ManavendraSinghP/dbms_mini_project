from database import SessionLocal, engine, Base
from models import AdminUser
from auth import get_password_hash

# Ensure the new table is created in Aiven
Base.metadata.create_all(bind=engine)

def seed_admin():
    db = SessionLocal()
    if not db.query(AdminUser).filter(AdminUser.username == "admin").first():
        new_admin = AdminUser(
            username="admin",
            hashed_password=get_password_hash("admin")
        )
        db.add(new_admin)
        db.commit()
        print("Default admin created successfully.")
    else:
        print("Admin user already exists.")
    db.close()

if __name__ == "__main__":
    seed_admin()
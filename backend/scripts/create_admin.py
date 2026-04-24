"""
Create initial admin user.
Usage: uv run python scripts/create_admin.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal
from app.models.user import User
from app.services.auth_service import hash_password
from sqlalchemy import select


async def main():
    email = os.environ.get("ADMIN_EMAIL", "admin@knodex.app")
    password = os.environ.get("ADMIN_PASSWORD", "")

    if not password:
        print("Set ADMIN_PASSWORD env var")
        sys.exit(1)

    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            print(f"User {email} already exists")
            return

        user = User(email=email, password_hash=hash_password(password), role="admin")
        db.add(user)
        await db.commit()
        print(f"Admin user created: {email}")


if __name__ == "__main__":
    asyncio.run(main())

"""
開發用初始化腳本：將指定 email 的 Firebase 使用者設為 admin，
並把所有 user_id=NULL 的文件歸給該使用者。

用法（在 backend 容器內）：
  uv run python scripts/bootstrap_user.py a920604a@gmail.com

或透過 docker compose：
  docker compose exec backend uv run python scripts/bootstrap_user.py a920604a@gmail.com
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func, select, update
from app.database import AsyncSessionLocal
from app.models.document import Document
from app.models.user import User


async def main(email: str) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"[✗] 找不到 {email}，請先用 Google 登入一次再執行此腳本")
            sys.exit(1)

        user.role = "admin"

        updated = await db.execute(
            update(Document)
            .where(Document.user_id.is_(None))
            .values(user_id=user.id)
            .returning(Document.id)
        )
        assigned = len(updated.fetchall())

        await db.commit()

        total = await db.scalar(
            select(func.count()).select_from(Document).where(Document.user_id == user.id)
        )

        print(f"[✓] {email}")
        print(f"    role       → admin")
        print(f"    文件已歸入 → {assigned} 筆（共 {total} 筆）")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"用法：uv run python scripts/bootstrap_user.py <email>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))

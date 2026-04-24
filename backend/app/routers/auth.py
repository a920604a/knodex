from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services import auth_service
from app.services.firebase import verify_id_token

router = APIRouter(prefix="/auth", tags=["auth"])


class FirebaseLoginRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: object
    email: str
    role: str
    pdf_limit: int
    daily_query_limit: int

    model_config = {"from_attributes": True}


@router.post("/firebase", response_model=TokenResponse)
async def firebase_login(body: FirebaseLoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        decoded = verify_id_token(body.id_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token")

    uid: str = decoded["uid"]
    email: str = decoded.get("email", "")

    result = await db.execute(select(User).where(User.firebase_uid == uid))
    user = result.scalar_one_or_none()

    if not user:
        user = User(firebase_uid=uid, email=email)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return TokenResponse(access_token=auth_service.create_access_token(user.id))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user

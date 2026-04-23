import json
import os

import firebase_admin
from firebase_admin import auth, credentials

from app.config import settings

_app: firebase_admin.App | None = None


def get_firebase_app() -> firebase_admin.App:
    global _app
    if _app is None:
        value = settings.firebase_credentials_json
        # 支援兩種格式：JSON 字串 或 檔案路徑
        if value.strip().startswith("{"):
            cred = credentials.Certificate(json.loads(value))
        else:
            cred = credentials.Certificate(value)
        _app = firebase_admin.initialize_app(cred)
    return _app


def verify_id_token(id_token: str) -> dict:
    get_firebase_app()
    return auth.verify_id_token(id_token)

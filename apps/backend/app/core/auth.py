import logging
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests
from google.oauth2 import id_token
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger("auth")

security_bearer = HTTPBearer(auto_error=False)


class AuthUser(BaseModel):
    id: str
    sub: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    role: str = "free"  # free | pro | admin


def verify_google_id_token(token: str) -> Optional[AuthUser]:
    """
    使用 Google 官方公開 JWKS 驗證 ID Token 非對稱簽章與過期狀態
    """
    if not token or not token.strip():
        return None

    settings = get_settings()
    audience = getattr(settings, "google_client_id", "") or None

    try:
        # verify_oauth2_token 自動由 Google JWKS 獲取公鑰並校驗
        idinfo = id_token.verify_oauth2_token(
            token.strip(),
            requests.Request(),
            audience=audience,
            clock_skew_in_seconds=10,
        )

        sub = idinfo.get("sub")
        email = idinfo.get("email")
        if not sub or not email:
            return None

        # 簡單辨識站長/管理員信箱或預設角色
        role = "free"
        admin_email = getattr(settings, "admin_email", "")
        if admin_email and email.lower() == admin_email.lower():
            role = "admin"

        return AuthUser(
            id=f"usr_{sub[:16]}",
            sub=sub,
            email=email,
            name=idinfo.get("name"),
            picture=idinfo.get("picture"),
            role=role,
        )
    except Exception as e:
        logger.debug("Google ID Token 驗證未通過: %s", e)
        return None


async def get_optional_user(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> Optional[AuthUser]:
    """
    可選使用者依賴項：未帶 Token 或 Token 無效時回傳 None（用於計算訪客 Rate Limit）
    """
    if not auth or not auth.credentials:
        return None
    return verify_google_id_token(auth.credentials)


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> AuthUser:
    """
    強制驗證依賴項：無效 Token 時直接拋出 401 Unauthorized
    """
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少身分驗證 Token，請登入 Google 帳號後重試",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = verify_google_id_token(auth.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google ID Token 無效或已過期，請重新登入",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

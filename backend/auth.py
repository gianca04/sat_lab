from datetime import datetime, timedelta, timezone
import os
from typing import Any, Dict, Optional

import bcrypt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import Token, TokenPayload, UserCreate, UserLogin, UserRead

load_dotenv()

# ============================================================================
# CONFIGURATION & CONSTANTS
# ============================================================================

# Secret key used for signing JWTs (reads from JWT_SECRET_KEY or API_SECRET_TOKEN)
JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY") or os.getenv("API_SECRET_TOKEN") or "sat_lab_super_secret_jwt_key_default_2026"
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# OAuth2 scheme configured for OpenAPI docs (/auth/token)
# auto_error=False allows handling both mandatory and optional token resolution
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============================================================================
# PASSWORD HASHING UTILITIES (bcrypt)
# ============================================================================

def hash_password(password: str) -> str:
    """
    Hashes a plain-text password using industry-standard bcrypt with a unique salt.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against a stored bcrypt hash.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


# ============================================================================
# JWT TOKEN UTILITIES (PyJWT)
# ============================================================================

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Encodes and signs a JSON Web Token (JWT) with standard expiration and claims.
    """
    to_encode = data.copy()
    expire_time = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire_time,
        "iat": datetime.now(timezone.utc),
    })
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates signature and expiration of a JWT token.
    Raises HTTPException(401) on invalid or expired tokens.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token ha expirado. Por favor, inicie sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar las credenciales. Token inválido.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================================
# USER AUTHENTICATION & DEPENDENCIES
# ============================================================================

def authenticate_user(db: Session, username_or_email: str, password: str) -> Optional[User]:
    """
    Looks up a user by username or email and validates their password.
    Returns the User model if valid, None otherwise.
    """
    user = (
        db.query(User)
        .filter((User.username == username_or_email) | (User.email == username_or_email))
        .first()
    )
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    token_query: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Optional dependency: returns the User if a valid Bearer token was provided
    either via Authorization header or ?token= query parameter, or None if omitted/invalid.
    """
    raw_token = token or token_query
    if not raw_token:
        return None
    try:
        payload = decode_access_token(raw_token)
        username: str = payload.get("sub")
        if not username:
            return None
        return db.query(User).filter(User.username == username).first()
    except HTTPException:
        return None


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    token_query: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency for protected endpoints.
    Enforces a valid JWT token via Bearer header or ?token= query parameter (for SSE / WebSockets)
    and retrieves the authenticated User.
    Raises HTTPException(401) if not authenticated.
    """
    raw_token = token or token_query
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Provea un token Bearer en el header Authorization o parámetro ?token=.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(raw_token)
    username: Optional[str] = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token no contiene una identidad de usuario válida (sub).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Ensures that the authenticated user account is active.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta de usuario inactiva. Contacte al administrador.",
        )
    return current_user


# ============================================================================
# AUTHENTICATION ROUTER & ENDPOINTS
# ============================================================================

@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Registers a new user account with hashed password.
    Checks uniqueness of username and email.
    """
    existing_user = db.query(User).filter(User.username == user_in.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    existing_email = db.query(User).filter(User.email == user_in.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    db_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role or "operator",
        is_active=True,
        is_superuser=False,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post(
    "/login",
    response_model=Token,
    summary="Login with JSON credentials",
)
def login_json(
    credentials: UserLogin,
    db: Session = Depends(get_db),
):
    """
    Authenticates a user via JSON payload (username/email + password).
    Returns a JWT Bearer access token.
    """
    user = authenticate_user(db, credentials.username, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario, email o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta de usuario inactiva. Contacte al administrador.",
        )

    expires_seconds = ACCESS_TOKEN_EXPIRE_MINUTES * 60
    access_token = create_access_token(
        data={
            "sub": user.username,
            "user_id": user.id,
            "email": user.email,
            "role": user.role,
        },
        expires_delta=timedelta(seconds=expires_seconds),
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_seconds,
    )


@router.post(
    "/token",
    response_model=Token,
    summary="OAuth2 Password Form token endpoint (Swagger UI compatible)",
)
def login_oauth2_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    OAuth2 compatible token login, enabling Swagger UI's 'Authorize' button.
    Accepts application/x-www-form-urlencoded (username and password).
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta de usuario inactiva. Contacte al administrador.",
        )

    expires_seconds = ACCESS_TOKEN_EXPIRE_MINUTES * 60
    access_token = create_access_token(
        data={
            "sub": user.username,
            "user_id": user.id,
            "email": user.email,
            "role": user.role,
        },
        expires_delta=timedelta(seconds=expires_seconds),
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_seconds,
    )


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get current user profile (token verification demonstration)",
)
def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """
    Example protected endpoint that validates the Bearer token and returns the current user profile.
    Other application endpoints remain unprotected for now.
    """
    return current_user

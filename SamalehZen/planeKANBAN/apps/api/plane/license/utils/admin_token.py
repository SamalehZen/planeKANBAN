import hashlib
import hmac
import json
import base64
import time
from django.conf import settings


def generate_admin_token(user_id: str, expires_in: int = 3600) -> str:
    """
    Generate a signed token for admin authentication.
    This token can be passed in URL and stored in localStorage.
    """
    payload = {
        "user_id": str(user_id),
        "exp": int(time.time()) + expires_in,
        "type": "admin_auth"
    }
    payload_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip('=')
    signature = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        payload_b64.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return f"{payload_b64}.{signature}"


def verify_admin_token(token: str) -> dict | None:
    """
    Verify and decode an admin token.
    Returns the payload if valid, None otherwise.
    """
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        expected_signature = hmac.new(
            settings.SECRET_KEY.encode('utf-8'),
            payload_b64.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected_signature):
            return None
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))
        if payload.get('type') != 'admin_auth':
            return None
        if payload.get('exp', 0) < time.time():
            return None
        return payload
    except Exception:
        return None

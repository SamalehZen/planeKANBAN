import logging

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from plane.db.models import User
from plane.authentication.utils.auth_token import verify_auth_token

diag_logger = logging.getLogger("plane.diagnostic")


class UserTokenAuthentication(BaseAuthentication):
    """
    Token-based authentication for web/space apps.
    Supports cross-origin requests where cookies cannot be shared.
    """

    def authenticate(self, request):
        diag_logger.info(f"[AUTH UserToken] Starting authentication for {request.path}")
        
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        diag_logger.info(f"[AUTH UserToken] Auth header present: {bool(auth_header)}")
        
        if not auth_header.startswith('Bearer '):
            diag_logger.info(f"[AUTH UserToken] No Bearer token found, skipping")
            return None
            
        token = auth_header[7:]
        if not token:
            diag_logger.info(f"[AUTH UserToken] Empty token after Bearer prefix")
            return None
            
        diag_logger.info(f"[AUTH UserToken] Token found, length: {len(token)}")
        diag_logger.info(f"[AUTH UserToken] Token preview: {token[:20]}...{token[-10:] if len(token) > 30 else ''}")
        
        payload = verify_auth_token(token, expected_type="user_auth")
        if not payload:
            diag_logger.warning(f"[AUTH UserToken] Token verification FAILED - invalid or expired")
            raise AuthenticationFailed('Invalid or expired auth token')
            
        diag_logger.info(f"[AUTH UserToken] Token verified, payload keys: {list(payload.keys()) if payload else 'None'}")
        
        user_id = payload.get('user_id')
        if not user_id:
            diag_logger.warning(f"[AUTH UserToken] No user_id in payload")
            raise AuthenticationFailed('Invalid token payload')
            
        diag_logger.info(f"[AUTH UserToken] Looking up user: {user_id}")
        
        try:
            user = User.objects.get(id=user_id, is_active=True)
            diag_logger.info(f"[AUTH UserToken] SUCCESS - User authenticated: {user.email}")
        except User.DoesNotExist:
            diag_logger.warning(f"[AUTH UserToken] User not found or inactive: {user_id}")
            raise AuthenticationFailed('User not found or inactive')
            
        return (user, token)

    def authenticate_header(self, request):
        return 'Bearer'

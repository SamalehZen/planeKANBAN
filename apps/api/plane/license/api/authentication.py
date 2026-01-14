import logging
from rest_framework.authentication import BaseAuthentication
from plane.db.models import User
from plane.license.utils.admin_token import verify_admin_token

diag_logger = logging.getLogger("plane.diagnostic")


class AdminTokenAuthentication(BaseAuthentication):
    """
    Token-based authentication for admin panel.
    Supports cross-origin requests where cookies cannot be shared.
    
    Returns None for invalid/expired tokens instead of raising AuthenticationFailed.
    This allows public endpoints to work even with stale tokens, while protected
    endpoints will return 403 (permission denied) via their permission classes.
    """

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None
        token = auth_header[7:]
        if not token:
            return None
        
        diag_logger.debug(f"[AUTH Token] Validating admin token for {request.path}")
        
        payload = verify_admin_token(token)
        if not payload:
            diag_logger.info(f"[AUTH Token] Invalid or expired token for {request.path}, treating as anonymous")
            return None
        
        user_id = payload.get('user_id')
        if not user_id:
            diag_logger.warning(f"[AUTH Token] Token missing user_id for {request.path}")
            return None
        
        try:
            user = User.objects.get(id=user_id, is_active=True)
            diag_logger.info(f"[AUTH Token] SUCCESS - Authenticated user: {user.email}")
            return (user, token)
        except User.DoesNotExist:
            diag_logger.warning(f"[AUTH Token] User not found or inactive for user_id: {user_id}")
            return None

    def authenticate_header(self, request):
        return 'Bearer'

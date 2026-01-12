from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from plane.db.models import User
from plane.license.utils.admin_token import verify_admin_token


class AdminTokenAuthentication(BaseAuthentication):
    """
    Token-based authentication for admin panel.
    Supports cross-origin requests where cookies cannot be shared.
    """

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None
        token = auth_header[7:]
        if not token:
            return None
        payload = verify_admin_token(token)
        if not payload:
            raise AuthenticationFailed('Invalid or expired admin token')
        user_id = payload.get('user_id')
        if not user_id:
            raise AuthenticationFailed('Invalid token payload')
        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found or inactive')
        return (user, token)

    def authenticate_header(self, request):
        return 'Bearer'

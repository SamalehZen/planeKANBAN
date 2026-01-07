from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from plane.db.models import User
from plane.authentication.utils.auth_token import verify_auth_token


class UserTokenAuthentication(BaseAuthentication):
    """
    Token-based authentication for web/space apps.
    Supports cross-origin requests where cookies cannot be shared.
    """

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None
        token = auth_header[7:]
        if not token:
            return None
        payload = verify_auth_token(token, expected_type="user_auth")
        if not payload:
            raise AuthenticationFailed('Invalid or expired auth token')
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

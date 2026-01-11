import logging

# Django imports
from django.utils import timezone
from django.db.models import Q

# Third party imports
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed

# Module imports
from plane.db.models import APIToken

diag_logger = logging.getLogger("plane.diagnostic")


class APIKeyAuthentication(authentication.BaseAuthentication):
    """
    Authentication with an API Key
    """

    www_authenticate_realm = "api"
    media_type = "application/json"
    auth_header_name = "X-Api-Key"

    def get_api_token(self, request):
        return request.headers.get(self.auth_header_name)

    def validate_api_token(self, token):
        diag_logger.info(f"[AUTH APIKey] Validating API token: {token[:20]}...")
        
        try:
            api_token = APIToken.objects.get(
                Q(Q(expired_at__gt=timezone.now()) | Q(expired_at__isnull=True)),
                token=token,
                is_active=True,
            )
            diag_logger.info(f"[AUTH APIKey] Token found in DB, user: {api_token.user.email if api_token.user else 'None'}")
            diag_logger.info(f"[AUTH APIKey] Token is_active: {api_token.is_active}, expired_at: {api_token.expired_at}")
        except APIToken.DoesNotExist:
            diag_logger.warning(f"[AUTH APIKey] Token NOT found or expired/inactive")
            all_tokens = APIToken.objects.filter(token=token).first()
            if all_tokens:
                diag_logger.warning(f"[AUTH APIKey] Token exists but: is_active={all_tokens.is_active}, expired_at={all_tokens.expired_at}")
            else:
                diag_logger.warning(f"[AUTH APIKey] Token does not exist in database at all")
            raise AuthenticationFailed("Given API token is not valid")

        api_token.last_used = timezone.now()
        api_token.save(update_fields=["last_used"])
        diag_logger.info(f"[AUTH APIKey] SUCCESS - API token validated for user: {api_token.user.email}")
        return (api_token.user, api_token.token)

    def authenticate(self, request):
        diag_logger.info(f"[AUTH APIKey] Starting authentication for {request.path}")
        
        token = self.get_api_token(request=request)
        if not token:
            diag_logger.info(f"[AUTH APIKey] No X-Api-Key header found, skipping")
            return None

        diag_logger.info(f"[AUTH APIKey] X-Api-Key header found, length: {len(token)}")
        
        user, token = self.validate_api_token(token)
        return user, token

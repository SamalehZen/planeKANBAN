import logging

from rest_framework.authentication import SessionAuthentication
from django.conf import settings

diag_logger = logging.getLogger("plane.diagnostic")


class BaseSessionAuthentication(SessionAuthentication):
    def authenticate(self, request):
        diag_logger.info(f"[AUTH Session] Starting session authentication for {request.path}")
        
        session_cookie = request.COOKIES.get(settings.SESSION_COOKIE_NAME)
        diag_logger.info(f"[AUTH Session] Session cookie present: {bool(session_cookie)}")
        
        if session_cookie:
            diag_logger.info(f"[AUTH Session] Session cookie preview: {session_cookie[:20]}...")
        
        result = super().authenticate(request)
        
        if result:
            user, _ = result
            diag_logger.info(f"[AUTH Session] SUCCESS - Session authenticated user: {user.email}")
        else:
            diag_logger.info(f"[AUTH Session] No session authentication (returned None)")
            
        return result

    def enforce_csrf(self, request):
        diag_logger.info(f"[AUTH Session] CSRF check bypassed for {request.path}")
        return

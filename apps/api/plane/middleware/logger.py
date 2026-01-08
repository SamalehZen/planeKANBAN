# Python imports
import logging
import time
import traceback
import json

# Django imports
from django.http import HttpRequest
from django.utils import timezone
from django.conf import settings

# Third party imports
from rest_framework.request import Request

# Module imports
from plane.utils.ip_address import get_client_ip
from plane.utils.exception_logger import log_exception
from plane.bgtasks.logger_task import process_logs

api_logger = logging.getLogger("plane.api.request")
diag_logger = logging.getLogger("plane.diagnostic")


class RequestLoggerMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def _should_log_route(self, request: Request | HttpRequest) -> bool:
        """
        Determines whether a route should be logged based on the request and status code.
        """
        if request.path == "/" and request.method == "GET":
            return False
        return True

    def _get_request_body_preview(self, request):
        """Get a preview of request body for diagnostic logging."""
        try:
            if hasattr(request, '_body'):
                body = request._body
                if body:
                    try:
                        decoded = body.decode('utf-8')[:500]
                        return decoded
                    except:
                        return "[Binary data]"
            return None
        except:
            return "[Unable to read body]"

    def __call__(self, request):
        start_time = time.time()
        
        diag_logger.info("="*60)
        diag_logger.info(f"[DIAG REQUEST START] {request.method} {request.get_full_path()}")
        diag_logger.info(f"[DIAG] Remote IP: {get_client_ip(request)}")
        diag_logger.info(f"[DIAG] Content-Type: {request.META.get('CONTENT_TYPE', 'None')}")
        diag_logger.info(f"[DIAG] Authorization: {request.META.get('HTTP_AUTHORIZATION', 'None')[:50] if request.META.get('HTTP_AUTHORIZATION') else 'None'}...")
        diag_logger.info(f"[DIAG] X-API-Key: {request.META.get('HTTP_X_API_KEY', 'None')[:20] if request.META.get('HTTP_X_API_KEY') else 'None'}...")
        diag_logger.info(f"[DIAG] Session Cookie: {'Present' if request.COOKIES.get(settings.SESSION_COOKIE_NAME) else 'None'}")
        diag_logger.info(f"[DIAG] User-Agent: {request.META.get('HTTP_USER_AGENT', 'None')[:100]}")
        
        if request.method in ['POST', 'PUT', 'PATCH']:
            body_preview = self._get_request_body_preview(request)
            if body_preview:
                diag_logger.info(f"[DIAG] Request Body Preview: {body_preview}")

        response = self.get_response(request)

        duration = time.time() - start_time

        user_id = (
            request.user.id if getattr(request, "user") and getattr(request.user, "is_authenticated", False) else None
        )
        user_email = (
            request.user.email if getattr(request, "user") and getattr(request.user, "is_authenticated", False) else "Anonymous"
        )

        diag_logger.info(f"[DIAG RESPONSE] Status: {response.status_code}")
        diag_logger.info(f"[DIAG] Duration: {int(duration * 1000)}ms")
        diag_logger.info(f"[DIAG] User: {user_email} (ID: {user_id})")
        diag_logger.info(f"[DIAG] Authenticated: {getattr(request.user, 'is_authenticated', False) if hasattr(request, 'user') else False}")
        
        if response.status_code >= 400:
            diag_logger.warning(f"[DIAG ERROR] Status {response.status_code} for {request.method} {request.path}")
            try:
                if hasattr(response, 'content'):
                    content = response.content.decode('utf-8')[:1000]
                    diag_logger.warning(f"[DIAG ERROR] Response Body: {content}")
            except:
                pass
        
        diag_logger.info(f"[DIAG REQUEST END] {request.method} {request.get_full_path()}")
        diag_logger.info("="*60)

        log_true = self._should_log_route(request=request)
        if not log_true:
            return response

        user_agent = request.META.get("HTTP_USER_AGENT", "")

        api_logger.info(
            f"{request.method} {request.get_full_path()} {response.status_code}",
            extra={
                "path": request.path,
                "method": request.method,
                "status_code": response.status_code,
                "duration_ms": int(duration * 1000),
                "remote_addr": get_client_ip(request),
                "user_agent": user_agent,
                "user_id": user_id,
            },
        )

        return response


class APITokenLogMiddleware:
    """
    Middleware to log External API requests to MongoDB or PostgreSQL.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_body = request.body
        response = self.get_response(request)
        self.process_request(request, response, request_body)
        return response

    def _safe_decode_body(self, content):
        """
        Safely decodes request/response body content, handling binary data.
        Returns None if content is None, or a string representation of the content.
        """
        # If the content is None, return None
        if content is None:
            return None

        # If the content is an empty bytes object, return None
        if content == b"":
            return None

        # Check if content is binary by looking for common binary file signatures
        if content.startswith(b"\x89PNG") or content.startswith(b"\xff\xd8\xff") or content.startswith(b"%PDF"):
            return "[Binary Content]"

        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            return "[Could not decode content]"

    def process_request(self, request, response, request_body):
        api_key_header = "X-Api-Key"
        api_key = request.headers.get(api_key_header)

        # If the API key is not present, return
        if not api_key:
            return

        try:
            log_data = {
                "token_identifier": api_key,
                "path": request.path,
                "method": request.method,
                "query_params": request.META.get("QUERY_STRING", ""),
                "headers": str(request.headers),
                "body": self._safe_decode_body(request_body) if request_body else None,
                "response_body": self._safe_decode_body(response.content) if response.content else None,
                "response_code": response.status_code,
                "ip_address": get_client_ip(request=request),
                "user_agent": request.META.get("HTTP_USER_AGENT", None),
            }
            user_id = (
                str(request.user.id)
                if getattr(request, "user") and getattr(request.user, "is_authenticated", False)
                else None
            )
            # Additional fields for MongoDB
            mongo_log = {
                **log_data,
                "created_at": timezone.now(),
                "updated_at": timezone.now(),
                "created_by": user_id,
                "updated_by": user_id,
            }

            process_logs.delay(log_data=log_data, mongo_log=mongo_log)

        except Exception as e:
            log_exception(e)

        return None

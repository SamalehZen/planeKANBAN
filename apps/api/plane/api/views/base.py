# Python imports
import zoneinfo
import logging
import traceback

# Django imports
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError
from django.urls import resolve
from django.utils import timezone

# Third party imports
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import APIException
from rest_framework.generics import GenericAPIView

# Module imports
from plane.db.models.api import APIToken
from plane.api.middleware.api_authentication import APIKeyAuthentication
from plane.authentication.token_authentication import UserTokenAuthentication
from plane.api.rate_limit import ApiKeyRateThrottle, ServiceTokenRateThrottle
from plane.utils.exception_logger import log_exception
from plane.utils.paginator import BasePaginator
from plane.utils.core.mixins import ReadReplicaControlMixin


logger = logging.getLogger("plane.api")
diag_logger = logging.getLogger("plane.diagnostic")


class TimezoneMixin:
    """
    This enables timezone conversion according
    to the user set timezone
    """

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.user.is_authenticated:
            timezone.activate(zoneinfo.ZoneInfo(request.user.user_timezone))
        else:
            timezone.deactivate()


class BaseAPIView(TimezoneMixin, GenericAPIView, ReadReplicaControlMixin, BasePaginator):
    authentication_classes = [UserTokenAuthentication, APIKeyAuthentication]

    permission_classes = [IsAuthenticated]

    use_read_replica = False
    
    def initial(self, request, *args, **kwargs):
        diag_logger.info(f"[API INIT] {self.__class__.__name__} - {request.method} {request.path}")
        
        auth_header = request.META.get('HTTP_AUTHORIZATION', 'None')
        api_key = request.META.get('HTTP_X_API_KEY', 'None')
        diag_logger.info(f"[API AUTH] Authorization header: {auth_header[:50] if auth_header != 'None' else 'None'}...")
        diag_logger.info(f"[API AUTH] X-API-Key header: {api_key[:20] if api_key != 'None' else 'None'}...")
        diag_logger.info(f"[API AUTH] Session cookie: {'Present' if request.COOKIES.get(settings.SESSION_COOKIE_NAME) else 'None'}")
        
        try:
            super().initial(request, *args, **kwargs)
        except Exception as e:
            diag_logger.error(f"[API INIT ERROR] {type(e).__name__}: {str(e)}")
            diag_logger.error(f"[API INIT ERROR] Traceback: {traceback.format_exc()}")
            raise
        
        diag_logger.info(f"[API AUTH] Authenticated: {request.user.is_authenticated}")
        diag_logger.info(f"[API AUTH] User: {request.user.email if request.user.is_authenticated else 'Anonymous'}")

    def filter_queryset(self, queryset):
        for backend in list(self.filter_backends):
            queryset = backend().filter_queryset(self.request, queryset, self)
        return queryset

    def get_throttles(self):
        throttle_classes = []
        api_key = self.request.headers.get("X-Api-Key")

        if api_key:
            service_token = APIToken.objects.filter(token=api_key, is_service=True).first()

            if service_token:
                throttle_classes.append(ServiceTokenRateThrottle())
                return throttle_classes

        throttle_classes.append(ApiKeyRateThrottle())

        return throttle_classes

    def handle_exception(self, exc):
        """
        Handle any exception that occurs, by returning an appropriate response,
        or re-raising the error.
        """
        diag_logger.error(f"[API EXCEPTION] {type(exc).__name__}: {str(exc)}")
        diag_logger.error(f"[API EXCEPTION] View: {self.__class__.__name__}")
        diag_logger.error(f"[API EXCEPTION] Path: {self.request.path if hasattr(self, 'request') else 'N/A'}")
        diag_logger.error(f"[API EXCEPTION] User: {self.request.user.email if hasattr(self, 'request') and self.request.user.is_authenticated else 'Anonymous'}")
        diag_logger.error(f"[API EXCEPTION] Traceback: {traceback.format_exc()}")
        
        try:
            response = super().handle_exception(exc)
            return response
        except Exception as e:
            diag_logger.error(f"[API EXCEPTION] Secondary exception: {type(e).__name__}: {str(e)}")
            (print(e) if settings.DEBUG else print("Server Error"))
            if isinstance(e, IntegrityError):
                diag_logger.error(f"[API EXCEPTION] IntegrityError: {str(e)}")
                return Response(
                    {"error": "The payload is not valid", "detail": str(e) if settings.DEBUG else None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if isinstance(e, ValidationError):
                diag_logger.error(f"[API EXCEPTION] ValidationError: {str(e)}")
                return Response(
                    {"error": "Please provide valid detail", "detail": str(e) if settings.DEBUG else None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if isinstance(e, ObjectDoesNotExist):
                model_name = str(exc).split(" matching query does not exist.")[0]
                diag_logger.error(f"[API EXCEPTION] ObjectDoesNotExist: {model_name}")
                return Response(
                    {"error": f"The required object {model_name} does not exist.", "detail": str(exc) if settings.DEBUG else None},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if isinstance(e, KeyError):
                diag_logger.error(f"[API EXCEPTION] KeyError: {str(e)}")
                return Response(
                    {"error": "The required key does not exist.", "key": str(e) if settings.DEBUG else None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            log_exception(e, request=self.request if hasattr(self, 'request') else None)
            return Response(
                {"error": "Something went wrong. Please try again later.", "detail": str(e) if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class BaseViewSet(TimezoneMixin, ModelViewSet, BasePaginator):
    model = None

    permission_classes = [
        IsAuthenticated,
    ]

    filter_backends = ()

    filterset_fields = []

    search_fields = []

    def get_queryset(self):
        try:
            return self.model.objects.all()
        except Exception as e:
            log_exception(e)
            raise APIException("Please check the view", status.HTTP_400_BAD_REQUEST)

    def handle_exception(self, exc):
        """
        Handle any exception that occurs, by returning an appropriate response,
        or re-raising the error.
        """
        diag_logger.error(f"[API VIEWSET EXCEPTION] {type(exc).__name__}: {str(exc)}")
        diag_logger.error(f"[API VIEWSET EXCEPTION] View: {self.__class__.__name__}")
        diag_logger.error(f"[API VIEWSET EXCEPTION] Traceback: {traceback.format_exc()}")
        
        try:
            response = super().handle_exception(exc)
            return response
        except Exception as e:
            diag_logger.error(f"[API VIEWSET EXCEPTION] Secondary exception: {type(e).__name__}: {str(e)}")
            (print(e) if settings.DEBUG else print("Server Error"))
            if isinstance(e, IntegrityError):
                diag_logger.error(f"[API VIEWSET EXCEPTION] IntegrityError: {str(e)}")
                return Response(
                    {"error": "The payload is not valid", "detail": str(e) if settings.DEBUG else None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if isinstance(e, ValidationError):
                diag_logger.error(f"[API VIEWSET EXCEPTION] ValidationError: {str(e)}")
                return Response(
                    {"error": "Please provide valid detail", "detail": str(e) if settings.DEBUG else None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if isinstance(e, ObjectDoesNotExist):
                model_name = str(exc).split(" matching query does not exist.")[0]
                diag_logger.error(f"[API VIEWSET EXCEPTION] ObjectDoesNotExist: {model_name}")
                return Response(
                    {"error": f"The required object {model_name} does not exist.", "detail": str(exc) if settings.DEBUG else None},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if isinstance(e, KeyError):
                diag_logger.error(f"[API VIEWSET EXCEPTION] KeyError: {str(e)}")
                return Response(
                    {"error": "The required key does not exist.", "key": str(e) if settings.DEBUG else None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            log_exception(e, request=self.request if hasattr(self, 'request') else None)
            return Response(
                {"error": "Something went wrong. Please try again later.", "detail": str(e) if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def dispatch(self, request, *args, **kwargs):
        diag_logger.info(f"[API VIEWSET DISPATCH] {self.__class__.__name__} handling {request.method} {request.path}")
        
        response = super().dispatch(request, *args, **kwargs)

        if settings.DEBUG:
            from django.db import connection
            diag_logger.info(f"[API VIEWSET DISPATCH] DB Queries: {len(connection.queries)}")
            print(
                f"{request.method} - {request.get_full_path()} of Queries: {len(connection.queries)}"
            )
        return response

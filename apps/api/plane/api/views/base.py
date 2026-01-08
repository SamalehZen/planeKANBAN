# Python imports
import zoneinfo
import logging

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
        # Log authentication headers for debugging
        auth_header = request.META.get('HTTP_AUTHORIZATION', 'None')
        api_key = request.META.get('HTTP_X_API_KEY', 'None')
        logger.info(f"[AUTH DEBUG] Path: {request.path}")
        logger.info(f"[AUTH DEBUG] Authorization header: {auth_header[:50] if auth_header != 'None' else 'None'}...")
        logger.info(f"[AUTH DEBUG] X-API-Key header: {api_key[:20] if api_key != 'None' else 'None'}...")
        
        super().initial(request, *args, **kwargs)
        
        logger.info(f"[AUTH DEBUG] Authenticated: {request.user.is_authenticated}")
        logger.info(f"[AUTH DEBUG] User: {request.user.id if request.user.is_authenticated else 'Anonymous'}")

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
        try:
            response = super().handle_exception(exc)
            return response
        except Exception as e:
            (print(e) if settings.DEBUG else print("Server Error"))
            if isinstance(e, IntegrityError):
                return Response(
                    {"error": "The payload is not valid"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if isinstance(e, ValidationError):
                return Response(
                    {"error": "Please provide valid detail"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if isinstance(e, ObjectDoesNotExist):
                model_name = str(exc).split(" matching query does not exist.")[0]
                return Response(
                    {"error": f"The required object {model_name} does not exist."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if isinstance(e, KeyError):
                capture_message(f"key error in {request.user} for {request.path}")
                return Response(
                    {"error": "The required key does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            log_exception(e)
            return Response(
                {"error": "Something went wrong. Please try again later."},
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
        try:
            response = super().handle_exception(exc)
            return response
        except Exception as e:
            (print(e) if settings.DEBUG else print("Server Error"))
            if isinstance(e, IntegrityError):
                return Response(
                    {"error": "The payload is not valid"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if isinstance(e, ValidationError):
                return Response(
                    {"error": "Please provide valid detail"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if isinstance(e, ObjectDoesNotExist):
                model_name = str(exc).split(" matching query does not exist.")[0]
                return Response(
                    {"error": f"The required object {model_name} does not exist."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if isinstance(e, KeyError):
                return Response(
                    {"error": "The required key does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            log_exception(e)
            return Response(
                {"error": "Something went wrong. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def dispatch(self, request, *args, **kwargs):
        response = super().dispatch(request, *args, **kwargs)

        if settings.DEBUG:
            from django.db import connection

            print(
                f"{request.method} - {request.get_full_path()} of Queries: {len(connection.queries)}"
            )
        return response

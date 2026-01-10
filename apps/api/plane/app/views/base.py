# Python imports
import traceback
import logging

import zoneinfo
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError

# Django imports
from django.urls import resolve
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

# Third part imports
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

# Module imports
from plane.authentication.session import BaseSessionAuthentication
from plane.authentication.token_authentication import UserTokenAuthentication
from plane.utils.exception_logger import log_exception
from plane.utils.paginator import BasePaginator
from plane.utils.core.mixins import ReadReplicaControlMixin

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


class BaseViewSet(TimezoneMixin, ReadReplicaControlMixin, ModelViewSet, BasePaginator):
    model = None

    permission_classes = [IsAuthenticated]

    filter_backends = (DjangoFilterBackend, SearchFilter)

    authentication_classes = [UserTokenAuthentication, BaseSessionAuthentication]

    filterset_fields = []

    search_fields = []

    use_read_replica = False

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
        diag_logger.error(f"[VIEWSET EXCEPTION] {type(exc).__name__}: {str(exc)}")
        diag_logger.error(f"[VIEWSET EXCEPTION] View: {self.__class__.__name__}")
        diag_logger.error(f"[VIEWSET EXCEPTION] Path: {self.request.path if hasattr(self, 'request') else 'N/A'}")
        diag_logger.error(f"[VIEWSET EXCEPTION] Traceback: {traceback.format_exc()}")
        
        try:
            response = super().handle_exception(exc)
            return response
        except Exception as e:
            diag_logger.error(f"[VIEWSET EXCEPTION] Secondary exception: {type(e).__name__}: {str(e)}")
            (print(e, traceback.format_exc()) if settings.DEBUG else print("Server Error"))
            if isinstance(e, IntegrityError):
                diag_logger.error(f"[VIEWSET EXCEPTION] IntegrityError details: {str(e)}")
                return Response(
                    {"error": "The payload is not valid", "detail": str(e) if settings.DEBUG else None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if isinstance(e, ValidationError):
                diag_logger.error(f"[VIEWSET EXCEPTION] ValidationError details: {str(e)}")
                return Response(
                    {"error": "Please provide valid detail", "detail": str(e) if settings.DEBUG else None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if isinstance(e, ObjectDoesNotExist):
                diag_logger.error(f"[VIEWSET EXCEPTION] ObjectDoesNotExist: {str(e)}")
                return Response(
                    {"error": "The required object does not exist.", "detail": str(e) if settings.DEBUG else None},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if isinstance(e, KeyError):
                diag_logger.error(f"[VIEWSET EXCEPTION] KeyError: {str(e)}")
                log_exception(e, request=self.request if hasattr(self, 'request') else None)
                return Response(
                    {"error": "The required key does not exist.", "key": str(e) if settings.DEBUG else None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            log_exception(e, request=self.request if hasattr(self, 'request') else None)
            return Response(
                {"error": "Something went wrong please try again later", "detail": str(e) if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def dispatch(self, request, *args, **kwargs):
        diag_logger.info(f"[VIEWSET DISPATCH] {self.__class__.__name__} handling {request.method} {request.path}")
        try:
            response = super().dispatch(request, *args, **kwargs)

            if settings.DEBUG:
                from django.db import connection
                diag_logger.info(f"[VIEWSET DISPATCH] DB Queries: {len(connection.queries)}")
                print(f"{request.method} - {request.get_full_path()} of Queries: {len(connection.queries)}")

            return response
        except Exception as exc:
            diag_logger.error(f"[VIEWSET DISPATCH] Exception in dispatch: {type(exc).__name__}: {str(exc)}")
            response = self.handle_exception(exc)
            return response

    @property
    def workspace_slug(self):
        return self.kwargs.get("slug", None)

    @property
    def project_id(self):
        project_id = self.kwargs.get("project_id", None)
        if project_id:
            return project_id

        if resolve(self.request.path_info).url_name == "project":
            return self.kwargs.get("pk", None)

    @property
    def fields(self):
        fields = [field for field in self.request.GET.get("fields", "").split(",") if field]
        return fields if fields else None

    @property
    def expand(self):
        expand = [expand for expand in self.request.GET.get("expand", "").split(",") if expand]
        return expand if expand else None


class BaseAPIView(TimezoneMixin, ReadReplicaControlMixin, APIView, BasePaginator):
    permission_classes = [IsAuthenticated]

    filter_backends = (DjangoFilterBackend, SearchFilter)

    authentication_classes = [UserTokenAuthentication, BaseSessionAuthentication]

    filterset_fields = []

    search_fields = []

    use_read_replica = False

    def filter_queryset(self, queryset):
        for backend in list(self.filter_backends):
            queryset = backend().filter_queryset(self.request, queryset, self)
        return queryset

    def handle_exception(self, exc):
        """
        Handle any exception that occurs, by returning an appropriate response,
        or re-raising the error.
        """
        diag_logger.error(f"[APIVIEW EXCEPTION] {type(exc).__name__}: {str(exc)}")
        diag_logger.error(f"[APIVIEW EXCEPTION] View: {self.__class__.__name__}")
        diag_logger.error(f"[APIVIEW EXCEPTION] Path: {self.request.path if hasattr(self, 'request') else 'N/A'}")
        diag_logger.error(f"[APIVIEW EXCEPTION] Traceback: {traceback.format_exc()}")
        
        try:
            response = super().handle_exception(exc)
            return response
        except Exception as e:
            diag_logger.error(f"[APIVIEW EXCEPTION] Secondary exception: {type(e).__name__}: {str(e)}")
            if isinstance(e, IntegrityError):
                diag_logger.error(f"[APIVIEW EXCEPTION] IntegrityError: {str(e)}")
                return Response(
                    {"error": "The payload is not valid", "detail": str(e) if settings.DEBUG else None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if isinstance(e, ValidationError):
                diag_logger.error(f"[APIVIEW EXCEPTION] ValidationError: {str(e)}")
                return Response(
                    {"error": "Please provide valid detail", "detail": str(e) if settings.DEBUG else None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if isinstance(e, ObjectDoesNotExist):
                diag_logger.error(f"[APIVIEW EXCEPTION] ObjectDoesNotExist: {str(e)}")
                return Response(
                    {"error": "The required object does not exist.", "detail": str(e) if settings.DEBUG else None},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if isinstance(e, KeyError):
                diag_logger.error(f"[APIVIEW EXCEPTION] KeyError: {str(e)}")
                return Response(
                    {"error": "The required key does not exist.", "key": str(e) if settings.DEBUG else None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            log_exception(e, request=self.request if hasattr(self, 'request') else None)
            return Response(
                {"error": "Something went wrong please try again later", "detail": str(e) if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def dispatch(self, request, *args, **kwargs):
        diag_logger.info(f"[APIVIEW DISPATCH] {self.__class__.__name__} handling {request.method} {request.path}")
        try:
            response = super().dispatch(request, *args, **kwargs)

            if settings.DEBUG:
                from django.db import connection
                diag_logger.info(f"[APIVIEW DISPATCH] DB Queries: {len(connection.queries)}")
                print(f"{request.method} - {request.get_full_path()} of Queries: {len(connection.queries)}")
            return response

        except Exception as exc:
            diag_logger.error(f"[APIVIEW DISPATCH] Exception in dispatch: {type(exc).__name__}: {str(exc)}")
            response = self.handle_exception(exc)
            return response

    @property
    def workspace_slug(self):
        return self.kwargs.get("slug", None)

    @property
    def project_id(self):
        return self.kwargs.get("project_id", None)

    @property
    def fields(self):
        fields = [field for field in self.request.GET.get("fields", "").split(",") if field]
        return fields if fields else None

    @property
    def expand(self):
        expand = [expand for expand in self.request.GET.get("expand", "").split(",") if expand]
        return expand if expand else None

import os
import requests

from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import ROLE, allow_permission
from plane.license.utils.instance_value import get_configuration_value
from plane.utils.exception_logger import log_exception

from ..base import BaseAPIView


class AssemblyAITokenEndpoint(BaseAPIView):
    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug):
        (api_key,) = get_configuration_value(
            [
                {
                    "key": "ASSEMBLYAI_API_KEY",
                    "default": os.environ.get("ASSEMBLYAI_API_KEY"),
                }
            ]
        )

        if not api_key:
            return Response(
                {"error": "Speech-to-text not configured"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            response = requests.get(
                "https://streaming.assemblyai.com/v3/token",
                headers={"authorization": api_key},
                params={"expires_in_seconds": 600},
            )

            if response.status_code != 200:
                log_exception(
                    ValueError(f"AssemblyAI token request failed: {response.text}")
                )
                return Response(
                    {"error": "Failed to generate speech-to-text token"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            return Response(response.json(), status=status.HTTP_200_OK)

        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to connect to speech-to-text service"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

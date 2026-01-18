import os
import requests
import logging

from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import ROLE, allow_permission
from plane.license.utils.instance_value import get_configuration_value
from plane.utils.exception_logger import log_exception

from ..base import BaseAPIView
from .base import get_llm_config, SUPPORTED_PROVIDERS

logger = logging.getLogger("plane.ai")


class LLMConfigEndpoint(BaseAPIView):
    """Endpoint to get LLM configuration for voice assistant"""
    
    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def get(self, request, slug):
        api_key, model, provider = get_llm_config()

        if not api_key or not model or not provider:
            return Response(
                {"error": "LLM provider not configured"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "api_key": api_key,
                "model": model,
                "provider": provider,
            },
            status=status.HTTP_200_OK,
        )


class LLMDebugEndpoint(BaseAPIView):
    """Debug endpoint to check LLM configuration"""
    
    @allow_permission(allowed_roles=[ROLE.ADMIN], level="WORKSPACE")
    def get(self, request, slug):
        raw_api_key, raw_provider, raw_model = get_configuration_value(
            [
                {"key": "LLM_API_KEY", "default": os.environ.get("LLM_API_KEY", "")},
                {"key": "LLM_PROVIDER", "default": os.environ.get("LLM_PROVIDER", "mimo")},
                {"key": "LLM_MODEL", "default": os.environ.get("LLM_MODEL", "")},
            ]
        )
        
        api_key, model, provider = get_llm_config()
        
        return Response(
            {
                "raw_values": {
                    "api_key_present": bool(raw_api_key and raw_api_key.strip()),
                    "api_key_length": len(raw_api_key) if raw_api_key else 0,
                    "provider": raw_provider,
                    "model": raw_model,
                },
                "processed_values": {
                    "api_key_present": bool(api_key),
                    "model": model,
                    "provider": provider,
                },
                "supported_providers": list(SUPPORTED_PROVIDERS.keys()),
                "env_vars": {
                    "LLM_API_KEY_env": bool(os.environ.get("LLM_API_KEY")),
                    "LLM_PROVIDER_env": os.environ.get("LLM_PROVIDER", "not set"),
                    "LLM_MODEL_env": os.environ.get("LLM_MODEL", "not set"),
                }
            },
            status=status.HTTP_200_OK,
        )


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

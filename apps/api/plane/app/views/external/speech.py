import os
import json
import requests

from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import ROLE, allow_permission
from plane.license.utils.instance_value import get_configuration_value
from plane.utils.exception_logger import log_exception

from ..base import BaseAPIView
from .base import get_llm_config, get_llm_response


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


class SmartTranscriptEndpoint(BaseAPIView):
    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug):
        transcript = request.data.get("transcript", "")
        language = request.data.get("language", "fr")

        if not transcript:
            return Response(
                {"error": "Transcript is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key, model, provider = get_llm_config()
        if not api_key:
            return Response(
                {"error": "LLM not configured"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        system_prompt = """Tu es un assistant spécialisé dans l'analyse de transcriptions vocales en français.

TÂCHE: Analyser la transcription et la restructurer intelligemment.

RÈGLES:
1. Corriger toutes les fautes d'orthographe et de grammaire
2. Identifier l'intention principale parmi: todo, note, planning, long_text
3. Structurer le contenu selon l'intention détectée:
   - todo: Liste à puces avec checkboxes (format: - [ ] tâche)
   - note: Texte structuré avec titre si pertinent
   - planning: Tâches avec dates/priorités (format: - [ ] tâche | date: X | priorité: haute/moyenne/basse)
   - long_text: Paragraphes avec titres et sous-titres (format Markdown ## et ###)
4. Si plusieurs intentions sont détectées, indiquer l'intention secondaire

RÉPONDRE EN JSON STRICT:
{
  "intent": "todo|note|planning|long_text",
  "confidence": 0.0-1.0,
  "secondary_intent": null ou "todo|note|planning|long_text",
  "formatted_content": "contenu structuré en Markdown",
  "corrections": ["liste des corrections majeures effectuées"]
}"""

        user_prompt = f"Transcription à analyser:\n\n{transcript}"
        
        final_prompt = system_prompt + "\n\n" + user_prompt

        text, error = get_llm_response("", final_prompt, api_key, model, provider)

        if error:
            return Response({"error": error}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            cleaned_text = text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            cleaned_text = cleaned_text.strip()
            
            result = json.loads(cleaned_text)
            result["original_transcript"] = transcript
            return Response(result, status=status.HTTP_200_OK)
        except json.JSONDecodeError as e:
            log_exception(e)
            return Response(
                {
                    "intent": "note",
                    "confidence": 0.5,
                    "formatted_content": transcript,
                    "original_transcript": transcript,
                    "corrections": [],
                },
                status=status.HTTP_200_OK,
            )

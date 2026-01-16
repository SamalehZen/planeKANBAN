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
        requested_intent = request.data.get("intent", None)

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

        if requested_intent:
            system_prompt = f"""Tu es un assistant spécialisé dans le formatage de texte en français.

TÂCHE: Formater la transcription vocale selon le format demandé: {requested_intent}

FORMATS DE SORTIE:
- Si "todo": Créer une liste de tâches avec checkboxes. Chaque élément sur une ligne: "- [ ] tâche"
- Si "note": Créer un texte simple et bien structuré, paragraphes clairs
- Si "planning": Créer des tâches avec dates/priorités: "- [ ] tâche | date: X | priorité: haute/moyenne/basse"  
- Si "long_text": Créer un document structuré avec titres (## Titre) et sous-titres (### Sous-titre)

RÈGLES:
1. Corriger l'orthographe et la grammaire
2. Appliquer STRICTEMENT le format demandé ({requested_intent})
3. Ne pas changer l'intention, juste formater

RÉPONDRE EN JSON:
{{
  "intent": "{requested_intent}",
  "confidence": 1.0,
  "formatted_content": "contenu formaté selon {requested_intent}"
}}"""
        else:
            system_prompt = """Tu es un assistant spécialisé dans l'analyse de transcriptions vocales en français.

TÂCHE: Analyser la transcription et identifier l'intention.

INTENTIONS POSSIBLES:
- "todo": Si l'utilisateur dicte des tâches à faire, une liste de choses
- "note": Si c'est une note simple, une idée, un mémo court
- "planning": Si l'utilisateur mentionne des dates, deadlines, priorités
- "long_text": Si c'est un texte long, un article, un document structuré

FORMATS DE SORTIE SELON L'INTENTION:
- todo: Liste avec checkboxes (- [ ] tâche)
- note: Texte simple en paragraphes  
- planning: Tâches avec métadonnées (- [ ] tâche | date: X | priorité: Y)
- long_text: Document avec titres ## et sous-titres ###

RÉPONDRE EN JSON:
{
  "intent": "todo|note|planning|long_text",
  "confidence": 0.0-1.0,
  "secondary_intent": null ou autre intention possible,
  "formatted_content": "contenu formaté selon l'intention détectée",
  "formatted_todo": "version formatée en todo (- [ ] item)",
  "formatted_note": "version formatée en note simple",
  "formatted_planning": "version formatée en planning",
  "formatted_long_text": "version formatée en document"
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
            
            if not requested_intent and "formatted_todo" not in result:
                result["formatted_todo"] = self._format_as_todo(transcript)
                result["formatted_note"] = self._format_as_note(transcript)
                result["formatted_planning"] = self._format_as_planning(transcript)
                result["formatted_long_text"] = self._format_as_long_text(transcript)
            
            return Response(result, status=status.HTTP_200_OK)
        except json.JSONDecodeError as e:
            log_exception(e)
            return Response(
                {
                    "intent": "note",
                    "confidence": 0.5,
                    "formatted_content": transcript,
                    "formatted_todo": self._format_as_todo(transcript),
                    "formatted_note": transcript,
                    "formatted_planning": self._format_as_planning(transcript),
                    "formatted_long_text": f"## Note\n\n{transcript}",
                    "original_transcript": transcript,
                },
                status=status.HTTP_200_OK,
            )

    def _format_as_todo(self, text):
        sentences = [s.strip() for s in text.replace('.', '\n').split('\n') if s.strip()]
        return '\n'.join([f"- [ ] {s}" for s in sentences])

    def _format_as_note(self, text):
        return text

    def _format_as_planning(self, text):
        sentences = [s.strip() for s in text.replace('.', '\n').split('\n') if s.strip()]
        return '\n'.join([f"- [ ] {s} | priorité: moyenne" for s in sentences])

    def _format_as_long_text(self, text):
        return f"## Note vocale\n\n{text}"

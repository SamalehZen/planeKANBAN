from django.urls import path


from plane.app.views import UnsplashEndpoint
from plane.app.views import GPTIntegrationEndpoint, WorkspaceGPTIntegrationEndpoint
from plane.app.views import AssemblyAITokenEndpoint, LLMConfigEndpoint


urlpatterns = [
    path("unsplash/", UnsplashEndpoint.as_view(), name="unsplash"),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/ai-assistant/",
        GPTIntegrationEndpoint.as_view(),
        name="importer",
    ),
    path(
        "workspaces/<str:slug>/ai-assistant/",
        WorkspaceGPTIntegrationEndpoint.as_view(),
        name="importer",
    ),
    path(
        "workspaces/<str:slug>/speech-to-text/token/",
        AssemblyAITokenEndpoint.as_view(),
        name="speech-to-text-token",
    ),
    path(
        "workspaces/<str:slug>/llm-config/",
        LLMConfigEndpoint.as_view(),
        name="llm-config",
    ),
]

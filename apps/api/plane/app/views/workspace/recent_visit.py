# Third party imports
from rest_framework import status
from rest_framework.response import Response
from django.db.models import Value, CharField, F
from django.utils import timezone

from plane.db.models import UserRecentVisit, Project, Issue, Page, ProjectMember
from plane.app.serializers import WorkspaceRecentVisitSerializer

# Modules imports
from ..base import BaseViewSet
from plane.app.permissions import allow_permission, ROLE


class UserRecentVisitViewSet(BaseViewSet):
    model = UserRecentVisit
    use_read_replica = True

    def get_serializer_class(self):
        return WorkspaceRecentVisitSerializer

    def _get_fallback_recents(self, request, slug, entity_name=None):
        """Generate fallback recents from actual entities when no visit history exists"""
        results = []
        
        user_project_ids = ProjectMember.objects.filter(
            workspace__slug=slug,
            member=request.user,
            is_active=True
        ).values_list('project_id', flat=True)
        
        if entity_name is None or entity_name == "project":
            projects = Project.objects.filter(
                workspace__slug=slug,
                id__in=user_project_ids,
                archived_at__isnull=True
            ).order_by('-updated_at')[:10]
            
            for project in projects:
                results.append({
                    'id': str(project.id),
                    'entity_name': 'project',
                    'entity_identifier': str(project.id),
                    'visited_at': project.updated_at,
                    'entity_data': {
                        'id': str(project.id),
                        'name': project.name,
                        'logo_props': project.logo_props,
                        'identifier': project.identifier,
                        'project_members': list(
                            ProjectMember.objects.filter(
                                project_id=project.id,
                                member__is_bot=False,
                                is_active=True
                            ).values_list('member_id', flat=True)
                        )
                    }
                })
        
        if entity_name is None or entity_name == "issue":
            issues = Issue.objects.filter(
                workspace__slug=slug,
                project_id__in=user_project_ids,
                project__archived_at__isnull=True,
                archived_at__isnull=True
            ).select_related('project').order_by('-updated_at')[:10]
            
            for issue in issues:
                assignee_ids = list(
                    issue.assignees.filter(
                        issue_assignee__deleted_at__isnull=True
                    ).values_list('id', flat=True)
                )
                results.append({
                    'id': str(issue.id),
                    'entity_name': 'issue',
                    'entity_identifier': str(issue.id),
                    'visited_at': issue.updated_at,
                    'entity_data': {
                        'id': str(issue.id),
                        'name': issue.name,
                        'state': str(issue.state_id) if issue.state_id else None,
                        'priority': issue.priority,
                        'assignees': [str(a) for a in assignee_ids],
                        'type': issue.type_id,
                        'sequence_id': issue.sequence_id,
                        'project_id': str(issue.project_id),
                        'project_identifier': issue.project.identifier if issue.project else None
                    }
                })
        
        if entity_name is None or entity_name == "page":
            pages = Page.objects.filter(
                workspace__slug=slug,
                projects__id__in=user_project_ids,
                archived_at__isnull=True
            ).prefetch_related('projects').distinct().order_by('-updated_at')[:10]
            
            for page in pages:
                project = page.projects.first()
                results.append({
                    'id': str(page.id),
                    'entity_name': 'page',
                    'entity_identifier': str(page.id),
                    'visited_at': page.updated_at,
                    'entity_data': {
                        'id': str(page.id),
                        'name': page.name,
                        'logo_props': page.logo_props,
                        'project_id': str(project.id) if project else None,
                        'owned_by': str(page.owned_by_id),
                        'project_identifier': project.identifier if project else None
                    }
                })
        
        results.sort(key=lambda x: x['visited_at'], reverse=True)
        return results[:20]

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def list(self, request, slug):
        user_recent_visits = UserRecentVisit.objects.filter(
            workspace__slug=slug, 
            user=request.user
        ).order_by('-visited_at')

        entity_name = request.query_params.get("entity_name")

        if entity_name:
            user_recent_visits = user_recent_visits.filter(entity_name=entity_name)

        user_recent_visits = user_recent_visits.filter(entity_name__in=["issue", "page", "project"])

        visits_list = list(user_recent_visits[:20])
        
        if not visits_list:
            fallback_data = self._get_fallback_recents(request, slug, entity_name)
            return Response(fallback_data, status=status.HTTP_200_OK)

        serializer = WorkspaceRecentVisitSerializer(visits_list, many=True, context={'request': request})
        serialized_data = serializer.data
        
        valid_data = [item for item in serialized_data if item.get('entity_data') is not None]
        
        if not valid_data:
            fallback_data = self._get_fallback_recents(request, slug, entity_name)
            return Response(fallback_data, status=status.HTTP_200_OK)
        
        return Response(valid_data, status=status.HTTP_200_OK)

# Django imports
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import logout
from django.http import HttpResponseRedirect
from django.utils import timezone

# Module imports
from plane.authentication.utils.host import user_ip, base_host
from plane.db.models import User


@method_decorator(csrf_exempt, name="dispatch")
class SignOutAuthEndpoint(View):
    def post(self, request):
        # Get user
        try:
            user = User.objects.get(pk=request.user.id)
            user.last_logout_ip = user_ip(request=request)
            user.last_logout_time = timezone.now()
            user.save()
            # Log the user out
            logout(request)
            return HttpResponseRedirect(base_host(request=request, is_app=True))
        except Exception:
            return HttpResponseRedirect(base_host(request=request, is_app=True))

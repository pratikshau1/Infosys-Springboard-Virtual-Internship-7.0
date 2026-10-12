from rest_framework.authentication import BaseAuthentication
from django.contrib.auth.models import User

class TokenHeaderAuthentication(BaseAuthentication):
    """
    Authenticates requests with 'Authorization: Bearer token_{id}_{username}'
    or 'Authorization: Token token_{id}_{username}' or 'Authorization: token_{id}_{username}'.
    Falls back to first user if unauthenticated in local development mode.
    """
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header:
            return None

        parts = auth_header.split()
        token_str = parts[-1] if parts else ''

        if token_str.startswith('token_'):
            token_parts = token_str.split('_')
            if len(token_parts) >= 3:
                try:
                    user_id = int(token_parts[1])
                    user = User.objects.filter(id=user_id).first()
                    if user:
                        return (user, token_str)
                except (ValueError, IndexError):
                    pass

        return None

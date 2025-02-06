from rest_framework.permissions import BasePermission

class TwoFactorAuthenticationRequired(BasePermission):
    """
    Ensures that 2FA is required and completed before granting access.
    """
    def has_permission(self, request, view):
    if not request.user.is_authenticated:
        return False

    auth_token = request.auth
    if auth_token and isinstance(auth_token, dict):
        return auth_token.get('2fa_verified', False)

    return False

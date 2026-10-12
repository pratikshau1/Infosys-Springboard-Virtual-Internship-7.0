from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet, ProjectMemberViewSet, 
    ProjectInvitationViewSet, AuditLogViewSet,
    AcceptInvitationView, RevokeInvitationView, UsersListView,
    RegisterView, LoginView, CurrentUserView
)

router = DefaultRouter()
router.register(r'members', ProjectMemberViewSet)
router.register(r'invitations', ProjectInvitationViewSet)
router.register(r'audit-logs', AuditLogViewSet)
router.register(r'', ProjectViewSet)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),
    path('users/', UsersListView.as_view(), name='users-list'),
    path('users/<int:pk>/', UsersListView.as_view(), name='users-detail'),
    path('invitations/accept/', AcceptInvitationView.as_view(), name='invitations-accept'),
    path('invitations/<int:pk>/revoke/', RevokeInvitationView.as_view(), name='invitations-revoke'),
    path('', include(router.urls)),
]

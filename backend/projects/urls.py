from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, ProjectMemberViewSet

router = DefaultRouter()
router.register(r'', ProjectViewSet)
router.register(r'members', ProjectMemberViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

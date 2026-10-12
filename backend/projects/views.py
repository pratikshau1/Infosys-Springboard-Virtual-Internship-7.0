from rest_framework import viewsets, permissions
from .models import Project, ProjectMember
from .serializers import ProjectSerializer, ProjectMemberSerializer
from django.contrib.auth.models import User

# For MVP, allow any access
class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    
    def perform_create(self, serializer):
        # Default owner to first user or create one
        user = User.objects.first()
        if not user:
            user = User.objects.create_user(username='admin', password='password', email='admin@example.com')
        serializer.save(owner=user)

class ProjectMemberViewSet(viewsets.ModelViewSet):
    queryset = ProjectMember.objects.all()
    serializer_class = ProjectMemberSerializer

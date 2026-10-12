from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Project, ProjectMember
from .serializers import ProjectSerializer, ProjectMemberSerializer
from .auth_serializers import UserSerializer, RegisterSerializer, LoginSerializer
from django.db import models
from django.contrib.auth.models import User

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Project.objects.all()

        # RBAC: If authenticated and not superuser/staff, can view owned projects, member projects (Active only), or demo projects
        if user and user.is_authenticated and not user.is_staff and not user.is_superuser:
            active_pids = user.project_memberships.filter(status='Active').values_list('project_id', flat=True)
            queryset = queryset.filter(
                models.Q(owner=user) | 
                models.Q(id__in=active_pids) | 
                models.Q(is_demo=True)
            ).distinct()

        # Search by project name

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter.lower() != 'all':
            queryset = queryset.filter(status__iexact=status_filter)

        # Filter by category
        category_filter = self.request.query_params.get('category')
        if category_filter and category_filter.lower() != 'all':
            queryset = queryset.filter(category__iexact=category_filter)

        # Sorting
        sort_by = self.request.query_params.get('ordering', '-updated_at')
        if sort_by in ['name', '-name', 'updated_at', '-updated_at', 'created_at', '-created_at']:
            queryset = queryset.order_by(sort_by)
        else:
            queryset = queryset.order_by('-updated_at')

        return queryset
    
    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else User.objects.first()
        if not user:
            user = User.objects.create_user(username='admin', password='password', email='admin@example.com')

        # RBAC Check: Team Member or Read-Only Reviewer cannot create projects
        # Check if user has explicit Team Member / Reviewer global membership or is non-staff without PM role
        if user and not user.is_staff and not user.is_superuser:
            # If user has only "Team Member" or "Reviewer" roles across projects and no "Manager" role
            user_roles = list(user.project_memberships.values_list('role', flat=True))
            if user_roles and all(r in ['Team Member', 'Member', 'Reviewer', 'Read-Only Reviewer'] for r in user_roles):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Team Members and Read-Only Reviewers do not have permission to create projects.")

        manager_id = serializer.validated_data.pop('manager_id', None)
        assigned_pm = None
        if manager_id:
            assigned_pm = User.objects.filter(id=manager_id).first()

        # Transactional creation of project and memberships
        from django.db import transaction
        with transaction.atomic():
            project = serializer.save(owner=user)
            # Create membership for owner / creator
            ProjectMember.objects.get_or_create(
                project=project,
                user=user,
                defaults={'role': 'Project Manager'}
            )
            # If assigned a distinct PM, add that membership too
            if assigned_pm and assigned_pm != user:
                ProjectMember.objects.get_or_create(
                    project=project,
                    user=assigned_pm,
                    defaults={'role': 'Project Manager'}
                )

    def retrieve(self, request, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        project_id = kwargs.get('pk')
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        from .permissions import check_project_permission
        if not check_project_permission(request.user, project.id, 'view'):
            return Response(
                {"error": "Forbidden: You do not have permission to access this project."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(project)
        return Response(serializer.data)


    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        user = request.user if request.user.is_authenticated else User.objects.first()


        # Authorization: Superuser, staff, project owner, or assigned PM can delete
        is_admin = user and (user.is_staff or user.is_superuser)
        is_owner = user and (project.owner == user)
        is_pm = user and project.members.filter(user=user, role__icontains='Manager').exists()

        if not (is_admin or is_owner or is_pm):
            return Response(
                {"error": "You do not have permission to delete this project."},
                status=status.HTTP_403_FORBIDDEN
            )

        project_id = project.id
        project_name = project.name

        # 1. Clean up associated files from media storage
        for doc in project.documents.all():
            try:
                if doc.file_path and doc.file_path.name:
                    doc.file_path.delete(save=False)
            except Exception as e:
                print(f"Warning: error deleting file for document {doc.id}:", e)

        # 2. Clean up ChromaDB collection
        try:
            import chromadb
            from django.conf import settings
            import os
            chroma_path = os.path.join(settings.BASE_DIR, 'chroma_db')
            client = chromadb.PersistentClient(path=chroma_path)
            collection_name = f"project_{project_id}"
            try:
                client.delete_collection(name=collection_name)
            except Exception:
                pass
        except Exception as e:
            print(f"Warning: error deleting ChromaDB collection for project {project_id}:", e)

        # 3. Transactional database deletion of project (cascades to deliverables, scope, risks, blockers, documents, chunks, health, chat)
        from django.db import transaction
        with transaction.atomic():
            project.delete()

        return Response(
            {"message": f"Project '{project_name}' and all associated data deleted successfully.", "id": project_id},
            status=status.HTTP_200_OK
        )

import uuid
from datetime import timedelta
from django.utils import timezone
from .models import Project, ProjectMember, ProjectInvitation, AuditLog
from .serializers import (
    ProjectSerializer, ProjectMemberSerializer, 
    ProjectInvitationSerializer, AuditLogSerializer
)
from .permissions import check_project_permission

class ProjectMemberViewSet(viewsets.ModelViewSet):
    queryset = ProjectMember.objects.all()
    serializer_class = ProjectMemberSerializer

    def get_queryset(self):
        user = self.request.user
        project_id = self.request.query_params.get('project_id')
        queryset = self.queryset
        if project_id:
            # Check view permission on project
            if user and not user.is_staff and not check_project_permission(user, project_id, 'view'):
                return self.queryset.none()
            queryset = queryset.filter(project_id=project_id)
        elif user and not user.is_staff:
            # Users can only see members of projects they belong to
            user_project_ids = list(user.project_memberships.values_list('project_id', flat=True))
            queryset = queryset.filter(project_id__in=user_project_ids)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        project = serializer.validated_data.get('project')
        if not check_project_permission(user, project.id, 'manage'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only Project Managers and Administrators can add members.")

        member_user_id = serializer.validated_data.pop('user_id', None)
        member_user = User.objects.filter(id=member_user_id).first() if member_user_id else None
        if not member_user:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"user_id": "Valid user ID is required."})

        member = serializer.save(user=member_user, invited_by=user, status='Active')

        AuditLog.objects.create(
            actor=user,
            action="MEMBER_ADDED",
            target_resource=f"User {member_user.username} ({member.role})",
            project=project,
            metadata={"role": member.role, "member_user_id": member_user.id}
        )

    def perform_destroy(self, instance):
        user = self.request.user
        if not check_project_permission(user, instance.project_id, 'manage'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only Project Managers and Administrators can remove members.")

        project = instance.project
        member_name = instance.user.username
        instance.delete()

        AuditLog.objects.create(
            actor=user,
            action="MEMBER_REMOVED",
            target_resource=f"User {member_name}",
            project=project,
            metadata={"removed_user": member_name}
        )


class ProjectInvitationViewSet(viewsets.ModelViewSet):
    queryset = ProjectInvitation.objects.all().order_by('-created_at')
    serializer_class = ProjectInvitationSerializer

    def get_queryset(self):
        user = self.request.user
        project_id = self.request.query_params.get('project_id')
        queryset = self.queryset
        if project_id:
            if user and not user.is_staff and not check_project_permission(user, project_id, 'view'):
                return self.queryset.none()
            return queryset.filter(project_id=project_id)
        if user and not user.is_staff:
            user_project_ids = list(user.project_memberships.values_list('project_id', flat=True))
            return queryset.filter(project_id__in=user_project_ids)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        project = serializer.validated_data.get('project')
        project_id = serializer.validated_data.get('project_id')
        target_pid = project.id if project else project_id
        if not check_project_permission(user, target_pid, 'manage'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only Project Managers and Administrators can invite members.")

        token = str(uuid.uuid4())
        expires_at = timezone.now() + timedelta(days=7)
        invitation = serializer.save(
            token=token,
            invited_by=user,
            expires_at=expires_at
        )

        AuditLog.objects.create(
            actor=user,
            action="INVITATION_SENT",
            target_resource=f"Invite {invitation.email} ({invitation.role})",
            project_id=target_pid,
            metadata={"email": invitation.email, "role": invitation.role}
        )



class AcceptInvitationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({"error": "Invitation token is required."}, status=status.HTTP_400_BAD_REQUEST)

        invitation = ProjectInvitation.objects.filter(token=token).first()
        if not invitation:
            return Response({"error": "Invalid invitation token."}, status=status.HTTP_404_NOT_FOUND)

        if not invitation.is_valid():
            return Response({"error": "Invitation has expired or been revoked."}, status=status.HTTP_400_BAD_REQUEST)

        # Get or identify user
        user = request.user if request.user.is_authenticated else None
        if not user:
            # Match by email
            user = User.objects.filter(email__iexact=invitation.email).first()
        
        if not user:
            return Response({
                "message": "Please register or sign in with the invited email to accept.",
                "email": invitation.email,
                "project_name": invitation.project.name
            }, status=status.HTTP_200_OK)

        # Create active membership
        ProjectMember.objects.update_or_create(
            project=invitation.project,
            user=user,
            defaults={
                'role': invitation.role,
                'status': 'Active',
                'invited_by': invitation.invited_by
            }
        )
        invitation.is_accepted = True
        invitation.save()

        AuditLog.objects.create(
            actor=user,
            action="INVITATION_ACCEPTED",
            target_resource=f"User {user.username} joined {invitation.project.name}",
            project=invitation.project,
            metadata={"email": invitation.email, "role": invitation.role}
        )

        return Response({
            "message": f"Successfully joined {invitation.project.name} as {invitation.role}.",
            "project_id": invitation.project.id
        }, status=status.HTTP_200_OK)


class RevokeInvitationView(APIView):
    def post(self, request, pk):
        invitation = ProjectInvitation.objects.filter(id=pk).first()
        if not invitation:
            return Response({"error": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not check_project_permission(user, invitation.project_id, 'manage'):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        invitation.is_revoked = True
        invitation.save()

        AuditLog.objects.create(
            actor=user,
            action="INVITATION_REVOKED",
            target_resource=f"Revoked invite for {invitation.email}",
            project=invitation.project,
            metadata={"email": invitation.email}
        )

        return Response({"message": "Invitation revoked successfully."})


class UsersListView(APIView):
    """
    User management endpoint for Platform Administrators.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not (user and (user.is_staff or user.is_superuser)):
            return Response(
                {"error": "Forbidden: Platform Administrator rights required."},
                status=status.HTTP_403_FORBIDDEN
            )

        users = User.objects.all().order_by('-date_joined')
        data = []
        for u in users:
            memberships = u.project_memberships.select_related('project').all()
            data.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "is_active": u.is_active,
                "is_staff": u.is_staff,
                "is_superuser": u.is_superuser,
                "date_joined": u.date_joined.isoformat() if u.date_joined else None,
                "projects_count": memberships.count(),
                "roles": list(set([m.role for m in memberships]))
            })
        return Response(data)

    def patch(self, request, pk):
        """Toggle active or role status"""
        if not (request.user and (request.user.is_staff or request.user.is_superuser)):
            return Response(
                {"error": "Forbidden: Platform Administrator rights required."},
                status=status.HTTP_403_FORBIDDEN
            )

        target_user = User.objects.filter(id=pk).first()
        if not target_user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        is_active = request.data.get('is_active')
        if is_active is not None:
            target_user.is_active = bool(is_active)
            target_user.save()
            AuditLog.objects.create(
                actor=request.user,
                action="USER_STATUS_CHANGED",
                target_resource=f"User {target_user.username}",
                metadata={"is_active": target_user.is_active}
            )

        return Response(UserSerializer(target_user).data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        user = self.request.user
        if not (user and (user.is_staff or user.is_superuser)):
            # Return audit logs for user's assigned projects
            project_ids = list(user.project_memberships.values_list('project_id', flat=True)) if user else []
            return self.queryset.filter(project_id__in=project_ids)
        return self.queryset


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Non-privileged by default
            user.is_staff = False
            user.is_superuser = False
            user.save()

            AuditLog.objects.create(
                actor=user,
                action="USER_REGISTERED",
                target_resource=f"User {user.username}",
                metadata={"email": user.email}
            )

            return Response({
                "user": UserSerializer(user).data,
                "token": f"token_{user.id}_{user.username}"
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            return Response({
                "user": UserSerializer(user).data,
                "token": f"token_{user.id}_{user.username}"
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    def get(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first()
        if user:
            data = UserSerializer(user).data
            data['is_staff'] = user.is_staff
            data['is_superuser'] = user.is_superuser
            return Response(data)
        return Response({"error": "No user found"}, status=status.HTTP_404_NOT_FOUND)


import os
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, NotFound
from .models import Document
from .serializers import DocumentSerializer
from .services import process_document
from projects.permissions import check_project_permission

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all().order_by('-uploaded_at')
    serializer_class = DocumentSerializer
    
    def get_queryset(self):
        user = self.request.user
        project_id = self.request.query_params.get('project_id')
        
        if project_id:
            # RBAC Check: View permission
            if user and not user.is_staff and not check_project_permission(user, project_id, 'view'):
                return self.queryset.none()
            return self.queryset.filter(project_id=project_id)

        if user and not user.is_staff:
            # Only documents belonging to projects the user is authorized to view
            user_project_ids = list(user.project_memberships.values_list('project_id', flat=True)) if user.is_authenticated else []
            return self.queryset.filter(project_id__in=user_project_ids)

        return self.queryset

    def create(self, request, *args, **kwargs):
        user = request.user
        project_id = request.data.get('project') or request.data.get('project_id')
        if project_id and not check_project_permission(user, project_id, 'contribute'):
            return Response(
                {"error": "Forbidden: Read-Only Reviewers and unauthorized users cannot upload documents."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        project = serializer.validated_data.get('project')
        
        # RBAC Check: Reviewers cannot upload documents (requires 'contribute' permission)
        if not check_project_permission(user, project.id, 'contribute'):
            raise PermissionDenied("You do not have permission to upload documents to this project.")


        file_obj = self.request.FILES.get('file_path')
        name = self.request.data.get('name')
        if not name and file_obj:
            name = file_obj.name
        
        file_type = self.request.data.get('file_type')
        if not file_type and file_obj:
            ext = os.path.splitext(file_obj.name)[1].lower().replace('.', '')
            file_type = ext.upper() if ext else 'TXT'
            
        file_size = file_obj.size if file_obj else 0

        doc = serializer.save(name=name, file_type=file_type, file_size=file_size)
        
        # Automatically process document on upload
        try:
            process_document(doc.id)
        except Exception as e:
            print("Auto processing error:", e)

    def perform_destroy(self, instance):
        user = self.request.user
        # RBAC Check: Team members by default cannot delete source documents; requires 'manage'
        if not check_project_permission(user, instance.project_id, 'manage'):
            raise PermissionDenied("Only Project Managers and Administrators can delete documents.")

        # Clean up file on disk
        try:
            if instance.file_path and instance.file_path.name:
                instance.file_path.delete(save=False)
        except Exception as e:
            print(f"Warning: error deleting document file {instance.id}:", e)

        instance.delete()
    
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        document = self.get_object()
        user = request.user
        if not check_project_permission(user, document.project_id, 'contribute'):
            raise PermissionDenied("You do not have permission to process documents in this project.")

        success = process_document(document.id)
        if success:
            return Response({'status': 'Processing successful'})
        return Response({'status': 'Processing failed', 'error': document.processing_error}, status=status.HTTP_400_BAD_REQUEST)



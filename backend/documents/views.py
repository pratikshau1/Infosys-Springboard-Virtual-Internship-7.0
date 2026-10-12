import os
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Document
from .serializers import DocumentSerializer
from .services import process_document

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all().order_by('-uploaded_at')
    serializer_class = DocumentSerializer
    
    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        if project_id:
            return self.queryset.filter(project_id=project_id)
        return self.queryset

    def perform_create(self, serializer):
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
    
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        document = self.get_object()
        success = process_document(document.id)
        if success:
            return Response({'status': 'Processing successful'})
        return Response({'status': 'Processing failed', 'error': document.processing_error}, status=status.HTTP_400_BAD_REQUEST)


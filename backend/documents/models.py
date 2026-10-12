from django.db import models
from projects.models import Project

class Document(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50) # PDF, DOCX, CSV, TXT
    file_path = models.FileField(upload_to='project_documents/')
    file_size = models.IntegerField(default=0) # Size in bytes
    status = models.CharField(max_length=50, default='Uploaded') # Uploaded, Processing, Processed, Failed
    processing_error = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    num_pages_rows = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.name} ({self.project.name})"

class DocumentChunk(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='all_chunks')
    content = models.TextField()
    chunk_index = models.IntegerField()
    page_number = models.IntegerField(blank=True, null=True)
    metadata = models.JSONField(default=dict)
    vector_reference = models.CharField(max_length=255, blank=True, null=True) # ID in ChromaDB

    def __str__(self):
        return f"Chunk {self.chunk_index} of {self.document.name}"

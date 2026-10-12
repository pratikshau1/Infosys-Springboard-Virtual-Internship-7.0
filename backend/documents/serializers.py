import os
from rest_framework import serializers
from .models import Document, DocumentChunk

class DocumentSerializer(serializers.ModelSerializer):
    file_type = serializers.CharField(required=False, allow_blank=True, default='')
    file_size = serializers.IntegerField(required=False, default=0)
    name = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = Document
        fields = '__all__'

    def validate(self, attrs):
        file_obj = attrs.get('file_path')
        if file_obj:
            if not attrs.get('name'):
                attrs['name'] = file_obj.name
            if not attrs.get('file_type'):
                ext = os.path.splitext(file_obj.name)[1].lower().replace('.', '')
                attrs['file_type'] = ext.upper() if ext else 'TXT'
            if not attrs.get('file_size'):
                attrs['file_size'] = getattr(file_obj, 'size', 0)
        return attrs

class DocumentChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentChunk
        fields = '__all__'

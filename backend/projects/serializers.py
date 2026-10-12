from rest_framework import serializers
from .models import Project, ProjectMember, ProjectInvitation, AuditLog
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class ProjectSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    project_manager = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    documents_count = serializers.SerializerMethodField()
    open_risks_count = serializers.SerializerMethodField()
    open_blockers_count = serializers.SerializerMethodField()
    health_score = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    manager_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Project
        fields = '__all__'

    def validate(self, data):
        start_date = data.get('start_date')
        target_date = data.get('target_date')
        if start_date and target_date and target_date < start_date:
            raise serializers.ValidationError({
                "target_date": "Target completion date cannot be earlier than start date."
            })
        return data

    def get_can_delete(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return True # Fallback for local demo
        user = request.user
        if user.is_staff or user.is_superuser:
            return True
        if obj.owner == user:
            return True
        pm_member = obj.members.filter(user=user, role__icontains='Manager').exists()
        return pm_member

    def get_can_edit(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return True
        user = request.user
        if user.is_staff or user.is_superuser or obj.owner == user:
            return True
        return obj.members.filter(user=user, role__icontains='Manager').exists()

    def get_project_manager(self, obj):
        # Return assigned PM or owner username/name
        pm_member = obj.members.filter(role__icontains='Manager').select_related('user').first()
        if pm_member:
            return pm_member.user.get_full_name() or pm_member.user.username
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return "Unassigned"

    def get_progress_percentage(self, obj):
        deliverables = obj.deliverables.all()
        total = deliverables.count()
        if total == 0:
            return 0
        completed = deliverables.filter(status__iexact='Completed').count()
        in_progress = deliverables.filter(status__iexact='In Progress').count()
        # Progress calculation: 100% for completed, 40% for in progress
        score = int(((completed * 1.0 + in_progress * 0.4) / total) * 100)
        return min(100, max(0, score))

    def get_documents_count(self, obj):
        return obj.documents.count()

    def get_open_risks_count(self, obj):
        return obj.risks.exclude(status__iexact='Mitigated').exclude(status__iexact='Resolved').exclude(status__iexact='Closed').count()

    def get_open_blockers_count(self, obj):
        return obj.blockers.exclude(status__iexact='Resolved').exclude(status__iexact='Closed').count()

    def get_health_score(self, obj):
        if hasattr(obj, 'health_score') and obj.health_score:
            return obj.health_score.overall_score
        return None

class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = ProjectMember
        fields = '__all__'


class ProjectInvitationSerializer(serializers.ModelSerializer):
    invited_by = UserSerializer(read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    project_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = ProjectInvitation
        fields = '__all__'
        read_only_fields = ['token', 'invited_by', 'is_revoked', 'is_accepted', 'expires_at', 'created_at']
        extra_kwargs = {
            'project': {'required': False},
            'token': {'required': False},
            'expires_at': {'required': False},
            'invited_by': {'required': False}
        }


    def validate(self, attrs):
        project_id = attrs.get('project_id')
        if project_id and 'project' not in attrs:
            from .models import Project
            try:
                attrs['project'] = Project.objects.get(id=project_id)
            except Project.DoesNotExist:
                raise serializers.ValidationError({"project_id": "Invalid project ID."})
        elif 'project' not in attrs and not project_id:
            raise serializers.ValidationError({"project_id": "Project ID is required."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('project_id', None)
        return super().create(validated_data)




class AuditLogSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = '__all__'


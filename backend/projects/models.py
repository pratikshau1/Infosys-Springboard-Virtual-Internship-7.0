from django.db import models
from django.contrib.auth.models import User

class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    target_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=50, default='In Progress')
    category = models.CharField(max_length=100, default='General')
    priority = models.CharField(max_length=50, default='Medium')
    objectives = models.TextField(blank=True, null=True)
    tags = models.CharField(max_length=255, blank=True, null=True)
    is_demo = models.BooleanField(default=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

from django.utils import timezone

class ProjectMember(models.Model):
    ROLE_CHOICES = [
        ('Platform Administrator', 'Platform Administrator'),
        ('Project Manager', 'Project Manager'),
        ('Team Member', 'Team Member'),
        ('Read-Only Reviewer', 'Read-Only Reviewer'),
    ]

    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Invited', 'Invited'),
        ('Revoked', 'Revoked'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_memberships')
    role = models.CharField(max_length=50, default='Team Member')
    status = models.CharField(max_length=50, default='Active')
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='invited_members')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('project', 'user')

    def __str__(self):
        return f"{self.user.username} - {self.project.name} ({self.role})"


class ProjectInvitation(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    role = models.CharField(max_length=50, default='Team Member')
    token = models.CharField(max_length=128, unique=True)
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    is_revoked = models.BooleanField(default=False)
    is_accepted = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        from django.utils import timezone
        return not self.is_revoked and not self.is_accepted and self.expires_at > timezone.now()

    def __str__(self):
        return f"Invite {self.email} to {self.project.name} as {self.role}"


class AuditLog(models.Model):
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_actions')
    action = models.CharField(max_length=100)
    target_resource = models.CharField(max_length=255)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, related_name='audit_logs')
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        actor_name = self.actor.username if self.actor else "System"
        return f"[{self.timestamp}] {actor_name} -> {self.action} on {self.target_resource}"


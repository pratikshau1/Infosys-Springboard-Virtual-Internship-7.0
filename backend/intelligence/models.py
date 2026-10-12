from django.db import models
from projects.models import Project

class ScopeItem(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='scope_items')
    title = models.CharField(max_length=255)
    description = models.TextField()
    type = models.CharField(max_length=100) # e.g. Functional Requirement, Goal
    source_document = models.CharField(max_length=255, blank=True, null=True)

class Deliverable(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='deliverables')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    deadline = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=50, default='Pending')
    source_document = models.CharField(max_length=255, blank=True, null=True)

class Risk(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='risks')
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=100)
    probability = models.CharField(max_length=50) # Low, Medium, High
    impact = models.CharField(max_length=50)      # Low, Medium, High
    severity = models.CharField(max_length=50)    # Low, Moderate, Critical
    mitigation = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default='Active')
    source_document = models.CharField(max_length=255, blank=True, null=True)

class Blocker(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='blockers')
    title = models.CharField(max_length=255)
    description = models.TextField()
    priority = models.CharField(max_length=50) # High, Medium, Low
    owner = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=50, default='Active')
    source_document = models.CharField(max_length=255, blank=True, null=True)

class ActionItem(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='action_items')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    owner = models.CharField(max_length=255, blank=True, null=True)
    priority = models.CharField(max_length=50)
    due_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=50, default='Pending')
    source_document = models.CharField(max_length=255, blank=True, null=True)

class HealthScore(models.Model):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='health_score')
    overall_score = models.IntegerField(default=0)
    scope_score = models.IntegerField(default=0)
    timeline_score = models.IntegerField(default=0)
    blocker_score = models.IntegerField(default=0)
    risk_score = models.IntegerField(default=0)
    progress_score = models.IntegerField(default=0)
    documentation_score = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now=True)

class ChatMessage(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='chat_history')
    user_id = models.IntegerField(default=1) # Just storing user ID for simplicity
    question = models.TextField()
    answer = models.TextField()
    sources = models.JSONField(default=list)
    answer_type = models.CharField(max_length=50, default='project_specific', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


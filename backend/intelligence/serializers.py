from rest_framework import serializers
from .models import ScopeItem, Risk, Blocker, ActionItem, Deliverable, HealthScore, ChatMessage

class ScopeItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScopeItem
        fields = '__all__'

class RiskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Risk
        fields = '__all__'

class BlockerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Blocker
        fields = '__all__'

class ActionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActionItem
        fields = '__all__'

class DeliverableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deliverable
        fields = '__all__'

class HealthScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthScore
        fields = '__all__'

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = '__all__'


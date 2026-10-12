from datetime import datetime, timedelta
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ScopeItem, Risk, Blocker, ActionItem, Deliverable, HealthScore, ChatMessage
from .serializers import (
    ScopeItemSerializer, RiskSerializer, BlockerSerializer, 
    ActionItemSerializer, DeliverableSerializer, HealthScoreSerializer,
    ChatMessageSerializer
)
from projects.models import Project
from agents.services import (
    ask_project_assistant, generate_project_report, 
    calculate_health_score, run_orchestrator
)

class ScopeItemViewSet(viewsets.ModelViewSet):
    queryset = ScopeItem.objects.all()
    serializer_class = ScopeItemSerializer

    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        if project_id:
            return self.queryset.filter(project_id=project_id)
        return self.queryset

class RiskViewSet(viewsets.ModelViewSet):
    queryset = Risk.objects.all()
    serializer_class = RiskSerializer

    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        if project_id:
            return self.queryset.filter(project_id=project_id)
        return self.queryset

class BlockerViewSet(viewsets.ModelViewSet):
    queryset = Blocker.objects.all()
    serializer_class = BlockerSerializer

    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        if project_id:
            return self.queryset.filter(project_id=project_id)
        return self.queryset

class ActionItemViewSet(viewsets.ModelViewSet):
    queryset = ActionItem.objects.all()
    serializer_class = ActionItemSerializer

    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        if project_id:
            return self.queryset.filter(project_id=project_id)
        return self.queryset

class DeliverableViewSet(viewsets.ModelViewSet):
    queryset = Deliverable.objects.all()
    serializer_class = DeliverableSerializer

    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        if project_id:
            return self.queryset.filter(project_id=project_id)
        return self.queryset

class HealthScoreViewSet(viewsets.ModelViewSet):
    queryset = HealthScore.objects.all()
    serializer_class = HealthScoreSerializer

    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        if project_id:
            # Auto-calculate if not present
            scores = self.queryset.filter(project_id=project_id)
            if not scores.exists():
                calculate_health_score(project_id)
            return self.queryset.filter(project_id=project_id)
        return self.queryset

class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all().order_by('created_at')
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        if project_id:
            return self.queryset.filter(project_id=project_id)
        return self.queryset

    def create(self, request, *args, **kwargs):
        project_id = request.data.get('project_id')
        question = request.data.get('question')
        
        if not project_id or not question:
            return Response(
                {"error": "Both 'project_id' and 'question' are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        result = ask_project_assistant(project_id, question)
        return Response(result, status=status.HTTP_201_CREATED)

class ForecastView(APIView):
    def get(self, request):
        project_id = request.query_params.get('project_id')
        if not project_id:
            return Response({"error": "project_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

        blockers = Blocker.objects.filter(project_id=project_id, status__iexact='Active')
        risks = Risk.objects.filter(project_id=project_id, severity__iexact='Critical')
        
        # Calculate delay slip days
        delay_days = (blockers.count() * 3) + (risks.count() * 2)
        target_date = project.target_date or (datetime.now().date() + timedelta(days=45))
        forecasted_date = target_date + timedelta(days=delay_days)
        
        confidence = max(60, 95 - (delay_days * 2))
        
        reasoning = []
        if blockers.exists():
            reasoning.append(f"{blockers.count()} active blockers are delaying feature validation.")
        if risks.exists():
            reasoning.append(f"{risks.count()} critical risks pose integration dependencies.")
        if not reasoning:
            reasoning.append("Development is currently tracking along the projected timeline.")

        return Response({
            "project_id": project.id,
            "project_name": project.name,
            "planned_date": target_date.strftime("%d %B %Y"),
            "forecasted_date": forecasted_date.strftime("%d %B %Y"),
            "slip_days": delay_days,
            "confidence_score": f"{confidence}%",
            "summary": " ".join(reasoning)
        })

class GenerateReportView(APIView):
    def post(self, request):
        project_id = request.data.get('project_id')
        report_type = request.data.get('report_type', 'executive_summary')
        
        if not project_id:
            return Response({"error": "project_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        markdown = generate_project_report(project_id, report_type)
        return Response({
            "report_type": report_type,
            "markdown": markdown
        })

class RunAgentsView(APIView):
    def post(self, request):
        project_id = request.data.get('project_id')
        if not project_id:
            return Response({"error": "project_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        success = run_orchestrator(project_id)
        return Response({"status": "Agents executed successfully" if success else "Failed"})

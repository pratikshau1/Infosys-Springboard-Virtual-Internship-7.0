from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ScopeItemViewSet, RiskViewSet, BlockerViewSet, 
    ActionItemViewSet, DeliverableViewSet, HealthScoreViewSet,
    ChatMessageViewSet, ForecastView, GenerateReportView, RunAgentsView
)

router = DefaultRouter()
router.register(r'scope', ScopeItemViewSet)
router.register(r'risks', RiskViewSet)
router.register(r'blockers', BlockerViewSet)
router.register(r'actions', ActionItemViewSet)
router.register(r'deliverables', DeliverableViewSet)
router.register(r'health', HealthScoreViewSet)
router.register(r'chat', ChatMessageViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('forecast/', ForecastView.as_view(), name='project-forecast'),
    path('generate-report/', GenerateReportView.as_view(), name='generate-report'),
    path('run-agents/', RunAgentsView.as_view(), name='run-agents'),
]


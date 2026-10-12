from django.test import TestCase
from django.contrib.auth.models import User
from projects.models import Project
from intelligence.models import ScopeItem, Risk, Blocker, Deliverable, ActionItem, HealthScore
from agents.services import calculate_health_score

class HealthScoreEngineTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester', password='password123')
        self.project = Project.objects.create(
            name='Test Project',
            description='Automated Test Suite Project',
            owner=self.user
        )

    def test_health_score_calculation(self):
        # Create Scope Items
        for i in range(5):
            ScopeItem.objects.create(
                project=self.project,
                title=f'Scope {i}',
                description='Requirement',
                type='Functional Requirement'
            )

        # Create Risks
        Risk.objects.create(
            project=self.project,
            title='Test Risk',
            description='Test risk description',
            category='Technical',
            probability='Low',
            impact='Low',
            severity='Low',
            status='Active'
        )

        health = calculate_health_score(self.project.id)
        self.assertIsNotNone(health)
        self.assertGreater(health.overall_score, 0)
        self.assertLessEqual(health.overall_score, 100)
        self.assertEqual(health.scope_score, 75)

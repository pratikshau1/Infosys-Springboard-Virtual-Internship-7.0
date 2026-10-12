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


class AIAssistantIntentAndResponseTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.user = User.objects.create_user(username='pm_user', password='password123')
        self.project = Project.objects.create(
            name='E-Commerce Platform',
            description='Online store with microservices',
            owner=self.user
        )
        from projects.models import ProjectMember
        ProjectMember.objects.create(project=self.project, user=self.user, role='Project Manager', status='Active')
        self.client.force_authenticate(user=self.user)

    def test_general_question_answered_without_project_rejection(self):
        """1. General questions are classified as 'general' and answered directly."""
        from agents.services import classify_question_intent, ask_project_assistant
        
        q = "What is machine learning?"
        intent = classify_question_intent(q)
        self.assertEqual(intent, 'general')

        res = ask_project_assistant(self.project.id, q, user_id=self.user.id)
        self.assertEqual(res['answer_type'], 'general')
        self.assertNotIn("This is not related to the project", res['answer'])
        self.assertNotIn("This question is not related to the project", res['answer'])
        self.assertTrue(len(res['answer']) > 0)
        # General question should not force document sources
        self.assertEqual(len(res['sources']), 0)

    def test_general_programming_question_supported(self):
        """2. General programming questions are supported without requiring documents."""
        from agents.services import classify_question_intent, ask_project_assistant
        
        q = "Write a Python function to reverse a string"
        intent = classify_question_intent(q)
        self.assertEqual(intent, 'general')

        res = ask_project_assistant(self.project.id, q, user_id=self.user.id)
        self.assertEqual(res['answer_type'], 'general')
        self.assertTrue(len(res['answer']) > 0)

    def test_mixed_question_intent_detection(self):
        """3. Mixed questions combining general tech and project context."""
        from agents.services import classify_question_intent, ask_project_assistant
        
        q = "How can Docker improve our project's deployment?"
        intent = classify_question_intent(q, project_name=self.project.name)
        self.assertEqual(intent, 'mixed')

        res = ask_project_assistant(self.project.id, q, user_id=self.user.id)
        self.assertEqual(res['answer_type'], 'mixed')
        self.assertTrue(len(res['answer']) > 0)

    def test_project_specific_question_intent_detection(self):
        """4. Questions about deliverables/risks/blockers are classified as project_specific."""
        from agents.services import classify_question_intent, ask_project_assistant
        
        q = "What are the major risks in this project?"
        intent = classify_question_intent(q)
        self.assertEqual(intent, 'project_specific')

        res = ask_project_assistant(self.project.id, q, user_id=self.user.id)
        self.assertEqual(res['answer_type'], 'project_specific')
        self.assertTrue(len(res['answer']) > 0)


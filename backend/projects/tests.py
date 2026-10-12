from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from projects.models import Project, ProjectMember
from documents.models import Document, DocumentChunk


class ProjectCreationAndDeletionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin_user = User.objects.create_superuser(
            username='admin_tester',
            email='admin@tester.io',
            password='password123'
        )

        # Project manager user
        self.pm_user = User.objects.create_user(
            username='pm_tester',
            email='pm@tester.io',
            password='password123'
        )

        # Team member user
        self.member_user = User.objects.create_user(
            username='member_tester',
            email='member@tester.io',
            password='password123'
        )

        # Sample project owned by pm_user
        self.project = Project.objects.create(
            name='Alpha Analytics Hub',
            description='Enterprise telemetry dashboard',
            category='Enterprise SaaS',
            priority='High',
            status='In Progress',
            start_date=date.today(),
            target_date=date.today() + timedelta(days=60),
            owner=self.pm_user
        )
        ProjectMember.objects.create(project=self.project, user=self.pm_user, role='Project Manager')
        ProjectMember.objects.create(project=self.project, user=self.member_user, role='Team Member')

    def test_authorized_user_creates_project_successfully(self):
        """1. Authorized user creates a project successfully with memberships."""
        self.client.force_authenticate(user=self.pm_user)
        payload = {
            "name": "Beta Platform",
            "description": "Beta test project description",
            "category": "Education Technology",
            "priority": "High",
            "status": "Planning",
            "start_date": str(date.today()),
            "target_date": str(date.today() + timedelta(days=90))
        }
        response = self.client.post('/api/projects/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_id = response.data['id']
        project = Project.objects.get(id=created_id)
        self.assertEqual(project.name, "Beta Platform")
        self.assertEqual(project.owner, self.pm_user)

        # Verify creator receives the correct project membership
        membership = ProjectMember.objects.filter(project=project, user=self.pm_user).first()
        self.assertIsNotNone(membership)
        self.assertEqual(membership.role, 'Project Manager')

    def test_required_field_validation(self):
        """2. Required-field validation works (name is required)."""
        self.client.force_authenticate(user=self.pm_user)
        payload = {
            "description": "Missing project name"
        }
        response = self.client.post('/api/projects/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)

    def test_invalid_dates_rejected(self):
        """3. Invalid dates where target completion is earlier than start date are rejected."""
        self.client.force_authenticate(user=self.pm_user)
        payload = {
            "name": "Date Test Project",
            "description": "Test invalid dates",
            "start_date": str(date.today() + timedelta(days=30)),
            "target_date": str(date.today()) # earlier than start_date
        }
        response = self.client.post('/api/projects/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('target_date', response.data)

    def test_unauthorized_team_member_cannot_create_project(self):
        """6. Unauthorized team member cannot create a project through the API."""
        self.client.force_authenticate(user=self.member_user)
        payload = {
            "name": "Illegal Project",
            "description": "Team member creation test",
            "start_date": str(date.today()),
            "target_date": str(date.today() + timedelta(days=30))
        }
        response = self.client.post('/api/projects/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthorized_user_cannot_delete_project(self):
        """7. Unauthorized team member cannot delete a project by calling DELETE."""
        self.client.force_authenticate(user=self.member_user)
        response = self.client.delete(f'/api/projects/{self.project.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Project must still exist in DB
        self.assertTrue(Project.objects.filter(id=self.project.id).exists())

    def test_authorized_owner_or_admin_deletes_project_safely(self):
        """9. Confirming deletion removes project and cascades cleanly."""
        # Attach dummy document and chunks to verify safe cascade
        doc = Document.objects.create(
            project=self.project,
            name='Test_Spec.pdf',
            file_type='PDF',
            status='Processed'
        )
        DocumentChunk.objects.create(
            project=self.project,
            document=doc,
            content='Test content excerpt',
            chunk_index=0
        )

        self.client.force_authenticate(user=self.pm_user)
        response = self.client.delete(f'/api/projects/{self.project.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Confirm project is deleted
        self.assertFalse(Project.objects.filter(id=self.project.id).exists())
        # Confirm associated documents and chunks are deleted
        self.assertFalse(Document.objects.filter(project_id=self.project.id).exists())
        self.assertFalse(DocumentChunk.objects.filter(project_id=self.project.id).exists())

    def test_admin_can_delete_any_project(self):
        """Admin can delete projects across the platform."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/projects/{self.project.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Project.objects.filter(id=self.project.id).exists())

    def test_edit_project_by_authorized_user(self):
        """Authorized user can edit project attributes."""
        self.client.force_authenticate(user=self.pm_user)
        payload = {
            "name": "Alpha Analytics Hub (Updated)",
            "priority": "Critical",
            "status": "Active"
        }
        response = self.client.patch(f'/api/projects/{self.project.id}/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.project.refresh_from_db()
        self.assertEqual(self.project.name, "Alpha Analytics Hub (Updated)")
        self.assertEqual(self.project.priority, "Critical")


class RoleBasedAccessControlTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin
        self.admin = User.objects.create_superuser(
            username='platform_admin',
            email='admin@projectiq.io',
            password='Password123!'
        )

        # PM 1 and PM 2
        self.pm1 = User.objects.create_user(
            username='pm_one',
            email='pm1@projectiq.io',
            password='Password123!'
        )
        self.pm2 = User.objects.create_user(
            username='pm_two',
            email='pm2@projectiq.io',
            password='Password123!'
        )

        # Team Member
        self.member = User.objects.create_user(
            username='team_contributor',
            email='member@projectiq.io',
            password='Password123!'
        )

        # Reviewer
        self.reviewer = User.objects.create_user(
            username='read_only_reviewer',
            email='reviewer@projectiq.io',
            password='Password123!'
        )

        # Projects
        self.project1 = Project.objects.create(
            name='Project One',
            owner=self.pm1,
            is_demo=False
        )
        ProjectMember.objects.create(project=self.project1, user=self.pm1, role='Project Manager', status='Active')
        ProjectMember.objects.create(project=self.project1, user=self.member, role='Team Member', status='Active')
        ProjectMember.objects.create(project=self.project1, user=self.reviewer, role='Read-Only Reviewer', status='Active')

        self.project2 = Project.objects.create(
            name='Project Two Secret',
            owner=self.pm2,
            is_demo=False
        )
        ProjectMember.objects.create(project=self.project2, user=self.pm2, role='Project Manager', status='Active')

    def test_unauthenticated_users_cannot_access_protected_endpoints(self):
        """1. Unauthenticated users cannot access protected endpoints."""
        response = self.client.get(f'/api/projects/{self.project1.id}/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_public_signup_cannot_create_administrator(self):
        """2. Public signup cannot create an administrator."""
        payload = {
            "username": "new_public_user",
            "email": "public@user.com",
            "password": "StrongPassword123!",
            "is_staff": True,
            "is_superuser": True
        }
        response = self.client.post('/api/projects/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(username="new_public_user")
        self.assertFalse(new_user.is_staff)
        self.assertFalse(new_user.is_superuser)

    def test_project_manager_can_access_assigned_projects(self):
        """3. Project managers can access assigned projects."""
        self.client.force_authenticate(user=self.pm1)
        response = self.client.get(f'/api/projects/{self.project1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_project_manager_cannot_access_unrelated_projects(self):
        """4. Project managers cannot access unrelated projects (Cross-project isolation)."""
        self.client.force_authenticate(user=self.pm1)
        response = self.client.get(f'/api/projects/{self.project2.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_team_members_cannot_perform_administrative_actions(self):
        """5. Team members cannot delete projects or manage platform users."""
        self.client.force_authenticate(user=self.member)
        # Cannot delete project
        res_del = self.client.delete(f'/api/projects/{self.project1.id}/')
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)
        # Cannot manage platform users
        res_users = self.client.get('/api/projects/users/')
        self.assertEqual(res_users.status_code, status.HTTP_403_FORBIDDEN)

    def test_team_members_cannot_modify_restricted_project_resources(self):
        """6. Team members cannot delete documents."""
        doc = Document.objects.create(
            project=self.project1,
            name='Spec.pdf',
            file_type='PDF'
        )
        self.client.force_authenticate(user=self.member)
        res = self.client.delete(f'/api/documents/{doc.id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_reviewers_cannot_perform_write_operations(self):
        """7. Reviewers cannot perform write/contribute operations."""
        self.client.force_authenticate(user=self.reviewer)
        # Cannot upload document
        res_doc = self.client.post('/api/documents/', {'project_id': self.project1.id, 'name': 'Doc.pdf'}, format='multipart')
        self.assertEqual(res_doc.status_code, status.HTTP_403_FORBIDDEN)

    def test_changing_project_id_does_not_expose_other_project_data(self):
        """8. IDOR protection: querying another project's items returns 403 or empty."""
        self.client.force_authenticate(user=self.pm1)
        res = self.client.get(f'/api/intelligence/scope/?project_id={self.project2.id}')
        # Should return empty queryset because pm1 has no permission on project2
        self.assertEqual(len(res.data), 0)

    def test_invitation_flow_and_token_single_use(self):
        """9, 10, 11. Invitation generation, acceptance, single-use, and revocation."""
        from projects.models import ProjectInvitation
        self.client.force_authenticate(user=self.pm1)

        # PM invites user
        res_invite = self.client.post('/api/projects/invitations/', {
            'project': self.project1.id,
            'email': 'collaborator@example.com',
            'role': 'Team Member'
        }, format='json')
        self.assertEqual(res_invite.status_code, status.HTTP_201_CREATED)

        token = res_invite.data['token']

        # Registered user accepts invitation
        collab_user = User.objects.create_user(
            username='collaborator',
            email='collaborator@example.com',
            password='Password123!'
        )
        self.client.force_authenticate(user=collab_user)
        res_accept = self.client.post('/api/projects/invitations/accept/', {'token': token}, format='json')
        self.assertEqual(res_accept.status_code, status.HTTP_200_OK)

        # Collab user now has active membership
        self.assertTrue(ProjectMember.objects.filter(
            project=self.project1, user=collab_user, role='Team Member', status='Active'
        ).exists())

        # Cannot reuse token
        res_reuse = self.client.post('/api/projects/invitations/accept/', {'token': token}, format='json')
        self.assertEqual(res_reuse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_revoked_member_loses_access(self):
        """12. Revoked members immediately lose project access."""
        membership = ProjectMember.objects.get(project=self.project1, user=self.member)
        membership.status = 'Revoked'
        membership.save()

        self.client.force_authenticate(user=self.member)
        res = self.client.get(f'/api/projects/{self.project1.id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


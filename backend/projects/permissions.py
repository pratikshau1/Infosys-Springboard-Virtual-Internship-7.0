from rest_framework import permissions
from projects.models import Project, ProjectMember

def get_effective_user(request):
    if request.user and request.user.is_authenticated:
        return request.user
    # If not authenticated, return None
    return None

def check_project_permission(user, project_id, required_level='view'):
    """
    Checks if a user has access to project_id.
    required_level:
      - 'view': Platform Admin, Project Owner, any Active Member (PM, Team Member, Reviewer)
      - 'contribute': Platform Admin, Project Owner, PM, Team Member (NOT Read-Only Reviewer)
      - 'manage': Platform Admin, Project Owner, Project Manager
      - 'admin': Platform Admin (staff/superuser)
    """
    if not user:
        return False
    if user.is_staff or user.is_superuser:
        return True

    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return False

    if project.owner == user:
        return True

    # Check active membership
    membership = ProjectMember.objects.filter(
        project_id=project_id, 
        user=user, 
        status='Active'
    ).first()

    if not membership:
        # Check if project is demo (allow view/contribute for demo explorations if requested)
        if project.is_demo and required_level in ['view', 'contribute']:
            return True
        return False

    role = membership.role

    if required_level == 'view':
        return True
    elif required_level == 'contribute':
        return role in ['Platform Administrator', 'Project Manager', 'Team Member', 'Member']
    elif required_level == 'manage':
        return role in ['Platform Administrator', 'Project Manager']
    elif required_level == 'admin':
        return role == 'Platform Administrator' or user.is_staff

    return False


class HasProjectAccessPermission(permissions.BasePermission):
    """
    Object-level and query-level permission for Project and project-related resources.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            # Let viewset fallback or reject
            return True

        project_id = request.query_params.get('project_id') or request.data.get('project_id')
        if project_id:
            required_level = 'view'
            if request.method in ['POST', 'PUT', 'PATCH']:
                required_level = 'contribute'
            elif request.method == 'DELETE':
                required_level = 'manage'
            return check_project_permission(user, project_id, required_level)

        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return True

        project_id = getattr(obj, 'project_id', None) or getattr(obj, 'id', None)
        if hasattr(obj, 'project'):
            project_id = obj.project.id

        required_level = 'view'
        if request.method in ['PUT', 'PATCH']:
            required_level = 'contribute'
        elif request.method == 'DELETE':
            required_level = 'manage'

        return check_project_permission(user, project_id, required_level)

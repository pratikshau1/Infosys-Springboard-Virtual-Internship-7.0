import os
import django
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from projects.models import Project, ProjectMember
from documents.models import Document, DocumentChunk
from intelligence.models import ScopeItem, Deliverable, Risk, Blocker, ActionItem, HealthScore, ChatMessage
from agents.services import calculate_health_score

def seed():
    # 1. Ensure user
    user, _ = User.objects.get_or_create(username='admin', defaults={'email': 'admin@example.com'})
    
    # 2. Ensure project
    project, created = Project.objects.get_or_create(
        id=1,
        defaults={
            'name': 'Campus Bus Management System',
            'description': 'Real-time GPS tracking, smart schedule dispatch, and mobile ticketing platform for university transit.',
            'start_date': date.today() - timedelta(days=30),
            'target_date': date.today() + timedelta(days=60),
            'status': 'In Progress',
            'owner': user
        }
    )
    if not created:
        project.name = 'Campus Bus Management System'
        project.save()

    print(f"Project ready: {project.name}")

    # 3. Seed Scope Items
    scopes = [
        {"title": "Real-time Bus Tracking & Telemetry", "description": "Stream GPS coordinates every 5 seconds to student mobile app.", "type": "Functional Requirement"},
        {"title": "Dynamic Dispatch Scheduling Engine", "description": "Auto-adjust route frequencies based on peak campus class hours.", "type": "Functional Requirement"},
        {"title": "Digital Ticketing & QR Validation", "description": "Offline-capable QR pass scanning with cryptographic signatures.", "type": "Functional Requirement"},
        {"title": "Driver Alert & Route Deviation System", "description": "Instant push notifications when a bus exceeds route corridor.", "type": "Functional Requirement"},
        {"title": "High-Availability Transit API Gateway", "description": "Sub-50ms latency endpoint handling 5,000 requests/second.", "type": "Architecture"}
    ]
    for s in scopes:
        ScopeItem.objects.get_or_create(project=project, title=s['title'], defaults=s)

    # 4. Seed Deliverables
    delivs = [
        {"title": "Transit Tracking Core Microservice", "deadline": date.today() + timedelta(days=15), "status": "In Progress"},
        {"title": "Driver Android Terminal Application", "deadline": date.today() + timedelta(days=25), "status": "Pending"},
        {"title": "Student Mobile Flutter App Beta", "deadline": date.today() + timedelta(days=40), "status": "Pending"},
        {"title": "Transit Authority Admin Dashboard", "deadline": date.today() + timedelta(days=50), "status": "In Progress"},
    ]
    for d in delivs:
        Deliverable.objects.get_or_create(project=project, title=d['title'], defaults=d)

    # 5. Seed Risks
    risks = [
        {
            "title": "GPS Inaccuracy in Underground Terminals",
            "description": "Satellite signal attenuation causing intermittent route disruption in north basement station.",
            "category": "Technical",
            "probability": "High",
            "impact": "High",
            "severity": "Critical",
            "mitigation": "Deploy BLE beacon fallback triangulation inside covered transit bays."
        },
        {
            "title": "Third-Party SMS Gateway Rate Limits",
            "description": "Vendor rate throttle during peak student rush hours could drop critical OTP alerts.",
            "category": "Operational",
            "probability": "Medium",
            "impact": "Moderate",
            "severity": "Moderate",
            "mitigation": "Add secondary fallback SMS provider and push notification queuing."
        },
        {
            "title": "Driver Device Fleet Fragmentation",
            "description": "Legacy Android versions across leased buses cause camera QR scanning instability.",
            "category": "Technical",
            "probability": "Medium",
            "impact": "Medium",
            "severity": "Low",
            "mitigation": "Standardize camera API level and test on physical benchmark hardware."
        }
    ]
    for r in risks:
        Risk.objects.get_or_create(project=project, title=r['title'], defaults=r)

    # 6. Seed Blockers
    blockers = [
        {
            "title": "Database Read-Replica Synchronization Lag",
            "description": "High GPS ingestion throughput causing replication delays over 2.4 seconds.",
            "priority": "High",
            "owner": "Sarah Chen (Data Lead)",
            "status": "Active"
        },
        {
            "title": "Transit Authority SSL Certificate Provisioning",
            "description": "Awaiting university network team approval for custom DNS routing and subdomains.",
            "priority": "Medium",
            "owner": "Marcus Vance (DevOps)",
            "status": "Active"
        }
    ]
    for b in blockers:
        Blocker.objects.get_or_create(project=project, title=b['title'], defaults=b)

    # 7. Seed Action Items
    actions = [
        {"title": "Benchmark TimescaleDB vs Postgres for telemetry ingestion", "owner": "Sarah Chen", "priority": "High", "due_date": date.today() + timedelta(days=3), "status": "In Progress"},
        {"title": "Integrate Firebase Cloud Messaging failover pool", "owner": "Alex Rivera", "priority": "Medium", "due_date": date.today() + timedelta(days=7), "status": "Pending"},
        {"title": "Conduct field road test on Route 4 campus shuttle", "owner": "Dev Team", "priority": "High", "due_date": date.today() + timedelta(days=10), "status": "Pending"}
    ]
    for a in actions:
        ActionItem.objects.get_or_create(project=project, title=a['title'], defaults=a)

    # 8. Seed Sample Document & Chunks
    doc, _ = Document.objects.get_or_create(
        project=project,
        name='SRS_Campus_Transit_v1.0.pdf',
        defaults={
            'file_type': 'PDF',
            'file_size': 245000,
            'status': 'Processed',
            'num_pages_rows': 14
        }
    )
    sample_text = """Campus Bus Management System (CBMS) Architecture & Requirements.
1. System Objectives: Deliver real-time GPS tracking, automated scheduling dispatch, and contactless QR ticketing.
2. Technical Vulnerabilities: GPS signal drift in subterranean bus garages must be mitigated via BLE beacons.
3. Database Ingestion: System receives 5Hz coordinate telemetry from up to 80 active campus shuttles simultaneously."""
    DocumentChunk.objects.get_or_create(
        document=doc,
        project=project,
        chunk_index=0,
        defaults={
            'content': sample_text,
            'vector_reference': f"chunk_{doc.id}_0"
        }
    )

    # 9. Compute Health Score
    calculate_health_score(project.id)
    print("Health score computed.")

    # 10. Seed Welcome Chat Message
    ChatMessage.objects.get_or_create(
        project=project,
        question="What are the critical risks currently facing the bus tracking rollout?",
        defaults={
            'user_id': 1,
            'answer': "Based on the project documentation (SRS_Campus_Transit_v1.0.pdf):\n\nThe primary critical risk is **GPS signal degradation inside subterranean stations**, which can cause route tracking dropouts. Mitigation strategy is active deployment of BLE beacon triangulation in covered terminals.",
            'sources': [{"document_name": "SRS_Campus_Transit_v1.0.pdf", "chunk_id": f"chunk_{doc.id}_0", "snippet": "Technical Vulnerabilities: GPS signal drift in subterranean bus garages..."}]
        }
    )
    print("Seed complete successfully!")

if __name__ == '__main__':
    seed()

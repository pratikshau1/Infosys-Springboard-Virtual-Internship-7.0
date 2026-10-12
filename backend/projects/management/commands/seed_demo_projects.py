import os
import io
import csv
from datetime import date, timedelta
import docx
import pandas as pd
from PyPDF2 import PdfReader

from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.contrib.auth.models import User
from django.conf import settings

from projects.models import Project, ProjectMember
from documents.models import Document, DocumentChunk
from documents.services import process_document
from intelligence.models import ScopeItem, Deliverable, Risk, Blocker, ActionItem, HealthScore, ChatMessage
from agents.services import calculate_health_score


def generate_valid_pdf_bytes(title, content_sections):
    clean_title = title.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
    lines = [f"{clean_title}"]
    for section_header, section_text in content_sections:
        lines.append(f"-- {section_header.upper()} --")
        words = section_text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)').split(' ')
        curr = []
        for w in words:
            curr.append(w)
            if len(' '.join(curr)) > 75:
                lines.append(' '.join(curr))
                curr = []
        if curr:
            lines.append(' '.join(curr))
        lines.append("")

    stream_ops = ['BT', '/F1 10 Tf', '14 TL', '45 745 Td']
    for l in lines[:45]:
        stream_ops.append(f'({l}) Tj T*')
    stream_ops.append('ET')

    stream_str = '\n'.join(stream_ops)
    stream_bytes = stream_str.encode('latin1', errors='replace')
    stream_len = len(stream_bytes)

    objects = []
    objects.append(b'%PDF-1.4\n')

    pos1 = sum(len(o) for o in objects)
    objects.append(b'1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')

    pos2 = sum(len(o) for o in objects)
    objects.append(b'2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')

    pos3 = sum(len(o) for o in objects)
    objects.append(b'3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n')

    pos4 = sum(len(o) for o in objects)
    objects.append(f'4 0 obj\n<< /Length {stream_len} >>\nstream\n'.encode('latin1') + stream_bytes + b'\nendstream\nendobj\n')

    pos5 = sum(len(o) for o in objects)
    objects.append(b'5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n')

    xref_pos = sum(len(o) for o in objects)
    xref = f'''xref
0 6
0000000000 65535 f \r
{pos1:010d} 00000 n \r
{pos2:010d} 00000 n \r
{pos3:010d} 00000 n \r
{pos4:010d} 00000 n \r
{pos5:010d} 00000 n \r
trailer
<< /Size 6 /Root 1 0 R >>
startxref
{xref_pos}
%%EOF'''
    objects.append(xref.encode('latin1'))
    return b''.join(objects)


def generate_docx_bytes(title, content_sections):
    doc = docx.Document()
    doc.add_heading(title, level=1)
    for section_header, section_text in content_sections:
        doc.add_heading(section_header, level=2)
        doc.add_paragraph(section_text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def generate_csv_bytes(headers, rows):
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    return buf.getvalue().encode('utf-8')


def generate_txt_bytes(title, content_sections):
    lines = [f"=== {title.upper()} ===", ""]
    for section_header, section_text in content_sections:
        lines.append(f"[{section_header}]")
        lines.append(section_text)
        lines.append("")
    return "\n".join(lines).encode('utf-8')


DEMO_PROJECTS_SPEC = [
    {
        "name": "Smart Campus Management Platform",
        "description": "A centralized campus management platform that brings together student services, attendance, timetables, campus announcements, facilities, and administrative workflows.",
        "category": "Education Technology",
        "status": "In Progress",
        "priority": "High",
        "start_offset_days": -45,
        "target_offset_days": 75,
        "pm_username": "campus_lead",
        "pm_name": "Dr. Elena Rostova",
        "pm_email": "elena.rostova@campus-demo.edu",
        "deliverables": [
            {"title": "Student Portal & Authentication Hub", "description": "Single sign-on access with multi-factor authentication for university students.", "status": "Completed", "deadline_offset": -10},
            {"title": "Automated Attendance & Biometric Module", "description": "Classroom attendance capture with RFID, biometric and mobile beacon validation.", "status": "In Progress", "deadline_offset": 20},
            {"title": "Dynamic Timetable & Room Allocation Engine", "description": "Scheduling matrix for faculty allocation and conflict-free room assignments.", "status": "In Progress", "deadline_offset": 35},
            {"title": "Campus Announcement & Emergency Broadcast System", "description": "Push notification and SMS alert pipeline for campus notifications.", "status": "Pending", "deadline_offset": 50},
            {"title": "Administrator & Registrar Workflow Dashboard", "description": "Academic records, course registrations, and grade audit management.", "status": "Pending", "deadline_offset": 70},
        ],
        "scope_items": [
            {"title": "Student Identity & Role-Based Access Control", "description": "Centralized directory synchronization supporting student, faculty, and registrar roles.", "type": "Functional Requirement"},
            {"title": "Classroom Attendance Telemetry", "description": "Daily automated attendance tracking with absent alerts to guardians.", "type": "Functional Requirement"},
            {"title": "Conflict-Free Timetable Generation", "description": "Constraint satisfaction algorithm resolving professor availability and classroom capacities.", "type": "Architecture"},
            {"title": "High-Priority Campus Emergency Broadcasts", "description": "Sub-minute push notification dispatch to 30,000 concurrent student app sessions.", "type": "Functional Requirement"},
            {"title": "Academic Record Audit & Transcript Generation", "description": "Tamper-evident grade auditing and digitally signed academic transcript exports.", "type": "Functional Requirement"},
        ],
        "risks": [
            {
                "title": "Legacy Student Database Inconsistency",
                "description": "Historical enrollment records have missing identifier fields causing synchronization mismatch.",
                "category": "Technical",
                "probability": "High",
                "impact": "High",
                "severity": "Critical",
                "mitigation": "Run data cleansing scripts and create an automated reconciliation staging table.",
                "status": "Active"
            },
            {
                "title": "Attendance Hardware Integration Delays",
                "description": "RFID turnstile vendor has not finalized the WebSocket payload specification.",
                "category": "Schedule",
                "probability": "High",
                "impact": "High",
                "severity": "Critical",
                "mitigation": "Build mock turnstile emulator to unblock attendance processing service development.",
                "status": "Active"
            },
            {
                "title": "Incomplete Multi-Campus Timetable Requirements",
                "description": "Cross-campus course scheduling policies remain disputed among department deans.",
                "category": "Operational",
                "probability": "Medium",
                "impact": "Medium",
                "severity": "Moderate",
                "mitigation": "Facilitate weekly dean working group meetings to finalize constraints baseline.",
                "status": "Active"
            },
            {
                "title": "Peak Registration Server Latency",
                "description": "High traffic during 2-hour course registration window may saturate relational DB connections.",
                "category": "Technical",
                "probability": "Medium",
                "impact": "High",
                "severity": "Moderate",
                "mitigation": "Introduce Redis session cache and connection pooling with read replicas.",
                "status": "Active"
            }
        ],
        "blockers": [
            {
                "title": "Pending Approval of Attendance Integration Architecture",
                "description": "Security audit committee must approve biometric fingerprint hashing methodology.",
                "priority": "High",
                "owner": "Marcus Bell (Security Lead)",
                "status": "Active"
            },
            {
                "title": "Delayed Campus API Specifications from Registrar",
                "description": "Awaiting final JSON schema for semester grading and prerequisite validation.",
                "priority": "High",
                "owner": "Sarah Jenkins (Registrar IT)",
                "status": "Active"
            }
        ],
        "actions": [
            {"title": "Deploy biometric hashing test harness", "owner": "Marcus Bell", "priority": "High", "due_offset": 5, "status": "In Progress"},
            {"title": "Review clean-up script for legacy student records", "owner": "David Chen", "priority": "High", "due_offset": 8, "status": "Pending"},
            {"title": "Finalize timetable constraint matrix with Dean of Engineering", "owner": "Elena Rostova", "priority": "Medium", "due_offset": 12, "status": "Pending"}
        ],
        "welcome_chat": {
            "question": "What are the primary integration blockers affecting the campus management rollout?",
            "answer": "Based on project documentation (Blocker_Log.csv and Project_Proposal_Campus.pdf):\n\n1. **Attendance Integration Approval**: Biometric fingerprint data hashing methodology requires formal sign-off from the Security Audit Committee.\n2. **Registrar API Schema Delay**: The final JSON schema for semester grading prerequisites has not yet been delivered by Registrar IT.",
            "source_doc": "Blocker_Log.csv",
            "snippet": "Pending Approval of Attendance Integration Architecture. Security audit committee must approve biometric fingerprint hashing..."
        },
        "documents": [
            {
                "name": "Project_Proposal_Campus.pdf",
                "type": "PDF",
                "sections": [
                    ("Executive Summary", "The Smart Campus Management Platform unifies student affairs, attendance tracking, scheduling, and registrar operations across all university faculties."),
                    ("Strategic Objectives", "Reduce administrative friction, eliminate attendance paper logs, ensure zero timetable clashes, and establish emergency announcement channels."),
                    ("Budget and Governance", "18-month roadmap overseen by Academic Senate and Division of Information Technology.")
                ]
            },
            {
                "name": "Software_Requirements_Specification.docx",
                "type": "DOCX",
                "sections": [
                    ("System Scope", "Defines functional and non-functional requirements for student portal, faculty scheduling, and administrative dashboards."),
                    ("User Roles", "Student, Professor, Department Chair, Registrar Administrator, Facility Manager."),
                    ("Performance Constraints", "System must respond within 200 milliseconds for 95% of queries under 10,000 active sessions.")
                ]
            },
            {
                "name": "Functional_Requirements_Catalog.docx",
                "type": "DOCX",
                "sections": [
                    ("Student Services", "Self-service student portal allowing fee payment, elective enrollment, grade transcript view, and identity credentials."),
                    ("Attendance Telemetry", "Bluetooth low energy beacons and RFID turnstiles stream presence events to attendance microservice."),
                    ("Timetable Scheduling", "Automated timetable solver runs constraint programming model across lecture halls and laboratory slots.")
                ]
            },
            {
                "name": "Technical_Architecture_Overview.pdf",
                "type": "PDF",
                "sections": [
                    ("Architecture Overview", "Distributed microservices deployed on Kubernetes, utilizing Django REST Framework, PostgreSQL, Redis cache, and Kafka message brokers."),
                    ("Integration Points", "Registrar ERP SOAP service, campus directory LDAP, and SMS gateway endpoints."),
                    ("Security and Privacy", "Encrypted communication channels, OAuth2 JWT bearer tokens, and student data protection standards.")
                ]
            },
            {
                "name": "Project_Timeline_and_WBS.txt",
                "type": "TXT",
                "sections": [
                    ("Phase 1 - Inception", "Requirements elicitation and architecture signoff (Months 1-3). COMPLETED."),
                    ("Phase 2 - Core Construction", "Student portal, attendance telemetry, timetable engine (Months 4-8). IN PROGRESS."),
                    ("Phase 3 - Validation & Rollout", "Load testing, faculty pilots, registrar migration (Months 9-12). PENDING.")
                ]
            },
            {
                "name": "Team_RACI_Matrix.csv",
                "type": "CSV",
                "headers": ["Workstream", "Responsible", "Accountable", "Consulted", "Informed"],
                "rows": [
                    ["Student Portal", "Frontend Team Lead", "Elena Rostova (PM)", "UX Lead", "Student Union"],
                    ["Attendance Module", "IoT Firmware Lead", "Marcus Bell (Security)", "Registrar", "Faculty Staff"],
                    ["Timetable Solver", "Algorithm Engineer", "Elena Rostova (PM)", "Department Chairs", "Registrar Staff"],
                    ["Campus Alerts", "DevOps Engineer", "Division of IT", "Emergency Services", "All Campus"]
                ]
            },
            {
                "name": "Steering_Committee_Meeting_Notes.txt",
                "type": "TXT",
                "sections": [
                    ("Meeting Minutes", "Date: Last week. Attendees: Dr. Elena Rostova, Registrar IT, Security Lead."),
                    ("Discussion on Blockers", "Registrar IT delayed API specifications due to ongoing legacy database migrations. Marcus Bell raised security questions on biometric storage."),
                    ("Decisions", "Proceed with mock turnstile simulator to avoid blocking the development sprint.")
                ]
            },
            {
                "name": "Sprint_Progress_Report_Q3.docx",
                "type": "DOCX",
                "sections": [
                    ("Sprint Highlights", "Student portal authentication module delivered and validated with test student directory."),
                    ("Velocity and Burndown", "Team achieved 82% of planned story points. 18% delayed due to API spec blockers."),
                    ("Action Plan", "Prioritize attendance simulator and accelerate timetable constraint validation.")
                ]
            },
            {
                "name": "Quality_Assurance_Testing_Strategy.pdf",
                "type": "PDF",
                "sections": [
                    ("Testing Scope", "Unit testing, integration testing, end-to-end user journeys, and penetration testing."),
                    ("Load Testing Scenarios", "Simulate 30,000 concurrent students accessing timetable releases and emergency broadcasts."),
                    ("Pass Criteria", "Zero Sev-1 defects and minimum 85% automated test coverage across core microservices.")
                ]
            },
            {
                "name": "Risk_Assessment_and_Mitigation_Matrix.csv",
                "type": "CSV",
                "headers": ["Risk ID", "Risk Title", "Category", "Probability", "Impact", "Mitigation Strategy"],
                "rows": [
                    ["RSK-01", "Legacy Student Database Inconsistency", "Technical", "High", "High", "Deploy automated staging reconciliation pipeline"],
                    ["RSK-02", "Attendance Hardware Integration Delays", "Schedule", "High", "High", "Construct hardware turnstile emulator"],
                    ["RSK-03", "Incomplete Multi-Campus Timetable Requirements", "Operational", "Medium", "Medium", "Establish weekly dean working committee"],
                    ["RSK-04", "Peak Registration Server Latency", "Technical", "Medium", "High", "Configure Redis session clustering and read replicas"]
                ]
            },
            {
                "name": "Change_Request_Biometric_Validation.docx",
                "type": "DOCX",
                "sections": [
                    ("Change Title", "CR-04: Transition Biometric Raw Storage to Zero-Knowledge Hashes"),
                    ("Justification", "Compliance with institutional student data privacy directives."),
                    ("Impact Analysis", "Requires 4 developer days to update attendance service crypto module. No slip in overall target delivery.")
                ]
            },
            {
                "name": "Campus_Platform_Release_Plan.txt",
                "type": "TXT",
                "sections": [
                    ("Milestone 1 - Alpha", "Portal MVP and Timetable preview for faculty chairs. Target: Month 6."),
                    ("Milestone 2 - Beta Pilot", "Live attendance testing in Building 4 lecture halls. Target: Month 8."),
                    ("Milestone 3 - General Availability", "Campus-wide switchover for Autumn Semester. Target: Month 10.")
                ]
            }
        ]
    },
    {
        "name": "Healthcare Appointment & Patient Management System",
        "description": "A healthcare application for managing appointments, patient registration, doctor availability, scheduling, and administrative workflows.",
        "category": "Healthcare Technology",
        "status": "In Progress",
        "priority": "High",
        "start_offset_days": -60,
        "target_offset_days": 90,
        "pm_username": "health_pm",
        "pm_name": "Sarah Lin",
        "pm_email": "sarah.lin@medicare-demo.org",
        "deliverables": [
            {"title": "Patient Registration & Demographic Onboarding", "description": "HIPAA-compliant patient onboarding with insurance validation.", "status": "Completed", "deadline_offset": -20},
            {"title": "Doctor Availability & Roster Management", "description": "Physician shifts, holiday calendars, and on-call rotation schedules.", "status": "In Progress", "deadline_offset": 25},
            {"title": "Multi-Channel Appointment Scheduling Service", "description": "Real-time clinic slot reservations with conflict prevention.", "status": "In Progress", "deadline_offset": 45},
            {"title": "Notification & SMS Appointment Reminder Service", "description": "Automated reminder broadcasts reducing clinic no-show rates.", "status": "Pending", "deadline_offset": 65},
            {"title": "Clinical Administration & Clinic Operations Dashboard", "description": "Queue management, doctor consult logs, and billing readiness.", "status": "Pending", "deadline_offset": 85},
        ],
        "scope_items": [
            {"title": "HIPAA-Compliant Patient Record Ingestion", "description": "Encrypted patient identity verification and medical history ingestion.", "type": "Functional Requirement"},
            {"title": "Physician Shift & Clinical Roster System", "description": "Doctor specialty tagging, clinic hours, and emergency coverage management.", "type": "Functional Requirement"},
            {"title": "Appointment Conflict Prevention Engine", "description": "Distributed reservation lock preventing double bookings across care facilities.", "type": "Architecture"},
            {"title": "Automated SMS & Email Reminder Broadcasts", "description": "Timely notifications sent 48 hours and 2 hours prior to scheduled visits.", "type": "Functional Requirement"},
            {"title": "Clinic Floor Queue & Check-In Kiosk Interface", "description": "Real-time waiting room dashboard tracking triage arrival times.", "type": "Functional Requirement"},
        ],
        "risks": [
            {
                "title": "Patient-Data Privacy & HIPAA Compliance Audit",
                "description": "Storage of protected health information (PHI) requires strict zero-trust audit compliance.",
                "category": "Compliance",
                "probability": "High",
                "impact": "High",
                "severity": "Critical",
                "mitigation": "Enforce field-level database encryption and immutable audit logs.",
                "status": "Active"
            },
            {
                "title": "Cross-Facility Scheduling Conflicts",
                "description": "Specialist physicians working across two regional clinics may experience overlapping bookings.",
                "category": "Technical",
                "probability": "High",
                "impact": "High",
                "severity": "Critical",
                "mitigation": "Implement distributed locking with Redis Redlock on doctor appointment slots.",
                "status": "Active"
            },
            {
                "title": "Notification Integration Delays",
                "description": "Healthcare-certified SMS aggregator vetting process taking longer than anticipated.",
                "category": "Schedule",
                "probability": "Medium",
                "impact": "Medium",
                "severity": "Moderate",
                "mitigation": "Support fallback transactional email pipeline while SMS aggregator gets accredited.",
                "status": "Active"
            },
            {
                "title": "Electronic Health Record (EHR) Sync Latency",
                "description": "HL7 FHIR interface to hospital legacy mainframe has 3-second query latency.",
                "category": "Technical",
                "probability": "Medium",
                "impact": "High",
                "severity": "Moderate",
                "mitigation": "Implement asynchronous background queues with Celery and local cache snapshots.",
                "status": "Active"
            }
        ],
        "blockers": [
            {
                "title": "Pending Approval of Appointment Triage Workflows",
                "description": "Chief Medical Officer must review and approve nurse triage cancellation criteria.",
                "priority": "High",
                "owner": "Dr. Arthur Vance (Chief Medical Officer)",
                "status": "Active"
            },
            {
                "title": "Incomplete Notification Provider Integration Credentials",
                "description": "Awaiting HIPAA Business Associate Agreement (BAA) signature for Twilio Healthcare SMS.",
                "priority": "High",
                "owner": "Legal & Compliance Team",
                "status": "Active"
            }
        ],
        "actions": [
            {"title": "Complete field-level encryption for patient demographic tables", "owner": "Dev Team", "priority": "High", "due_offset": 4, "status": "In Progress"},
            {"title": "Escalate Twilio BAA signature with healthcare compliance counsel", "owner": "Sarah Lin", "priority": "High", "due_offset": 7, "status": "Pending"},
            {"title": "Finalize nurse triage workflow review meeting with CMO", "owner": "Sarah Lin", "priority": "Medium", "due_offset": 10, "status": "Pending"}
        ],
        "welcome_chat": {
            "question": "What measures are in place to address patient data privacy and scheduling conflicts?",
            "answer": "According to project specifications (Technical_Architecture_Healthcare.pdf and Risk_Log_Healthcare.csv):\n\n1. **Data Privacy**: Field-level encryption on patient demographic tables and immutable audit logs ensure HIPAA compliance.\n2. **Scheduling Conflicts**: Distributed Redis Redlock mechanism prevents overlapping physician bookings across regional medical clinics.",
            "source_doc": "Technical_Architecture_Healthcare.pdf",
            "snippet": "Security and Privacy: Enforce field-level encryption on PHI tables with zero-trust access control..."
        },
        "documents": [
            {
                "name": "Project_Proposal_Healthcare_Platform.pdf",
                "type": "PDF",
                "sections": [
                    ("Executive Summary", "Next-generation outpatient healthcare platform modernizing appointment booking, physician scheduling, and patient onboarding."),
                    ("Clinical Goals", "Reduce clinic wait times by 40%, lower appointment no-shows from 18% to under 5%, and ensure airtight HIPAA compliance."),
                    ("Stakeholder Alignment", "Supported by Clinical Operations, Nursing Staff, Medical Board, and Healthcare IT.")
                ]
            },
            {
                "name": "SRS_Healthcare_Patient_Management.docx",
                "type": "DOCX",
                "sections": [
                    ("Functional Boundaries", "Specifies electronic check-in, physician rosters, multi-clinic appointment booking, and automated patient notifications."),
                    ("Compliance Standards", "HIPAA Security Rule, HITECH Act, and HL7 FHIR interoperability guidelines."),
                    ("Data Retention", "Audit records retained for 7 years in write-once-read-many immutable storage.")
                ]
            },
            {
                "name": "Clinical_Workflows_and_Triage_Specs.docx",
                "type": "DOCX",
                "sections": [
                    ("Appointment Workflows", "Standard outpatient visits, specialist consults, tele-health video encounters, and urgent walk-in triage."),
                    ("Triage Protocol", "Nurse assessment assigns acuity levels 1 to 5. Acuity 1-2 bypass scheduling for immediate physician dispatch."),
                    ("Cancellation Rules", "Patients may reschedule up to 24 hours prior without clinic fee penalty.")
                ]
            },
            {
                "name": "Technical_Architecture_Healthcare.pdf",
                "type": "PDF",
                "sections": [
                    ("Core Architecture", "Modular microservices built with Django REST Framework, Celery task workers, Redis caching, and PostgreSQL."),
                    ("Security and Privacy", "Enforce field-level encryption on PHI tables with zero-trust access control and TLS 1.3 encryption in transit."),
                    ("External Interfaces", "HL7 FHIR API gateway connecting to regional laboratory systems and certified SMS aggregators.")
                ]
            },
            {
                "name": "Project_Timeline_and_Milestones.txt",
                "type": "TXT",
                "sections": [
                    ("Sprint Cadence", "Two-week agile sprints across 6 delivery increments."),
                    ("Target Milestones", "M1: Demographic Onboarding (Done). M2: Doctor Availability (Current). M3: Live Clinic Pilot (Next)."),
                    ("Go-Live Window", "Target general availability across 4 regional clinics in Month 5.")
                ]
            },
            {
                "name": "Clinical_Roles_and_Responsibilities.csv",
                "type": "CSV",
                "headers": ["Role", "Primary Function", "Access Level", "Key Stakeholder"],
                "rows": [
                    ["Triage Nurse", "Patient intake & vital sign verification", "Restricted Clinical", "Nurse Supervisor"],
                    ["Attending Physician", "Consultations, diagnosis & prescriptions", "Full Clinical", "CMO Office"],
                    ["Clinic Receptionist", "Patient check-in, scheduling & insurance", "Administrative", "Front Desk Lead"],
                    ["System Admin", "User provisioning & HIPAA audit logs", "Superuser System", "IT Security Lead"]
                ]
            },
            {
                "name": "Medical_Executive_Meeting_Notes.txt",
                "type": "TXT",
                "sections": [
                    ("Meeting Record", "Date: Last Thursday. Topic: Clinical workflow review with CMO and Head of Nursing."),
                    ("Key Deliberations", "CMO expressed concerns regarding automated triage cancellation criteria. Requested formal review session."),
                    ("Next Steps", "Legal team will expedite Twilio BAA signature to unblock SMS reminder notifications.")
                ]
            },
            {
                "name": "Monthly_Progress_Report_Healthcare.docx",
                "type": "DOCX",
                "sections": [
                    ("Executive Status", "Patient registration module completed and passed penetration testing with zero critical findings."),
                    ("Current Challenges", "Blocked on SMS credentials and CMO triage approval. Doctor roster service is 70% complete."),
                    ("Resource Utilization", "Engineering hours tracking at 94% of budget.")
                ]
            },
            {
                "name": "Healthcare_Testing_and_Validation_Strategy.pdf",
                "type": "PDF",
                "sections": [
                    ("Verification Framework", "Rigorous automated testing covering unit tests, HIPAA privacy boundary checks, and concurrent booking race conditions."),
                    ("Concurrency Test", "50 concurrent requests attempting to book the same physician slot must result in exactly 1 success and 49 conflict alerts."),
                    ("Audit Verification", "Every data access event must produce a cryptographically verifiable audit log entry.")
                ]
            },
            {
                "name": "Risk_Log_Healthcare.csv",
                "type": "CSV",
                "headers": ["Risk ID", "Risk Description", "Category", "Probability", "Impact", "Mitigation Strategy"],
                "rows": [
                    ["HR-01", "Patient-Data Privacy & HIPAA Compliance Audit", "Compliance", "High", "High", "Field-level encryption and strict access logging"],
                    ["HR-02", "Cross-Facility Scheduling Conflicts", "Technical", "High", "High", "Implement Redis Redlock distributed locks"],
                    ["HR-03", "Notification Integration Delays", "Schedule", "Medium", "Medium", "Enable fallback transactional email alerts"],
                    ["HR-04", "HL7 FHIR Interoperability Latency", "Technical", "Medium", "High", "Asynchronous Celery caching layer"]
                ]
            },
            {
                "name": "Change_Request_HL7_FHIR_Update.docx",
                "type": "DOCX",
                "sections": [
                    ("CR-02 Description", "Update FHIR R4 schema to support multi-provider clinical note attachments."),
                    ("Clinical Need", "Allows visiting physicians to append diagnostic notes to existing patient encounters."),
                    ("Approval Status", "Approved by Medical Director and Technical Lead.")
                ]
            },
            {
                "name": "Clinic_Deployment_and_Release_Plan.txt",
                "type": "TXT",
                "sections": [
                    ("Stage 1 - Staging Sandbox", "Synthetic patient data testing with hospital dummy accounts. COMPLETED."),
                    ("Stage 2 - Pilot Clinic", "North Wing Outpatient Clinic live deployment with 12 physicians. Target: Month 4."),
                    ("Stage 3 - Hospital Wide", "Full rollout covering 45 departments and 250 healthcare professionals.")
                ]
            }
        ]
    },
    {
        "name": "Enterprise E-Commerce & Order Management Platform",
        "description": "An e-commerce platform for product discovery, inventory management, checkout, payments, order tracking, and operational reporting.",
        "category": "E-Commerce",
        "status": "In Progress",
        "priority": "High",
        "start_offset_days": -75,
        "target_offset_days": 60,
        "pm_username": "ecommerce_pm",
        "pm_name": "Devon Miller",
        "pm_email": "devon.miller@enterprise-retail.com",
        "deliverables": [
            {"title": "Product Catalog & Elastic Search Discovery", "description": "High-speed faceted product search and category taxonomy.", "status": "Completed", "deadline_offset": -30},
            {"title": "Distributed Inventory & Warehouse Service", "description": "Real-time stock reservation and multi-warehouse sync.", "status": "Completed", "deadline_offset": -10},
            {"title": "High-Throughput Shopping Cart & Checkout", "description": "Zero-friction cart persistence and multi-currency checkout.", "status": "In Progress", "deadline_offset": 20},
            {"title": "Payment Gateway & Webhook Reconciliation", "description": "Multi-provider payment orchestration with automated refund workflows.", "status": "In Progress", "deadline_offset": 35},
            {"title": "Order Fulfillment & Operational Reporting Dashboard", "description": "Warehouse packing manifests, carrier tracking, and revenue analytics.", "status": "Pending", "deadline_offset": 55},
        ],
        "scope_items": [
            {"title": "Faceted Product Catalog & Search", "description": "Instant keyword search, filtering by brand, attributes, and stock availability.", "type": "Functional Requirement"},
            {"title": "Real-time Warehouse Inventory Reservation", "description": "Temporary 15-minute inventory holds during active checkout sessions.", "type": "Functional Requirement"},
            {"title": "PCI-DSS Compliant Payment Tokenization", "description": "Zero plain-text card storage using Stripe and Adyen tokenization vaults.", "type": "Architecture"},
            {"title": "Order Tracking & Carrier Dispatch Webhooks", "description": "Automated status updates from FedEx, UPS, and DHL logistics APIs.", "type": "Functional Requirement"},
            {"title": "Enterprise Sales & Margin Analytics Dashboard", "description": "Hourly sales velocity, regional turnover, and return rate reporting.", "type": "Functional Requirement"},
        ],
        "risks": [
            {
                "title": "Payment Provider Webhook Failure & Reconciliation Mismatch",
                "description": "Dropped webhook events during peak flash sales could cause orders without captured charges.",
                "category": "Technical",
                "probability": "High",
                "impact": "High",
                "severity": "Critical",
                "mitigation": "Implement idempotent webhook listeners with automatic retry queues and daily bank reconciliation.",
                "status": "Active"
            },
            {
                "title": "Multi-Warehouse Inventory Synchronization Lag",
                "description": "Legacy warehouse ERP synchronizes inventory every 30 minutes, leading to overselling risk.",
                "category": "Operational",
                "probability": "High",
                "impact": "High",
                "severity": "Critical",
                "mitigation": "Deploy buffer inventory thresholds and near real-time delta polling.",
                "status": "Active"
            },
            {
                "title": "Degraded Performance Under High Traffic Flash Sales",
                "description": "Database query spikes during promotional events may exceed allowable p99 latency thresholds.",
                "category": "Technical",
                "probability": "Medium",
                "impact": "High",
                "severity": "Moderate",
                "mitigation": "Implement Redis CDN caching for product catalog and auto-scaling Kubernetes worker pods.",
                "status": "Active"
            },
            {
                "title": "Carrier Tracking API Rate Limiting",
                "description": "Global shipping carrier tracking API limits queries to 200 requests/minute.",
                "category": "Technical",
                "probability": "Low",
                "impact": "Medium",
                "severity": "Low",
                "mitigation": "Batch tracking queries and cache shipment statuses for 60 minutes.",
                "status": "Active"
            }
        ],
        "blockers": [
            {
                "title": "Pending Payment Provider Production Credentials",
                "description": "Merchant acquiring bank underwriting review pending compliance validation.",
                "priority": "High",
                "owner": "Finance & Compliance Operations",
                "status": "Active"
            },
            {
                "title": "Delayed Inventory API Integration from ERP Vendor",
                "description": "Awaiting dedicated VPN tunnel setup to connect with enterprise SAP warehouse instances.",
                "priority": "High",
                "owner": "Enterprise Infrastructure Team",
                "status": "Active"
            }
        ],
        "actions": [
            {"title": "Set up payment webhook idempotency test bench", "owner": "Payment Tech Lead", "priority": "High", "due_offset": 3, "status": "In Progress"},
            {"title": "Escalate merchant bank underwriting with CFO", "owner": "Devon Miller", "priority": "High", "due_offset": 6, "status": "Pending"},
            {"title": "Configure SAP ERP VPN tunnel with Network Operations", "owner": "ERP Lead", "priority": "High", "due_offset": 9, "status": "Pending"}
        ],
        "welcome_chat": {
            "question": "How does the platform handle inventory overselling and payment webhook drops?",
            "answer": "As detailed in Technical_Architecture_Ecommerce.pdf and Risk_Register_Ecommerce.csv:\n\n1. **Inventory Overselling**: A 15-minute temporary inventory hold lock with buffer stock thresholds prevents concurrent overselling during checkout.\n2. **Webhook Drops**: Payment listeners use idempotent transaction IDs and secondary scheduled polling against the gateway API to ensure zero orphaned orders.",
            "source_doc": "Technical_Architecture_Ecommerce.pdf",
            "snippet": "Payment Gateway: Multi-provider orchestration with idempotent webhook handlers and dead-letter queue retry logic..."
        },
        "documents": [
            {
                "name": "Project_Proposal_Enterprise_Ecommerce.pdf",
                "type": "PDF",
                "sections": [
                    ("Executive Summary", "Architecting a unified, scalable enterprise commerce and order orchestration platform serving B2C and B2B channels."),
                    ("Business Objectives", "Achieve 99.99% availability during Black Friday events, sustain 20,000 orders/minute, and cut order fulfillment cycle times by 35%."),
                    ("Strategic Investments", "Cloud-native microservices architecture replacing monolithic commerce engine.")
                ]
            },
            {
                "name": "SRS_Ecommerce_and_Order_Management.docx",
                "type": "DOCX",
                "sections": [
                    ("Functional Scope", "Product catalog, multi-currency pricing, shopping cart, payment orchestration, order state machine, and shipping integrations."),
                    ("Performance Standards", "Sub-100ms catalog search response time; sub-500ms checkout authorization under 15,000 peak requests/second."),
                    ("Data Consistency", "Strict ACID guarantees for payment and inventory transactions.")
                ]
            },
            {
                "name": "Checkout_and_Payment_Workflows.docx",
                "type": "DOCX",
                "sections": [
                    ("Checkout Funnel", "Step 1: Identity & Address, Step 2: Shipping Method, Step 3: Payment Tokenization, Step 4: Order Confirmation."),
                    ("Payment Orchestration", "Smart routing between Stripe, Adyen, and PayPal based on transaction currency and fraud scoring."),
                    ("Failure Handling", "Graceful recovery on card decline with alternate payment prompt.")
                ]
            },
            {
                "name": "Technical_Architecture_Ecommerce.pdf",
                "type": "PDF",
                "sections": [
                    ("Architecture Diagram", "Event-driven architecture with Django REST services, Redis cluster, PostgreSQL database, and Apache Kafka message stream."),
                    ("Inventory Reservation", "Distributed locks ensure stock is reserved upon checkout initiation and released if payment is not confirmed within 15 minutes."),
                    ("Payment Webhook Strategy", "Idempotent event consumers with dead-letter queue and automated gateway polling.")
                ]
            },
            {
                "name": "Ecommerce_Delivery_Timeline.txt",
                "type": "TXT",
                "sections": [
                    ("Phase 1 - Product & Catalog", "Catalog ingest, faceted search, category hierarchy. COMPLETED."),
                    ("Phase 2 - Cart & Inventory", "Cart persistence, inventory reservation lock, warehouse delta sync. COMPLETED."),
                    ("Phase 3 - Payments & Checkout", "Gateway integration, webhook reconciliation, order state machine. IN PROGRESS."),
                    ("Phase 4 - Fulfillment & Go-Live", "Carrier logistics, reporting dashboards, load testing. PENDING.")
                ]
            },
            {
                "name": "Operations_RACI_Matrix.csv",
                "type": "CSV",
                "headers": ["Domain", "Responsible", "Accountable", "Consulted", "Informed"],
                "rows": [
                    ["Catalog Search", "Search Engineer", "Devon Miller (PM)", "Merchandising Lead", "Marketing Team"],
                    ["Inventory Sync", "Backend Dev", "ERP Lead", "Warehouse Ops", "Logistics Team"],
                    ["Payment Gateways", "FinTech Lead", "CFO Office", "Compliance Counsel", "Customer Support"],
                    ["Order Fulfillment", "Logistics Lead", "Operations Director", "Carrier Partners", "Warehouse Staff"]
                ]
            },
            {
                "name": "Commercial_Steering_Minutes.txt",
                "type": "TXT",
                "sections": [
                    ("Steering Notes", "Attendees: Devon Miller, VP of Engineering, Head of Finance, Chief Commercial Officer."),
                    ("Key Roadblocks", "Merchant acquiring bank underwriting has taken 3 weeks longer than expected. Finance escalating to executive committee."),
                    ("Action", "Finalize payment webhook automated testing in staging sandbox while awaiting production keys.")
                ]
            },
            {
                "name": "Monthly_Sprint_Report_Ecommerce.docx",
                "type": "DOCX",
                "sections": [
                    ("Executive Summary", "Inventory service completed and passed synchronization stress tests. Checkout flow integration in progress."),
                    ("Risks and Mitigations", "Payment credentials remain blocked; ERP VPN setup ongoing. Delivery team reallocated to fraud prevention engine."),
                    ("Budget Status", "Tracking within 3% of projected sprint budget.")
                ]
            },
            {
                "name": "Ecommerce_Testing_and_Performance_Strategy.pdf",
                "type": "PDF",
                "sections": [
                    ("Testing Plan", "End-to-end checkout automation, payment failure simulation, and distributed chaos testing."),
                    ("Load Testing Goals", "Validate platform throughput at 15,000 concurrent checkout attempts with zero inventory over-allocation."),
                    ("Resilience Criteria", "Zero data loss during simulated database node failover.")
                ]
            },
            {
                "name": "Risk_Register_Ecommerce.csv",
                "type": "CSV",
                "headers": ["Risk ID", "Risk Name", "Category", "Probability", "Impact", "Mitigation Strategy"],
                "rows": [
                    ["ER-01", "Payment Provider Webhook Failure & Reconciliation Mismatch", "Technical", "High", "High", "Idempotent listeners and daily bank reconciliation"],
                    ["ER-02", "Multi-Warehouse Inventory Synchronization Lag", "Operational", "High", "High", "Buffer inventory thresholds and near-realtime delta polling"],
                    ["ER-03", "Degraded Performance Under High Traffic Flash Sales", "Technical", "Medium", "High", "Redis CDN caching and Kubernetes auto-scaling"],
                    ["ER-04", "Carrier Tracking API Rate Limiting", "Technical", "Low", "Medium", "Batch tracking queries and 60-minute status caching"]
                ]
            },
            {
                "name": "Change_Request_Multi_Currency_Settlement.docx",
                "type": "DOCX",
                "sections": [
                    ("CR-03 Purpose", "Incorporate direct EUR and GBP local settlement accounts to reduce foreign exchange fees."),
                    ("Financial Impact", "Saves an estimated 2.4% on international sales margins."),
                    ("Development Effort", "Completed within current payment sprint with zero timeline delay.")
                ]
            },
            {
                "name": "Production_Release_and_Cutover_Plan.txt",
                "type": "TXT",
                "sections": [
                    ("Cutover Window", "Midnight maintenance window prior to planned Q4 shopping season launch."),
                    ("Rollback Plan", "Automated DNS failover back to legacy platform within 90 seconds if error rate exceeds 0.5%."),
                    ("Post-Launch Monitoring", "War room staffed 24/7 by DevOps, FinTech leads, and Operations for 72 hours.")
                ]
            }
        ]
    }
]


class Command(BaseCommand):
    help = "Seed three realistic, high-fidelity demo projects with authentic documents, pipeline ingestion, risks, blockers, and intelligence."

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete only seeded demo projects before re-seeding',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== Seeding ProjectIQ Realistic Demo Projects ==="))

        if options.get('reset'):
            self.stdout.write(self.style.WARNING("Reset requested: cleaning up existing demo projects..."))
            Project.objects.filter(is_demo=True).delete()

        # 1. Ensure Default Admin User
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@projectiq-demo.io',
                'is_staff': True,
                'is_superuser': True,
                'first_name': 'Platform',
                'last_name': 'Administrator'
            }
        )
        if not admin_user.has_usable_password():
            admin_user.set_password('password')
            admin_user.save()

        # 2. Iterate through projects spec
        for p_idx, p_data in enumerate(DEMO_PROJECTS_SPEC, start=1):
            self.stdout.write(self.style.SUCCESS(f"\nProcessing Project {p_idx}: {p_data['name']}"))

            # Create or get Project Manager user
            pm_user, _ = User.objects.get_or_create(
                username=p_data['pm_username'],
                defaults={
                    'email': p_data['pm_email'],
                    'first_name': p_data['pm_name'].split()[0],
                    'last_name': " ".join(p_data['pm_name'].split()[1:]),
                    'is_staff': False
                }
            )
            if not pm_user.has_usable_password():
                pm_user.set_password('demopassword')
                pm_user.save()

            # Create or update project
            start_date = date.today() + timedelta(days=p_data['start_offset_days'])
            target_date = date.today() + timedelta(days=p_data['target_offset_days'])

            project, p_created = Project.objects.get_or_create(
                name=p_data['name'],
                defaults={
                    'description': p_data['description'],
                    'category': p_data['category'],
                    'status': p_data['status'],
                    'priority': p_data['priority'],
                    'start_date': start_date,
                    'target_date': target_date,
                    'owner': pm_user,
                    'is_demo': True
                }
            )

            if not p_created:
                # Update attributes to ensure consistency
                project.description = p_data['description']
                project.category = p_data['category']
                project.status = p_data['status']
                project.priority = p_data['priority']
                project.start_date = start_date
                project.target_date = target_date
                project.owner = pm_user
                project.is_demo = True
                project.save()
                self.stdout.write(f"  - Reusing existing project record (ID: {project.id})")
            else:
                self.stdout.write(f"  - Created new project record (ID: {project.id})")

            # Project Memberships
            ProjectMember.objects.get_or_create(
                project=project,
                user=pm_user,
                defaults={'role': 'Project Manager'}
            )
            ProjectMember.objects.get_or_create(
                project=project,
                user=admin_user,
                defaults={'role': 'Platform Administrator'}
            )

            # Seed Scope Items
            for s in p_data.get('scope_items', []):
                ScopeItem.objects.get_or_create(
                    project=project,
                    title=s['title'],
                    defaults={
                        'description': s['description'],
                        'type': s['type'],
                        'source_document': 'System Specification'
                    }
                )

            # Seed Deliverables
            for d in p_data.get('deliverables', []):
                d_date = date.today() + timedelta(days=d['deadline_offset'])
                Deliverable.objects.get_or_create(
                    project=project,
                    title=d['title'],
                    defaults={
                        'description': d['description'],
                        'status': d['status'],
                        'deadline': d_date,
                        'source_document': 'Project Plan'
                    }
                )

            # Seed Risks
            for r in p_data.get('risks', []):
                Risk.objects.get_or_create(
                    project=project,
                    title=r['title'],
                    defaults={
                        'description': r['description'],
                        'category': r['category'],
                        'probability': r['probability'],
                        'impact': r['impact'],
                        'severity': r['severity'],
                        'mitigation': r['mitigation'],
                        'status': r['status'],
                        'source_document': 'Risk Assessment Matrix'
                    }
                )

            # Seed Blockers
            for b in p_data.get('blockers', []):
                Blocker.objects.get_or_create(
                    project=project,
                    title=b['title'],
                    defaults={
                        'description': b['description'],
                        'priority': b['priority'],
                        'owner': b['owner'],
                        'status': b['status'],
                        'source_document': 'Blocker Log'
                    }
                )

            # Seed Action Items
            for a in p_data.get('actions', []):
                a_date = date.today() + timedelta(days=a['due_offset'])
                ActionItem.objects.get_or_create(
                    project=project,
                    title=a['title'],
                    defaults={
                        'description': a['title'],
                        'owner': a['owner'],
                        'priority': a['priority'],
                        'status': a['status'],
                        'due_date': a_date,
                        'source_document': 'Action Items Log'
                    }
                )

            # Seed Documents & Process through real pipeline
            docs_spec = p_data.get('documents', [])
            self.stdout.write(f"  - Ingesting {len(docs_spec)} genuine project documents...")

            for doc_spec in docs_spec:
                doc_name = doc_spec['name']
                file_type = doc_spec['type'].upper()

                # Check if document already exists
                existing_doc = Document.objects.filter(project=project, name=doc_name).first()
                if existing_doc and existing_doc.status == 'Processed' and existing_doc.chunks.exists():
                    self.stdout.write(f"    * [Reused] {doc_name} (Processed)")
                    continue

                # Generate authentic file content
                if file_type == 'PDF':
                    file_bytes = generate_valid_pdf_bytes(doc_name, doc_spec.get('sections', []))
                elif file_type == 'DOCX':
                    file_bytes = generate_docx_bytes(doc_name, doc_spec.get('sections', []))
                elif file_type == 'CSV':
                    file_bytes = generate_csv_bytes(doc_spec.get('headers', []), doc_spec.get('rows', []))
                else:
                    file_bytes = generate_txt_bytes(doc_name, doc_spec.get('sections', []))

                doc_record = existing_doc or Document(project=project, name=doc_name)
                doc_record.file_type = file_type
                doc_record.file_size = len(file_bytes)
                doc_record.status = 'Uploaded'

                # Save file to media storage
                file_content = ContentFile(file_bytes, name=doc_name)
                doc_record.file_path.save(f"demo_{project.id}_{doc_name}", file_content, save=True)

                # Execute pipeline: extract, chunk, store vector chunks, run agents
                success = process_document(doc_record.id)
                if success:
                    doc_record.refresh_from_db()
                    self.stdout.write(f"    * [Indexed] {doc_name} -> {doc_record.chunks.count()} chunks")
                else:
                    self.stdout.write(self.style.WARNING(f"    * [Failed] {doc_name}: {doc_record.processing_error}"))

            # Calculate deterministic project health score
            health_record = calculate_health_score(project.id)
            if health_record:
                self.stdout.write(f"  - Health Score calculated: {health_record.overall_score}/100")

            # Seed Welcome Chat Message grounded in project documents
            welcome_chat = p_data.get('welcome_chat')
            if welcome_chat:
                ChatMessage.objects.get_or_create(
                    project=project,
                    question=welcome_chat['question'],
                    defaults={
                        'user_id': pm_user.id,
                        'answer': welcome_chat['answer'],
                        'sources': [{
                            "document_name": welcome_chat['source_doc'],
                            "chunk_id": f"chunk_sample_{project.id}",
                            "snippet": welcome_chat['snippet']
                        }]
                    }
                )

        self.stdout.write(self.style.MIGRATE_HEADING("\n=== All Three Demo Projects Successfully Seeded! ==="))

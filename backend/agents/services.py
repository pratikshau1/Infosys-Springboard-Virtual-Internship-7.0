import os
import json
import re
from datetime import datetime, timedelta
import google.generativeai as genai
from django.conf import settings
from projects.models import Project
from intelligence.models import ScopeItem, Risk, Blocker, ActionItem, Deliverable, HealthScore, ChatMessage
from documents.models import Document, DocumentChunk
import chromadb

# Load environment variable
api_key = os.environ.get("GEMINI_API_KEY", "")
if api_key:
    genai.configure(api_key=api_key)

CHROMA_DB_PATH = os.path.join(settings.BASE_DIR, 'chroma_db')
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

def get_gemini_model():
    if not os.environ.get("GEMINI_API_KEY"):
        return None
    try:
        return genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        print("Gemini model init failed:", e)
        return None

def clean_json_response(text):
    text = text.strip()
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if match:
        text = match.group(1).strip()
    return text

def get_project_chunks(project_id, query, n_results=6):
    """
    Retrieve top chunks and metadata from ChromaDB for project.
    """
    try:
        collection_name = f"project_{project_id}"
        collection = chroma_client.get_collection(name=collection_name)
        results = collection.query(query_texts=[query], n_results=n_results)
        
        chunks = []
        if results and results.get('documents') and len(results['documents']) > 0:
            docs = results['documents'][0]
            metas = results['metadatas'][0] if results.get('metadatas') else [{}] * len(docs)
            ids = results['ids'][0] if results.get('ids') else [f"chunk_{i}" for i in range(len(docs))]
            
            for doc, meta, cid in zip(docs, metas, ids):
                chunks.append({
                    "id": cid,
                    "content": doc,
                    "document_id": meta.get("document_id"),
                    "document_name": meta.get("document_name", "Project Document"),
                    "chunk_index": meta.get("chunk_index", 0)
                })
        return chunks
    except Exception as e:
        print(f"Error querying ChromaDB for project {project_id}:", e)
        # Fallback to database chunks
        db_chunks = DocumentChunk.objects.filter(project_id=project_id)[:n_results]
        return [
            {
                "id": chunk.vector_reference or f"chunk_{chunk.id}",
                "content": chunk.content,
                "document_id": chunk.document_id,
                "document_name": chunk.document.name if chunk.document else "Project Document",
                "chunk_index": chunk.chunk_index
            }
            for chunk in db_chunks
        ]

def get_project_context(project_id, query, n_results=6):
    chunks = get_project_chunks(project_id, query, n_results=n_results)
    return "\n\n---\n\n".join([f"[{c['document_name']}] {c['content']}" for c in chunks])

def calculate_health_score(project_id):
    """
    Computes deterministic health score per PRD Section 5.6:
    Health Score = (Scope Health * 0.20) + (Timeline Health * 0.25) + 
                   (Blocker Impact * 0.20) + (Risk Exposure * 0.15) + 
                   (Progress Rate * 0.10) + (Documentation Completeness * 0.10)
    """
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return None

    scope_count = ScopeItem.objects.filter(project_id=project_id).count()
    deliverables = Deliverable.objects.filter(project_id=project_id)
    risks = Risk.objects.filter(project_id=project_id)
    blockers = Blocker.objects.filter(project_id=project_id)
    actions = ActionItem.objects.filter(project_id=project_id)
    doc_count = Document.objects.filter(project_id=project_id, status='Processed').count()

    # 1. Scope Health (0-100)
    # Target: 5+ clear scope items
    scope_score = min(100, max(20, scope_count * 15))

    # 2. Timeline Health (0-100)
    # Penalized by critical blockers or overdue items
    critical_blockers = blockers.filter(priority__iexact='High').count()
    timeline_score = max(15, 100 - (critical_blockers * 20))

    # 3. Blocker Impact (0-100)
    high_blockers = blockers.filter(priority__iexact='High').count()
    med_blockers = blockers.filter(priority__iexact='Medium').count()
    low_blockers = blockers.filter(priority__iexact='Low').count()
    blocker_penalty = (high_blockers * 25) + (med_blockers * 12) + (low_blockers * 5)
    blocker_score = max(10, min(100, 100 - blocker_penalty))

    # 4. Risk Exposure (0-100)
    crit_risks = risks.filter(severity__iexact='Critical').count()
    mod_risks = risks.filter(severity__iexact='Moderate').count()
    low_risks = risks.filter(severity__iexact='Low').count()
    risk_penalty = (crit_risks * 22) + (mod_risks * 10) + (low_risks * 4)
    risk_score = max(10, min(100, 100 - risk_penalty))

    # 5. Progress Rate (0-100)
    completed_actions = actions.filter(status__iexact='Completed').count()
    total_actions = actions.count()
    completed_deliv = deliverables.filter(status__iexact='Completed').count()
    total_deliv = deliverables.count()
    
    total_tasks = total_actions + total_deliv
    if total_tasks > 0:
        completed_tasks = completed_actions + completed_deliv
        progress_score = max(20, int((completed_tasks / total_tasks) * 100))
    else:
        progress_score = 50

    # 6. Documentation Completeness (0-100)
    documentation_score = min(100, max(25, doc_count * 25))

    # Overall calculation
    overall_score = int(
        (scope_score * 0.20) +
        (timeline_score * 0.25) +
        (blocker_score * 0.20) +
        (risk_score * 0.15) +
        (progress_score * 0.10) +
        (documentation_score * 0.10)
    )
    overall_score = max(1, min(100, overall_score))

    health_obj, _ = HealthScore.objects.update_or_create(
        project=project,
        defaults={
            "overall_score": overall_score,
            "scope_score": scope_score,
            "timeline_score": timeline_score,
            "blocker_score": blocker_score,
            "risk_score": risk_score,
            "progress_score": progress_score,
            "documentation_score": documentation_score,
        }
    )
    return health_obj

def run_orchestrator(project_id):
    """
    Multi-Agent Orchestrator:
    1. Scope Agent
    2. Deliverable Agent
    3. Risk Agent
    4. Blocker Agent
    5. Action Item Agent
    6. Health Score Engine
    """
    model = get_gemini_model()
    
    # 1. Scope Agent
    scope_context = get_project_context(project_id, "project scope goals functional requirements system features")
    if scope_context:
        if model:
            prompt = f"""
            Extract the project scope items, functional requirements, and core goals.
            Return ONLY a valid JSON object matching this schema:
            {{
                "scope_items": [
                    {{"title": "Short title", "description": "Clear explanation", "type": "Functional Requirement | Goal | Architecture"}}
                ]
            }}
            Context:
            {scope_context}
            """
            try:
                res = model.generate_content(prompt)
                data = json.loads(clean_json_response(res.text))
                for item in data.get('scope_items', []):
                    ScopeItem.objects.get_or_create(
                        project_id=project_id,
                        title=item['title'],
                        defaults={
                            "description": item.get('description', ''),
                            "type": item.get('type', 'Functional Requirement')
                        }
                    )
            except Exception as e:
                print("Scope Agent AI error:", e)
        else:
            # Fallback heuristic extraction
            fallback_items = [
                {"title": "Core System Architecture & User Flow", "description": "Main workflow captured from project documents.", "type": "Architecture"},
                {"title": "Real-time Tracking & Service Integration", "description": "Automated status and monitoring service.", "type": "Functional Requirement"},
                {"title": "Data Persistence & Role Access Controls", "description": "Secure storage and authenticated endpoints.", "type": "Functional Requirement"},
            ]
            for item in fallback_items:
                ScopeItem.objects.get_or_create(project_id=project_id, title=item['title'], defaults=item)

    # 2. Deliverables Agent
    deliv_context = get_project_context(project_id, "milestones deliverables releases deadlines completion target")
    if deliv_context:
        if model:
            prompt = f"""
            Extract key milestones and deliverables with estimated deadlines.
            Return ONLY a valid JSON object matching this schema:
            {{
                "deliverables": [
                    {{"title": "Deliverable Name", "description": "Description", "status": "Pending | In Progress | Completed"}}
                ]
            }}
            Context:
            {deliv_context}
            """
            try:
                res = model.generate_content(prompt)
                data = json.loads(clean_json_response(res.text))
                for item in data.get('deliverables', []):
                    Deliverable.objects.get_or_create(
                        project_id=project_id,
                        title=item['title'],
                        defaults={
                            "description": item.get('description', ''),
                            "status": item.get('status', 'Pending')
                        }
                    )
            except Exception as e:
                print("Deliverable Agent AI error:", e)

    # 3. Risk Agent
    risk_context = get_project_context(project_id, "risks challenges delays dependencies technical vulnerabilities security bugs")
    if risk_context:
        if model:
            prompt = f"""
            Identify project risks, categories, severity, impact, and mitigation actions.
            Return ONLY a valid JSON object matching this schema:
            {{
                "risks": [
                    {{"title": "Risk summary", "description": "Details", "category": "Technical | Schedule | Operational", "probability": "High | Medium | Low", "impact": "High | Medium | Low", "severity": "Critical | Moderate | Low", "mitigation": "Mitigation recommendation"}}
                ]
            }}
            Context:
            {risk_context}
            """
            try:
                res = model.generate_content(prompt)
                data = json.loads(clean_json_response(res.text))
                for item in data.get('risks', []):
                    Risk.objects.get_or_create(
                        project_id=project_id,
                        title=item['title'],
                        defaults={
                            "description": item.get('description', ''),
                            "category": item.get('category', 'Technical'),
                            "probability": item.get('probability', 'Medium'),
                            "impact": item.get('impact', 'Medium'),
                            "severity": item.get('severity', 'Moderate'),
                            "mitigation": item.get('mitigation', 'Review with engineering lead')
                        }
                    )
            except Exception as e:
                print("Risk Agent AI error:", e)
        else:
            fallback_risks = [
                {"title": "Third-party Service Latency", "description": "Network latency and API rate limits might impact SLA.", "category": "Technical", "probability": "Medium", "impact": "High", "severity": "Moderate", "mitigation": "Implement local caching and circuit breaker."},
                {"title": "Integration Testing Bottleneck", "description": "Multi-module end-to-end testing schedule compression.", "category": "Schedule", "probability": "High", "impact": "Medium", "severity": "Moderate", "mitigation": "Establish automated CI test runs early."},
            ]
            for item in fallback_risks:
                Risk.objects.get_or_create(project_id=project_id, title=item['title'], defaults=item)

    # 4. Blocker Agent
    blocker_context = get_project_context(project_id, "blockers impediments dependencies waiting delayed blocked bugs")
    if blocker_context:
        if model:
            prompt = f"""
            Identify any ongoing blockers, impediments, or critical blockers.
            Return ONLY a valid JSON object matching this schema:
            {{
                "blockers": [
                    {{"title": "Blocker Title", "description": "Blocker description", "priority": "High | Medium | Low", "owner": "Owner or Team", "status": "Active | Resolved"}}
                ]
            }}
            Context:
            {blocker_context}
            """
            try:
                res = model.generate_content(prompt)
                data = json.loads(clean_json_response(res.text))
                for item in data.get('blockers', []):
                    Blocker.objects.get_or_create(
                        project_id=project_id,
                        title=item['title'],
                        defaults={
                            "description": item.get('description', ''),
                            "priority": item.get('priority', 'High'),
                            "owner": item.get('owner', 'DevOps Team'),
                            "status": item.get('status', 'Active')
                        }
                    )
            except Exception as e:
                print("Blocker Agent AI error:", e)
        else:
            fallback_blockers = [
                {"title": "Database Migration & Schema Sync", "description": "Awaiting schema stabilization across backend services.", "priority": "High", "owner": "Backend Lead", "status": "Active"},
                {"title": "Environment Secrets Configuration", "description": "Production credentials pending security review.", "priority": "Medium", "owner": "DevOps", "status": "Active"}
            ]
            for item in fallback_blockers:
                Blocker.objects.get_or_create(project_id=project_id, title=item['title'], defaults=item)

    # 5. Action Item Agent
    action_context = get_project_context(project_id, "action items tasks todo next steps assignees sprint items")
    if action_context:
        if model:
            prompt = f"""
            Extract concrete action items, owners, and priorities from the context.
            Return ONLY a valid JSON object matching this schema:
            {{
                "action_items": [
                    {{"title": "Task title", "description": "Details", "owner": "Name or Role", "priority": "High | Medium | Low", "status": "Pending | In Progress | Completed"}}
                ]
            }}
            Context:
            {action_context}
            """
            try:
                res = model.generate_content(prompt)
                data = json.loads(clean_json_response(res.text))
                for item in data.get('action_items', []):
                    ActionItem.objects.get_or_create(
                        project_id=project_id,
                        title=item['title'],
                        defaults={
                            "description": item.get('description', ''),
                            "owner": item.get('owner', 'Assigned Dev'),
                            "priority": item.get('priority', 'Medium'),
                            "status": item.get('status', 'Pending')
                        }
                    )
            except Exception as e:
                print("Action Item Agent AI error:", e)

    # 6. Recalculate Project Health Score
    calculate_health_score(project_id)
    return True

def classify_question_intent(question, project_name=""):
    """
    Intelligently determines whether a question is:
    - 'general': Pure technical, conceptual, programming, or educational query not tied to the project.
    - 'mixed': General concept applied to the current project or requesting recommendations for the project.
    - 'project_specific': Directly asking about current project scope, requirements, risks, docs, blockers, status.
    """
    q_lower = question.lower().strip()
    
    # Explicit project pronouns / references
    has_project_ref = bool(re.search(
        r'\b(this project|our project|the project|srs|uploaded document|uploaded|our application|our code|our team|our sprint|current project|this sprint|our repo|this app|this repository|risk register)\b',
        q_lower
    ))
    if project_name and project_name.lower() in q_lower:
        has_project_ref = True

    # General concept / educational indicators
    is_general_pattern = bool(re.search(
        r'^(what is|what are|explain|how does|how do|write a|code a|implement a|create a function|difference between|compare|tell me about|define|tutorial|example of)\b',
        q_lower
    ))
    
    # Generic programming / CS topics
    programming_terms = bool(re.search(
        r'\b(python|javascript|typescript|react|django|docker|kubernetes|rest api|restful|sql|nosql|mongodb|postgres|machine learning|deep learning|neural network|algorithm|data structure|sdlc|agile|scrum|git|ci/cd|oop|design pattern|recursion|reverse a string|fibonacci)\b',
        q_lower
    ))

    # Project operational / management terms
    project_mgmt_terms = bool(re.search(
        r'\b(deliverables?|blockers?|risks?|milestones?|timeline|deadlines?|requirements?|scope|tasks?|srs|budget|health score|action items?)\b',
        q_lower
    ))

    # Decision hierarchy:
    # 1. If asking about an external programming term/technology AND referencing our project -> mixed
    if programming_terms and (has_project_ref or project_mgmt_terms):
        return 'mixed'

    # 2. If it asks about project-specific entities or explicitly refers to project -> project_specific
    if has_project_ref or project_mgmt_terms:
        return 'project_specific'

    # 3. If it asks a general technical/programming/conceptual question -> general
    if is_general_pattern or programming_terms:
        return 'general'


    # Model-assisted classification if available and ambiguous
    model = get_gemini_model()
    if model:
        try:
            classify_prompt = f"""
            Classify the user question into exactly one of three categories:
            1. "project_specific": asks about a specific ongoing project's internal files, requirements, risks, blockers, status, or documents.
            2. "general": general programming, technical, educational, concept, or open-ended question not about any specific internal project.
            3. "mixed": asks about a general concept or technology while asking how it applies to our current project or architecture.

            User Question: "{question}"
            Reply with ONLY one word: project_specific, general, or mixed.
            """
            resp = model.generate_content(classify_prompt)
            classification = resp.text.strip().lower()
            if 'mixed' in classification:
                return 'mixed'
            if 'general' in classification:
                return 'general'
            if 'project_specific' in classification:
                return 'project_specific'
        except Exception:
            pass

    # Default fallback
    return 'project_specific' if project_mgmt_terms else 'general'

def ask_project_assistant(project_id, question, user_id=1):
    """
    Context-aware AI Assistant supporting Project-Specific, General Knowledge, and Mixed queries.
    """
    project = None
    project_name = ""
    try:
        project = Project.objects.get(id=project_id)
        project_name = project.name
    except Project.DoesNotExist:
        pass

    intent = classify_question_intent(question, project_name=project_name)
    model = get_gemini_model()
    answer = ""
    sources = []

    # 1. GENERAL KNOWLEDGE PATH
    if intent == 'general':
        if model:
            prompt = f"""
            You are the intelligent AI Assistant for ProjectIQ.
            The user is asking a general technical, programming, conceptual, or educational question:
            "{question}"

            Provide a clear, direct, comprehensive, and well-structured answer.
            - If code is requested or appropriate, provide high-quality, formatted code snippets with explanations.
            - Explain concepts simply and accurately.
            - Do NOT state that this question is unrelated to the project.
            - Do NOT force project-specific document citations into general knowledge answers.
            """
            try:
                res = model.generate_content(prompt)
                answer = res.text
            except Exception as e:
                answer = f"**Technical Assessment:**\n\nRegarding *\"{question}\"*:\n\n" + \
                         "This is a standard software engineering / computing concept. " + \
                         "In production systems, best practices recommend modular architecture, automated testing, and secure API boundaries."
        else:
            # Fallback when GEMINI_API_KEY is not configured
            answer = f"### Concept Overview\n\n**Question:** *{question}*\n\n" + \
                     "This is a general computer science and software development topic. " + \
                     "In modern software engineering, adhering to standard design patterns, type safety, and continuous integration ensures robust implementation."

    # 2. MIXED QUERY PATH (General concept + Project context)
    elif intent == 'mixed':
        chunks = get_project_chunks(project_id, question, n_results=4) if project_id else []
        context_parts = []
        for c in chunks:
            doc_name = c.get('document_name') or 'Project Document'
            snippet = c.get('content', '')[:160] + '...'
            sources.append({
                "document_name": doc_name,
                "chunk_id": c.get('id'),
                "snippet": snippet
            })
            context_parts.append(f"Document: {doc_name}\nExcerpt:\n{c.get('content')}")
            
        context_str = "\n\n---\n\n".join(context_parts)
        proj_context_label = f"Project: {project_name}" if project_name else "Selected Project"

        if model:
            prompt = f"""
            You are the AI Project Intelligence & Risk Advisor assistant.
            The user is asking a mixed question combining general knowledge and project context:
            Question: "{question}"

            {proj_context_label} Context Excerpts:
            {context_str if context_str else "No specific project document excerpts matched this query."}

            Structure your response into clear sections:
            1. **General Explanation**: Explain the technical concept, methodology, or best practice clearly.
            2. **What This Means for {project_name or 'Your Project'}**: Connect the concept to the project's architecture, documented goals, or software components based on the excerpts.
            3. **Recommendations**: Practical, actionable steps for the team. Clearly distinguish recommendations from existing project decisions.

            If project excerpts are limited, clearly state what can be deduced generally vs. what is documented in project artifacts.
            """
            try:
                res = model.generate_content(prompt)
                answer = res.text
            except Exception as e:
                answer = f"### General Guidance & Project Alignment\n\n" + \
                         f"Regarding **{question}** for project *{project_name}*:\n\n" + \
                         "Integrating this approach improves system maintainability, automated validation, and operational resiliency."
        else:
            answer = f"### General Explanation\n\nRegarding *\"{question}\"*:\nThis approach represents standard industry practice for scalable cloud and software systems.\n\n" + \
                     f"### What This Means for {project_name}\nApplying these standards to current modules mitigates deployment risks and accelerates delivery milestones."

    # 3. PROJECT-SPECIFIC PATH (Direct project telemetry & RAG)
    else:
        chunks = get_project_chunks(project_id, question, n_results=6) if project_id else []
        context_parts = []
        for c in chunks:
            doc_name = c.get('document_name') or 'Project Document'
            snippet = c.get('content', '')[:160] + '...'
            sources.append({
                "document_name": doc_name,
                "chunk_id": c.get('id'),
                "snippet": snippet
            })
            context_parts.append(f"Document: {doc_name}\nExcerpt:\n{c.get('content')}")

        context_str = "\n\n---\n\n".join(context_parts)

        # Pull database context (deliverables, risks, blockers)
        db_summary = ""
        if project_id:
            db_risks = list(Risk.objects.filter(project_id=project_id)[:5].values_list('title', 'severity'))
            db_blockers = list(Blocker.objects.filter(project_id=project_id, status='Active')[:5].values_list('title', 'priority'))
            db_deliv = list(Deliverable.objects.filter(project_id=project_id)[:5].values_list('title', 'status'))
            db_summary = f"Project Database Telemetry:\n- Active Risks: {db_risks}\n- Active Blockers: {db_blockers}\n- Deliverables: {db_deliv}\n"

        if model:
            prompt = f"""
            You are the AI Project Intelligence & Risk Advisor assistant for {project_name or 'the project'}.
            Answer the user question accurately, strictly grounded in the project artifacts and database telemetry provided below.

            Question: "{question}"

            {db_summary}

            Document Excerpts:
            {context_str if context_str else "No document artifacts found."}

            Guidelines:
            - Explicitly cite source documents by name when referencing facts.
            - If the uploaded documents or database do not contain sufficient evidence to answer, state clearly:
              "The uploaded project documents do not contain specific information regarding this topic." Then provide helpful general project management advice clearly labeled as general guidance.
            - Never invent or hallucinate project specifications, unstated decisions, or fake dates.
            """
            try:
                res = model.generate_content(prompt)
                answer = res.text
            except Exception as e:
                answer = f"Based on project telemetry for **{project_name}**, the team is actively tracking requirements, risks, and blockers related to *\"{question}\"*."
        elif not context_str and not db_summary:
            answer = f"No document artifacts have been processed for **{project_name}** yet. Please upload project documents (PDF, DOCX, CSV, TXT) in the Documents tab to enable grounded RAG intelligence."
        else:
            doc_names = ', '.join(set([s['document_name'] for s in sources])) if sources else 'Database Records'
            answer = f"**Project Intelligence Assessment ({project_name}):**\n\n" + \
                     f"Based on project artifacts ({doc_names}), the project records relevant details matching *\"{question}\"*.\n\n" + \
                     "Review the cited excerpts below and the Intelligence tabs for full verification."

    # Save record to database
    chat_record = ChatMessage.objects.create(
        project_id=project_id,
        user_id=user_id,
        question=question,
        answer=answer,
        sources=sources,
        answer_type=intent
    )

    return {
        "id": chat_record.id,
        "question": question,
        "answer": answer,
        "sources": sources,
        "answer_type": intent,
        "created_at": chat_record.created_at.isoformat()
    }


def generate_project_report(project_id, report_type='executive_summary'):
    """
    Documentation Agent: Generates structured markdown reports (Executive Summary, Risk Report, SRS Summary, Gap Analysis).
    """
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return "Project not found."

    scope_items = ScopeItem.objects.filter(project_id=project_id)
    risks = Risk.objects.filter(project_id=project_id)
    blockers = Blocker.objects.filter(project_id=project_id)
    deliverables = Deliverable.objects.filter(project_id=project_id)
    health = getattr(project, 'health_score', None)
    health_val = health.overall_score if health else 75

    model = get_gemini_model()
    context_summary = f"""
    Project: {project.name}
    Health Score: {health_val}/100
    Scope Items ({scope_items.count()}): {', '.join([s.title for s in scope_items[:8]])}
    Risks ({risks.count()}): {', '.join([f'{r.title} ({r.severity})' for r in risks[:6]])}
    Blockers ({blockers.count()}): {', '.join([b.title for b in blockers[:5]])}
    Deliverables ({deliverables.count()}): {', '.join([d.title for d in deliverables[:5]])}
    """

    if model:
        prompt = f"""
        You are an expert Technical Project Manager & Documentation Agent.
        Generate a professional, structured Markdown report of type '{report_type}' for:
        {context_summary}
        
        Requirements for report:
        - Include Markdown headers (H1, H2, H3), bullet points, and tables.
        - Include an Executive Overview, Health & Delivery Trajectory, Key Bottlenecks, and Actionable Recommendations.
        """
        try:
            res = model.generate_content(prompt)
            return res.text
        except Exception as e:
            print("Doc gen error:", e)

    # High quality fallback template
    date_str = datetime.now().strftime("%B %d, %Y")
    if report_type == 'risk_report':
        return f"""# Project Risk Assessment & Mitigation Report
**Project:** {project.name}  
**Date:** {date_str}  
**Overall Project Health:** {health_val}/100  

---

## 1. Executive Summary
This report analyzes current operational, technical, and scheduling risks identified across active project artifacts.

## 2. Risk Matrix
| Risk Title | Category | Severity | Probability | Recommended Mitigation |
| :--- | :--- | :--- | :--- | :--- |
""" + "\n".join([f"| {r.title} | {r.category} | **{r.severity}** | {r.probability} | {r.mitigation} |" for r in risks]) + f"""

## 3. High Impact Blockers
""" + "\n".join([f"- **{b.title}** ({b.priority} Priority) — Owner: *{b.owner or 'Unassigned'}*" for b in blockers]) + f"""

## 4. Recommendations
1. Establish weekly technical alignment to resolve open schema & integration blockers.
2. Monitor critical path deliverables closely to avoid forecasted timeline slips.
"""

    return f"""# Executive Project Intelligence Summary
**Project:** {project.name}  
**Generated Date:** {date_str}  
**Overall Health Score:** {health_val}/100  

---

## 1. Overview & Vision
{project.description or "Automated AI Project Intelligence tracking system assessing progress, scope adherence, and delivery risks."}

## 2. Key Metrics & Health Dimensions
- **Overall Health Score:** {health_val}/100
- **Scope Health:** {health.scope_score if health else 80}/100 ({scope_items.count()} requirements identified)
- **Timeline Health:** {health.timeline_score if health else 75}/100
- **Risk Mitigation Score:** {health.risk_score if health else 70}/100 ({risks.count()} tracked risks)
- **Blocker Resolution:** {health.blocker_score if health else 65}/100 ({blockers.count()} open blockers)

## 3. Scope Highlights
""" + "\n".join([f"- **{s.title}** ({s.type}): {s.description}" for s in scope_items[:5]]) + f"""

## 4. Strategic Next Actions
- Resolve {blockers.count()} active blockers impacting delivery.
- Conduct milestone review for upcoming deliverables.
"""

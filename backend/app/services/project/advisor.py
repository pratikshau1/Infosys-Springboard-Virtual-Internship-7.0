import re
import os
import pandas as pd
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.core.config import settings

def extract_project_risks(project_id: str, db: Session) -> Dict[str, Any]:
    chunks = db.query(DocumentChunk, Document.name)\
        .join(Document, DocumentChunk.document_id == Document.id)\
        .filter(DocumentChunk.project_id == project_id)\
        .all()
    
    risks = []
    risk_keywords = ["risk", "delay", "threat", "bottleneck", "limit", "concern", "blocker", "failure", "vulnerability", "issue", "exceed"]
    high_keywords = ["critical", "severe", "blocker", "fatal", "fail", "major", "high", "exceed"]
    
    seen_summaries = set()

    for chunk, doc_name in chunks:
        # Split text into sentences and lines
        sentences = re.split(r'[\r\n]+|(?<=[.!?])\s+', chunk.text)
        for s in sentences:
            clean_s = s.strip()
            if len(clean_s) < 10 or len(clean_s) > 400:
                continue
            lower_s = clean_s.lower()
            if any(kw in lower_s for kw in risk_keywords):
                # Avoid near-duplicates
                short_key = clean_s[:40]
                if short_key in seen_summaries:
                    continue
                seen_summaries.add(short_key)

                # Determine severity
                severity = "Medium"
                if any(hw in lower_s for hw in high_keywords):
                    severity = "High"
                elif "minor" in lower_s or "potential" in lower_s or "slight" in lower_s:
                    severity = "Low"

                # Category inference
                category = "Operational"
                if any(w in lower_s for w in ["api", "tech", "data", "database", "server", "system", "code"]):
                    category = "Technical"
                elif any(w in lower_s for w in ["budget", "cost", "financial", "fund"]):
                    category = "Financial"
                elif any(w in lower_s for w in ["deadline", "schedule", "timeline", "delay", "date"]):
                    category = "Schedule"

                risks.append({
                    "id": f"risk-{len(risks) + 1}",
                    "title": clean_s.lstrip("-* \t"),
                    "category": category,
                    "severity": severity,
                    "source_document": doc_name,
                    "page_number": chunk.page_number
                })

    # Overall project risk score
    high_count = sum(1 for r in risks if r["severity"] == "High")
    med_count = sum(1 for r in risks if r["severity"] == "Medium")
    if high_count >= 2 or (high_count >= 1 and med_count >= 2):
        overall_level = "High"
    elif high_count == 1 or med_count >= 2:
        overall_level = "Medium"
    elif len(risks) > 0:
        overall_level = "Low"
    else:
        overall_level = "Minimal"

    return {
        "overall_risk_level": overall_level,
        "total_risks_identified": len(risks),
        "risks": risks[:15]
    }

def extract_project_tasks(project_id: str, db: Session) -> Dict[str, Any]:
    # Look for CSV documents
    docs = db.query(Document).filter(
        Document.project_id == project_id,
        Document.file_type == "CSV"
    ).all()

    tasks: List[Dict[str, Any]] = []
    
    for doc in docs:
        if os.path.exists(doc.storage_path):
            try:
                df = pd.read_csv(doc.storage_path)
                col_map = {c.lower().strip(): c for c in df.columns}
                
                # Check for task-like columns
                task_col = col_map.get("task") or col_map.get("title") or col_map.get("name") or col_map.get("description")
                id_col = col_map.get("task id") or col_map.get("id")
                owner_col = col_map.get("owner") or col_map.get("assignee")
                status_col = col_map.get("status") or col_map.get("state")
                due_col = col_map.get("due date") or col_map.get("due") or col_map.get("deadline")

                if task_col:
                    for i, row in df.iterrows():
                        task_name = str(row[task_col]) if pd.notna(row[task_col]) else f"Task {i+1}"
                        task_id = str(row[id_col]) if id_col and pd.notna(row[id_col]) else f"T{i+1:03d}"
                        owner = str(row[owner_col]) if owner_col and pd.notna(row[owner_col]) else "Unassigned"
                        status = str(row[status_col]) if status_col and pd.notna(row[status_col]) else "To Do"
                        due_date = str(row[due_col]) if due_col and pd.notna(row[due_col]) else None

                        tasks.append({
                            "id": task_id,
                            "task": task_name,
                            "owner": owner,
                            "status": status,
                            "due_date": due_date,
                            "source_file": doc.name
                        })
            except Exception:
                pass

    completed = sum(1 for t in tasks if t["status"].lower() in ["done", "completed", "closed"])
    in_progress = sum(1 for t in tasks if t["status"].lower() in ["in progress", "active", "doing"])
    pending = len(tasks) - completed - in_progress
    progress_pct = int((completed / len(tasks) * 100)) if tasks else 0

    return {
        "total_tasks": len(tasks),
        "completed_tasks": completed,
        "in_progress_tasks": in_progress,
        "pending_tasks": pending,
        "progress_percentage": progress_pct,
        "tasks": tasks
    }

def ask_advisor(project_id: str, query: str, db: Session) -> Dict[str, Any]:
    from app.services.vector.search import search_project_knowledge
    
    # 1. Retrieve most relevant context chunks
    results = search_project_knowledge(project_id, query, top_k=4, db=db)
    
    context_blocks = []
    citations = []
    for r in results:
        citations.append(f"{r['document_name']} (match: {int(r['similarity'] * 100)}%)")
        context_blocks.append(f"[{r['document_name']}]:\n{r['text']}")

    joined_context = "\n\n---\n\n".join(context_blocks)

    if not joined_context:
        return {
            "answer": "No relevant project documents found yet. Please upload documents such as project charters, progress reports, or schedules to get intelligent advice.",
            "citations": [],
            "sources": []
        }

    # If OpenAI API Key is provided, use GPT model
    if settings.EMBEDDING_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.EMBEDDING_API_KEY)
            system_prompt = (
                "You are an expert AI Project Intelligence & Risk Advisor. "
                "Analyze the provided project document context and provide clear, actionable, "
                "well-structured advice answering the user's question. Focus on identifying risks, "
                "schedule bottlenecks, dependencies, and actionable recommendations. Cite documents where applicable."
            )
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Project Context:\n{joined_context}\n\nUser Question:\n{query}"}
                ],
                max_tokens=600,
                temperature=0.3
            )
            answer = response.choices[0].message.content
            return {
                "answer": answer,
                "citations": list(set(citations)),
                "sources": results
            }
        except Exception:
            pass  # Fallback to extractive advice below

    # Intelligent Extractive synthesis fallback
    top_chunk = results[0] if results else None
    answer_parts = [
        f"Based on **{top_chunk['document_name']}** and related knowledge items:",
        "",
        f"> \"{top_chunk['text'].strip()}\"",
        ""
    ]
    
    # Check if user is asking about risks or next steps
    q_lower = query.lower()
    if "risk" in q_lower:
        answer_parts.append("**Identified Risk Factors:**\n- Ensure API rate limits and external dependencies are monitored closely.\n- Set contingency milestones for high-dependency deliverable items.")
    elif "status" in q_lower or "progress" in q_lower:
        answer_parts.append("**Project Status Assessment:**\n- Workstreams are actively progressing towards Milestone deliverables.\n- Verify task owners have cleared open blockers.")
    else:
        answer_parts.append("**Recommendation:** Review the cited source document for comprehensive specifications and coordinate with respective task owners.")

    return {
        "answer": "\n".join(answer_parts),
        "citations": list(set(citations)),
        "sources": results
    }

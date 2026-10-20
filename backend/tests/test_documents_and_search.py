import io
from app.services.document.pipeline import process_document

def test_document_pipeline_and_intelligence(client, auth_headers, db_session):
    # 1. Create project
    create_res = client.post("/api/projects", json={
        "name": "Mars Rover Alpha",
        "description": "Exploration rover system"
    }, headers=auth_headers)
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]

    # 2. Upload text document
    doc_content = (
        "Project Progress Report for Mars Rover Alpha.\n"
        "The primary objective is deploying autonomous navigation systems by Q4.\n"
        "Major critical risk identified: battery temperature exceeding thermal limits during winter storms.\n"
        "Secondary schedule delay risk: vendor shipment of laser telemetry sensors is postponed by 3 weeks.\n"
        "Action required: calibrate thermal heating coils and source secondary telemetry provider.\n"
    )
    
    file_bytes = io.BytesIO(doc_content.encode("utf-8"))
    upload_res = client.post(
        f"/api/projects/{project_id}/documents",
        files={"file": ("report.txt", file_bytes, "text/plain")},
        headers=auth_headers
    )
    assert upload_res.status_code == 200
    doc_data = upload_res.json()
    doc_id = doc_data["id"]
    assert doc_data["name"] == "report.txt"

    # Process synchronously for test
    process_document(doc_id, db_session=db_session)

    # 3. Check document status
    doc_res = client.get(f"/api/projects/{project_id}/documents/{doc_id}", headers=auth_headers)
    assert doc_res.status_code == 200
    assert doc_res.json()["processing_status"] == "PROCESSED"

    # 4. Check document download
    dl_res = client.get(f"/api/projects/{project_id}/documents/{doc_id}/download", headers=auth_headers)
    assert dl_res.status_code == 200
    assert b"Mars Rover Alpha" in dl_res.content

    # 5. Check Knowledge Stats
    stats_res = client.get(f"/api/projects/{project_id}/knowledge/stats", headers=auth_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["documents_indexed"] >= 1
    assert stats["knowledge_chunks"] >= 1

    # 6. Test Semantic Search
    search_res = client.post(
        f"/api/projects/{project_id}/knowledge/search",
        json={"query": "battery temperature risk", "top_k": 3},
        headers=auth_headers
    )
    assert search_res.status_code == 200
    results = search_res.json()["results"]
    assert len(results) > 0
    assert "battery" in results[0]["text"].lower() or "risk" in results[0]["text"].lower()

    # 7. Test Risk Advisor Extraction
    risks_res = client.get(f"/api/projects/{project_id}/risks", headers=auth_headers)
    assert risks_res.status_code == 200
    risk_data = risks_res.json()
    assert risk_data["total_risks_identified"] >= 1
    assert risk_data["overall_risk_level"] in ["Low", "Medium", "High"]

    # 8. Test Advisor Consultation
    advisor_res = client.post(
        f"/api/projects/{project_id}/advisor/ask",
        json={"query": "What are the primary thermal risks for Mars Rover?"},
        headers=auth_headers
    )
    assert advisor_res.status_code == 200
    advisor_data = advisor_res.json()
    assert "answer" in advisor_data
    assert len(advisor_data["citations"]) > 0

    # 9. Test CSV Upload and Tasks Extraction
    csv_content = (
        "Task ID,Task,Owner,Status,Due Date\n"
        "T101,Battery thermal testing,Thermal Team,In Progress,2026-11-01\n"
        "T102,Firmware telemetry update,Software Team,Done,2026-10-15\n"
    )
    csv_bytes = io.BytesIO(csv_content.encode("utf-8"))
    client.post(
        f"/api/projects/{project_id}/documents",
        files={"file": ("tasks.csv", csv_bytes, "text/csv")},
        headers=auth_headers
    )

    tasks_res = client.get(f"/api/projects/{project_id}/tasks", headers=auth_headers)
    assert tasks_res.status_code == 200
    tasks_data = tasks_res.json()
    assert tasks_data["total_tasks"] == 2
    assert tasks_data["completed_tasks"] == 1
    assert tasks_data["in_progress_tasks"] == 1

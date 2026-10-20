def test_create_and_manage_project(client, auth_headers):
    # Create project
    create_res = client.post("/api/projects", json={
        "name": "Apollo Mission",
        "description": "Lunar exploration project"
    }, headers=auth_headers)
    assert create_res.status_code == 200
    project = create_res.json()
    assert project["name"] == "Apollo Mission"
    project_id = project["id"]

    # List projects
    list_res = client.get("/api/projects", headers=auth_headers)
    assert list_res.status_code == 200
    projects = list_res.json()
    assert any(p["id"] == project_id for p in projects)

    # Get single project
    get_res = client.get(f"/api/projects/{project_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Apollo Mission"

    # Update project
    update_res = client.patch(f"/api/projects/{project_id}", json={
        "description": "Updated lunar landing mission"
    }, headers=auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["description"] == "Updated lunar landing mission"

    # Delete project
    del_res = client.delete(f"/api/projects/{project_id}", headers=auth_headers)
    assert del_res.status_code == 200

    # Ensure project is gone
    get_again = client.get(f"/api/projects/{project_id}", headers=auth_headers)
    assert get_again.status_code == 404

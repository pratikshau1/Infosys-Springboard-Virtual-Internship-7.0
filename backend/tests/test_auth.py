def test_register_and_login(client):
    email = "newuser@example.com"
    password = "MyPassword456"

    # Register
    reg_res = client.post("/api/auth/register", json={
        "name": "New User",
        "email": email,
        "password": password
    })
    assert reg_res.status_code == 200
    user_data = reg_res.json()
    assert user_data["email"] == email
    assert "id" in user_data

    # Duplicate registration should fail
    dup_res = client.post("/api/auth/register", json={
        "name": "New User",
        "email": email,
        "password": password
    })
    assert dup_res.status_code == 400

    # Successful login
    login_res = client.post("/api/auth/login", data={
        "username": email,
        "password": password
    })
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    # Invalid login
    bad_login = client.post("/api/auth/login", data={
        "username": email,
        "password": "wrongpassword"
    })
    assert bad_login.status_code == 401

def test_read_users_me(client, auth_headers):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "testuser@example.com"

def test_read_users_me_unauthorized(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401

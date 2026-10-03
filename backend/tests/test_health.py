def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.mimetype == "application/json"
    assert response.get_json() == {"status": "ok"}


def test_health_rejects_post(client):
    assert client.post("/api/health").status_code == 405

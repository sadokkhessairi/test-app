from app import add, app

def test_add():
    assert add(10, 5) == 15
    assert add(-1, 1) == 0

def test_flask_app():
    # This creates a "fake" client to test the web server without running it
    with app.test_client() as client:
        response = client.get('/')
        assert response.status_code == 200
        assert b"Python Test App is Running!" in response.data

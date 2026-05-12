import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base, get_db
from backend.main import app

# ── Use a separate in-memory SQLite DB for tests ──────────────────────────────
TEST_DB_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)


# ── Health check ──────────────────────────────────────────────────────────────
def test_health():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ── /machines/{machine_id}/latest ─────────────────────────────────────────────
def test_latest_no_data_returns_simulated_reading():
    """When no DB rows exist, should return a generated reading, not crash."""
    response = client.get("/machines/M1/latest")
    assert response.status_code == 200
    data = response.json()
    assert "machine_id" in data
    assert "temperature" in data
    assert "vibration" in data
    assert "pression" in data
    assert "t" in data

def test_latest_returns_most_recent_row():
    """Should return the latest row when data exists."""
    from backend.models import MachineMetric
    db = TestingSessionLocal()
    db.add(MachineMetric(machine_id="M1", temperature=70.0, vibration=2.0, pression=5.0, t=1000))
    db.add(MachineMetric(machine_id="M1", temperature=85.0, vibration=3.0, pression=6.0, t=2000))
    db.commit()
    db.close()

    response = client.get("/machines/M1/latest")
    assert response.status_code == 200
    data = response.json()
    assert data["temperature"] == 85.0   # most recent, not the first
    assert data["t"] == 2000


# ── /machines/{machine_id}/history ────────────────────────────────────────────
def test_history_returns_chronological_order():
    """History should be returned oldest first (reversed in the route)."""
    from backend.models import MachineMetric
    db = TestingSessionLocal()
    db.add(MachineMetric(machine_id="M1", temperature=70.0, vibration=2.0, pression=5.0, t=1000))
    db.add(MachineMetric(machine_id="M1", temperature=80.0, vibration=2.5, pression=5.5, t=2000))
    db.add(MachineMetric(machine_id="M1", temperature=90.0, vibration=3.0, pression=6.0, t=3000))
    db.commit()
    db.close()

    response = client.get("/machines/M1/history")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert data[0]["t"] < data[1]["t"] < data[2]["t"]   # oldest → newest

def test_history_limit_param():
    """limit query param should cap results."""
    from backend.models import MachineMetric
    db = TestingSessionLocal()
    for i in range(20):
        db.add(MachineMetric(machine_id="M2", temperature=70.0, vibration=2.0, pression=5.0, t=i))
    db.commit()
    db.close()

    response = client.get("/machines/M2/history?limit=5")
    assert response.status_code == 200
    assert len(response.json()) == 5

def test_history_empty_machine():
    """Should return empty list for unknown machine."""
    response = client.get("/machines/UNKNOWN/history")
    assert response.status_code == 200
    assert response.json() == []


# ── /alerts ───────────────────────────────────────────────────────────────────
def test_alerts_returns_list():
    response = client.get("/alerts")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_alerts_contain_correct_fields():
    """Each alert must have all expected fields."""
    from backend.models import Alert
    import time
    db = TestingSessionLocal()
    db.add(Alert(
        id="M1-temperature-9999",
        machine_id="M1",
        metric="temperature",
        value=96.0,
        threshold=95.0,
        severity="CRITICAL",
        timestamp=int(time.time() * 1000),
        status="Active",
    ))
    db.commit()
    db.close()

    response = client.get("/alerts")
    assert response.status_code == 200
    alerts = response.json()
    assert len(alerts) >= 1
    alert = alerts[0]
    for field in ["id", "machineId", "metric", "value", "threshold", "severity", "timestamp", "status"]:
        assert field in alert

def test_alerts_auto_resolves_old_alerts():
    """Alerts older than 60s should be auto-resolved on GET /alerts."""
    from backend.models import Alert
    db = TestingSessionLocal()
    old_ts = 1000  # very old timestamp
    db.add(Alert(
        id="M1-vibration-old",
        machine_id="M1",
        metric="vibration",
        value=5.0,
        threshold=4.5,
        severity="CRITICAL",
        timestamp=old_ts,
        status="Active",
    ))
    db.commit()
    db.close()

    client.get("/alerts")  # trigger auto-resolve

    db = TestingSessionLocal()
    alert = db.query(Alert).filter(Alert.id == "M1-vibration-old").first()
    assert alert.status == "Resolved"
    db.close()


# ── Alert threshold logic ─────────────────────────────────────────────────────
def test_check_alerts_creates_critical_alert():
    """_check_alerts should create a CRITICAL alert when value exceeds threshold."""
    from backend.main import _check_alerts
    import time

    db = TestingSessionLocal()
    reading = {
        "machine_id": "M1",
        "temperature": 96.0,   # above CRITICAL threshold of 95
        "vibration": 2.0,
        "pression": 5.0,
        "t": int(time.time() * 1000),
    }
    _check_alerts(reading, db)
    db.commit()

    from backend.models import Alert
    alert = db.query(Alert).filter(Alert.machine_id == "M1", Alert.metric == "temperature").first()
    assert alert is not None
    assert alert.severity == "CRITICAL"
    db.close()

def test_check_alerts_creates_warning_alert():
    """_check_alerts should create a WARNING alert when value is between warning and critical."""
    from backend.main import _check_alerts
    import time

    db = TestingSessionLocal()
    reading = {
        "machine_id": "M2",
        "temperature": 82.0,   # above WARNING (80) but below CRITICAL (95)
        "vibration": 2.0,
        "pression": 5.0,
        "t": int(time.time() * 1000),
    }
    _check_alerts(reading, db)
    db.commit()

    from backend.models import Alert
    alert = db.query(Alert).filter(Alert.machine_id == "M2", Alert.metric == "temperature").first()
    assert alert is not None
    assert alert.severity == "WARNING"
    db.close()

def test_check_alerts_no_alert_below_threshold():
    """_check_alerts should create NO alert when all values are normal."""
    from backend.main import _check_alerts
    import time

    db = TestingSessionLocal()
    reading = {
        "machine_id": "M3",
        "temperature": 60.0,   # well below WARNING
        "vibration": 1.0,
        "pression": 3.0,
        "t": int(time.time() * 1000),
    }
    _check_alerts(reading, db)
    db.commit()

    from backend.models import Alert
    count = db.query(Alert).filter(Alert.machine_id == "M3").count()
    assert count == 0
    db.close()

def test_check_alerts_no_duplicate_alerts():
    """Same alert ID should not be inserted twice."""
    from backend.main import _check_alerts
    import time

    db = TestingSessionLocal()
    reading = {
        "machine_id": "M4",
        "temperature": 96.0,
        "vibration": 2.0,
        "pression": 5.0,
        "t": 99999,
    }
    _check_alerts(reading, db)
    _check_alerts(reading, db)  # call twice with same data
    db.commit()

    from backend.models import Alert
    count = db.query(Alert).filter(Alert.machine_id == "M4").count()
    assert count == 1   # still only 1, not 2
    db.close()

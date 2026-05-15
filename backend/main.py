import os
import time
import asyncio
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import MachineMetric, Alert
from simulator import MACHINES, generate_reading

# ── DB init ───────────────────────────────────────────────────────────────────
os.makedirs("/data", exist_ok=True)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sagemcom Machine Monitor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Thresholds ────────────────────────────────────────────────────────────────
THRESHOLDS = {
    "temperature": {"WARNING": 80.0,  "CRITICAL": 95.0},
    "vibration":   {"WARNING": 3.5,   "CRITICAL": 4.5},
    "pression":    {"WARNING": 7.0,   "CRITICAL": 9.0},
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def _check_alerts(reading: dict, db: Session) -> None:
    for metric in ("temperature", "vibration", "pression"):
        value = reading[metric]
        t     = THRESHOLDS[metric]
        if value >= t["CRITICAL"]:
            sev, threshold = "CRITICAL", t["CRITICAL"]
        elif value >= t["WARNING"]:
            sev, threshold = "WARNING", t["WARNING"]
        else:
            continue

        alert_id = f"{reading['machine_id']}-{metric}-{reading['t']}"
        if not db.query(Alert).filter(Alert.id == alert_id).first():
            db.add(Alert(
                id=alert_id,
                machine_id=reading["machine_id"],
                metric=metric,
                value=value,
                threshold=threshold,
                severity=sev,
                timestamp=reading["t"],
                status="Active",
            ))


# ── Background task — generates a reading every 5 s ──────────────────────────
async def _simulator_loop() -> None:
    from database import SessionLocal
    while True:
        db = SessionLocal()
        try:
            for mid in MACHINES:
                reading = generate_reading(mid)
                db.add(MachineMetric(**reading))
                _check_alerts(reading, db)
            db.commit()
        except Exception as exc:
            print(f"[simulator] error: {exc}")
        finally:
            db.close()
        await asyncio.sleep(5)


@app.on_event("startup")
async def _startup() -> None:
    asyncio.create_task(_simulator_loop())


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/healthz")
def health():
    return {"status": "ok"}


@app.get("/machines/{machine_id}/latest")
def latest(machine_id: str, db: Session = Depends(get_db)):
    row = (
        db.query(MachineMetric)
        .filter(MachineMetric.machine_id == machine_id)
        .order_by(MachineMetric.t.desc())
        .first()
    )
    if not row:
        return generate_reading(machine_id)
    return {
        "machine_id":  row.machine_id,
        "temperature": row.temperature,
        "vibration":   row.vibration,
        "pression":    row.pression,
        "t":           row.t,
    }


@app.get("/alerts")
def alerts(db: Session = Depends(get_db)):
    # Auto-resolve alerts older than 60 s
    cutoff = int(time.time() * 1000) - 60_000
    db.query(Alert).filter(
        Alert.timestamp < cutoff,
        Alert.status == "Active"
    ).update({"status": "Resolved"})
    db.commit()

    rows = (
        db.query(Alert)
        .order_by(Alert.timestamp.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id":        r.id,
            "machineId": r.machine_id,
            "metric":    r.metric,
            "value":     r.value,
            "threshold": r.threshold,
            "severity":  r.severity,
            "timestamp": r.timestamp,
            "status":    r.status,
        }
        for r in rows
    ]


@app.get("/machines/{machine_id}/history")
def history(machine_id: str, limit: int = 100, db: Session = Depends(get_db)):
    rows = (
        db.query(MachineMetric)
        .filter(MachineMetric.machine_id == machine_id)
        .order_by(MachineMetric.t.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "machine_id":  r.machine_id,
            "temperature": r.temperature,
            "vibration":   r.vibration,
            "pression":    r.pression,
            "t":           r.t,
        }
        for r in reversed(rows)
    ]

from sqlalchemy import Column, Integer, Float, String, BigInteger
from database import Base

class MachineMetric(Base):
    __tablename__ = "machine_metrics"

    id          = Column(Integer, primary_key=True, index=True)
    machine_id  = Column(String(50), index=True, nullable=False)
    temperature = Column(Float, nullable=False)
    vibration   = Column(Float, nullable=False)
    pression    = Column(Float, nullable=False)
    t           = Column(BigInteger, nullable=False)   # epoch ms


class Alert(Base):
    __tablename__ = "alerts"

    id          = Column(String(120), primary_key=True)
    machine_id  = Column(String(50), index=True, nullable=False)
    metric      = Column(String(20), nullable=False)
    value       = Column(Float, nullable=False)
    threshold   = Column(Float, nullable=False)
    severity    = Column(String(10), nullable=False)   # WARNING | CRITICAL
    timestamp   = Column(BigInteger, nullable=False)
    status      = Column(String(10), default="Active") # Active | Resolved

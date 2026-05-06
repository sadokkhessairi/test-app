import random
import time

MACHINES = ["MCH-01", "MCH-02", "MCH-03"]

# Smooth drift — keeps last reading per machine
_last: dict = {}

def generate_reading(machine_id: str) -> dict:
    prev  = _last.get(machine_id)
    spike = random.random()

    if prev:
        temperature = prev["temperature"] + random.uniform(-1.2, 1.4)
        vibration   = prev["vibration"]   + random.uniform(-0.25, 0.30)
        pression    = prev["pression"]    + random.uniform(-0.30, 0.35)
    else:
        temperature = random.uniform(65, 78)
        vibration   = random.uniform(1.5, 3.0)
        pression    = random.uniform(4.0, 6.5)

    # Occasional spikes to trigger alerts (~4 % of readings)
    if spike > 0.96:
        temperature += random.uniform(8, 20)
    if spike < 0.04:
        vibration   += random.uniform(1.0, 2.5)
    if 0.50 < spike < 0.54:
        pression    += random.uniform(1.5, 3.5)

    # Clamp to physical limits
    temperature = round(max(55.0, min(115.0, temperature)), 1)
    vibration   = round(max(0.5,  min(6.5,  vibration)),   2)
    pression    = round(max(2.0,  min(12.0, pression)),    2)

    reading = {
        "machine_id":  machine_id,
        "temperature": temperature,
        "vibration":   vibration,
        "pression":    pression,
        "t":           int(time.time() * 1000),
    }
    _last[machine_id] = reading
    return reading

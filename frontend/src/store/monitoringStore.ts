import { useEffect, useState } from "react";
import {
  Alert,
  DEFAULT_THRESHOLDS,
  MACHINES,
  MachineReading,
  Thresholds,
  seedHistory,
  severityFor,
} from "@/lib/monitoring";
import {
  ApiSource,
  fetchAlerts,
  fetchLatestReading,
  getCurrentSource,
  onSourceChange,
} from "@/lib/api";

type HistoryMap = Record<string, MachineReading[]>;

const HISTORY_LIMIT = 200;

// Module-level singleton state (kept simple — avoids extra deps)
const state = {
  history: Object.fromEntries(
    MACHINES.map((m) => [m.id, seedHistory(40)])
  ) as HistoryMap,
  alerts: [] as Alert[],
  thresholds: { ...DEFAULT_THRESHOLDS } as Thresholds,
};

const loadThresholds = () => {
  try {
    const raw = localStorage.getItem("scm.thresholds");
    if (raw) state.thresholds = JSON.parse(raw);
  } catch {
    /* noop */
  }
};
loadThresholds();

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function pushReading(machineId: string, reading: MachineReading) {
  const arr = state.history[machineId];
  arr.push(reading);
  if (arr.length > HISTORY_LIMIT) arr.shift();

  (["temperature", "vibration", "pression"] as const).forEach((metric) => {
    const sev = severityFor(metric, reading[metric], state.thresholds);
    if (sev === "WARNING" || sev === "CRITICAL") {
      const threshold =
        sev === "CRITICAL"
          ? state.thresholds[metric].critical
          : state.thresholds[metric].warning;
      state.alerts.unshift({
        id: `${machineId}-${metric}-${reading.t}`,
        machineId,
        metric,
        value: reading[metric],
        threshold,
        severity: sev,
        timestamp: reading.t,
        status: "Active",
      });
    }
  });

  // Auto-resolve old alerts (older than 60s) for cleanliness
  const cutoff = Date.now() - 60_000;
  state.alerts = state.alerts.map((a) =>
    a.timestamp < cutoff && a.status === "Active"
      ? { ...a, status: "Resolved" }
      : a
  );
  // Cap alerts
  if (state.alerts.length > 200) state.alerts.length = 200;
}

let intervalId: number | null = null;
function startTicker() {
  if (intervalId !== null) return;
  const tick = async () => {
    // Pull latest reading per machine (API or mock fallback)
    await Promise.all(
      MACHINES.map(async (m) => {
        const arr = state.history[m.id];
        const prev = arr[arr.length - 1];
        const { reading } = await fetchLatestReading(m.id, prev);
        pushReading(m.id, reading);
      })
    );

    // Optional: replace local alerts with server-side ones when API is up
    const remoteAlerts = await fetchAlerts();
    if (remoteAlerts) {
      state.alerts = remoteAlerts.slice(0, 200);
    }

    notify();
  };
  // Fire once immediately so the source indicator reflects reality fast
  void tick();
  intervalId = window.setInterval(() => void tick(), 5000);
}

// Track API source changes and notify subscribers so UI badges update
onSourceChange(() => notify());

export function useMonitoring() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const l = () => setTick((n) => n + 1);
    listeners.add(l);
    startTicker();
    return () => {
      listeners.delete(l);
    };
  }, []);

  return {
    history: state.history,
    alerts: state.alerts,
    thresholds: state.thresholds,
    source: getCurrentSource() as ApiSource,
    setThresholds: (t: Thresholds) => {
      state.thresholds = t;
      localStorage.setItem("scm.thresholds", JSON.stringify(t));
      notify();
    },
    resolveAlert: (id: string) => {
      state.alerts = state.alerts.map((a) =>
        a.id === id ? { ...a, status: "Resolved" } : a
      );
      notify();
    },
  };
}

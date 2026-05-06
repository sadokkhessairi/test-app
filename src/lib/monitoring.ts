export type Severity = "NORMAL" | "WARNING" | "CRITICAL";
export type MetricKey = "temperature" | "vibration" | "pression";

export interface Thresholds {
  temperature: { warning: number; critical: number };
  vibration: { warning: number; critical: number };
  pression: { warning: number; critical: number };
}

export interface MachineReading {
  t: number;
  temperature: number;
  vibration: number;
  pression: number;
}

export interface Machine {
  id: string;
  name: string;
  location: string;
}

export interface Alert {
  id: string;
  machineId: string;
  metric: MetricKey;
  value: number;
  threshold: number;
  severity: "WARNING" | "CRITICAL";
  timestamp: number;
  status: "Active" | "Resolved";
}

export const MACHINES: Machine[] = [
  { id: "MCH-01", name: "Machine-01", location: "Line A · Press" },
  { id: "MCH-02", name: "Machine-02", location: "Line B · Assembly" },
  { id: "MCH-03", name: "Machine-03", location: "Line C · Packaging" },
];

export const DEFAULT_THRESHOLDS: Thresholds = {
  temperature: { warning: 80, critical: 95 },
  vibration: { warning: 3.5, critical: 4.5 },
  pression: { warning: 7, critical: 9 },
};

export const METRIC_LABEL: Record<MetricKey, string> = {
  temperature: "Temperature",
  vibration: "Vibration",
  pression: "Pression",
};

export const METRIC_UNIT: Record<MetricKey, string> = {
  temperature: "°C",
  vibration: "mm/s",
  pression: "bar",
};

export function severityFor(
  metric: MetricKey,
  value: number,
  thresholds: Thresholds
): Severity {
  const t = thresholds[metric];
  if (value >= t.critical) return "CRITICAL";
  if (value >= t.warning) return "WARNING";
  return "NORMAL";
}

export function overallSeverity(
  reading: MachineReading,
  thresholds: Thresholds
): Severity {
  const s: Severity[] = [
    severityFor("temperature", reading.temperature, thresholds),
    severityFor("vibration", reading.vibration, thresholds),
    severityFor("pression", reading.pression, thresholds),
  ];
  if (s.includes("CRITICAL")) return "CRITICAL";
  if (s.includes("WARNING")) return "WARNING";
  return "NORMAL";
}

// Simulated data — biased so readings drift but mostly NORMAL
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function generateReading(prev?: MachineReading): MachineReading {
  // Occasional spikes to trigger alerts
  const spike = Math.random();
  let temperature = prev ? prev.temperature + rand(-1.2, 1.4) : rand(65, 78);
  let vibration = prev ? prev.vibration + rand(-0.25, 0.3) : rand(1.5, 3);
  let pression = prev ? prev.pression + rand(-0.3, 0.35) : rand(4, 6.5);

  if (spike > 0.96) temperature += rand(8, 18);
  if (spike < 0.04) vibration += rand(1, 2);
  if (spike > 0.5 && spike < 0.54) pression += rand(1.5, 3);

  temperature = Math.max(55, Math.min(110, temperature));
  vibration = Math.max(0.5, Math.min(6, vibration));
  pression = Math.max(2, Math.min(11, pression));

  return {
    t: Date.now(),
    temperature: +temperature.toFixed(1),
    vibration: +vibration.toFixed(2),
    pression: +pression.toFixed(2),
  };
}

export function seedHistory(points = 40): MachineReading[] {
  const arr: MachineReading[] = [];
  let prev: MachineReading | undefined;
  const now = Date.now();
  for (let i = points - 1; i >= 0; i--) {
    const r = generateReading(prev);
    r.t = now - i * 5000;
    arr.push(r);
    prev = r;
  }
  return arr;
}

export function severityClass(sev: Severity) {
  switch (sev) {
    case "NORMAL":
      return "bg-status-normal text-status-normal-foreground";
    case "WARNING":
      return "bg-status-warning text-status-warning-foreground";
    case "CRITICAL":
      return "bg-status-critical text-status-critical-foreground";
  }
}

export function severityTextClass(sev: Severity) {
  switch (sev) {
    case "NORMAL":
      return "text-status-normal";
    case "WARNING":
      return "text-status-warning";
    case "CRITICAL":
      return "text-status-critical";
  }
}

import { Alert, MachineReading, generateReading } from "./monitoring";

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

const REQUEST_TIMEOUT_MS = 2500;

export type ApiSource = "api" | "mock";

let apiAvailable: boolean | null = null;
let lastProbe = 0;
const PROBE_INTERVAL_MS = 30_000;

const listeners = new Set<(s: ApiSource) => void>();
export function onSourceChange(cb: (s: ApiSource) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function setAvailable(v: boolean) {
  const prev = apiAvailable;
  apiAvailable = v;
  if (prev !== v) {
    const src: ApiSource = v ? "api" : "mock";
    listeners.forEach((l) => l(src));
  }
}

export function getCurrentSource(): ApiSource {
  return apiAvailable ? "api" : "mock";
}

async function fetchWithTimeout(input: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const id = window.setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(input, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    window.clearTimeout(id);
  }
}

async function tryApi<T>(path: string): Promise<T | null> {
  const now = Date.now();
  // If last probe failed recently, skip until interval elapses
  if (apiAvailable === false && now - lastProbe < PROBE_INTERVAL_MS) {
    return null;
  }
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}${path}`);
    const data = (await res.json()) as T;
    setAvailable(true);
    lastProbe = now;
    return data;
  } catch {
    setAvailable(false);
    lastProbe = now;
    return null;
  }
}

/**
 * Fetch the latest reading for a machine.
 * Falls back to a generated mock reading when the API is unreachable.
 */
export async function fetchLatestReading(
  machineId: string,
  prev?: MachineReading
): Promise<{ reading: MachineReading; source: ApiSource }> {
  const data = await tryApi<MachineReading>(`/machines/${machineId}/latest`);
  if (data && typeof data.temperature === "number") {
    return { reading: { ...data, t: data.t ?? Date.now() }, source: "api" };
  }
  return { reading: generateReading(prev), source: "mock" };
}

/**
 * Fetch alerts from the API. Returns null when the API is unreachable
 * (so the caller can keep using locally-derived alerts).
 */
export async function fetchAlerts(): Promise<Alert[] | null> {
  return await tryApi<Alert[]>(`/alerts`);
}

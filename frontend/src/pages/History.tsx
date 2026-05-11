import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMonitoring } from "@/store/monitoringStore";
import { MACHINES, METRIC_LABEL, METRIC_UNIT, MetricKey } from "@/lib/monitoring";

const RANGES = [
  { label: "Last 1h", value: 60 * 60 * 1000 },
  { label: "Last 6h", value: 6 * 60 * 60 * 1000 },
  { label: "Last 24h", value: 24 * 60 * 60 * 1000 },
];

export default function History() {
  const { history, thresholds } = useMonitoring();
  const [machineId, setMachineId] = useState(MACHINES[0].id);
  const [metric, setMetric] = useState<MetricKey>("temperature");
  const [range, setRange] = useState(RANGES[0].value);

  const cutoff = Date.now() - range;
  const data = history[machineId]
    .filter((r) => r.t >= cutoff)
    .map((r) => ({
      time: new Date(r.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      value: r[metric],
    }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">History</h2>
        <p className="text-sm text-muted-foreground">Metric evolution over time</p>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Machine</label>
            <Select value={machineId} onValueChange={setMachineId}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MACHINES.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.id})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Metric</label>
            <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="temperature">Temperature</SelectItem>
                <SelectItem value="vibration">Vibration</SelectItem>
                <SelectItem value="pression">Pression</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Time range</label>
            <Select value={String(range)} onValueChange={(v) => setRange(Number(v))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-base font-semibold">
            {METRIC_LABEL[metric]} <span className="text-sm font-normal text-muted-foreground">({METRIC_UNIT[metric]})</span>
          </h3>
          <span className="text-xs text-muted-foreground">{data.length} points</span>
        </div>
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span>Warning ≥ <span className="text-status-warning font-mono">{thresholds[metric].warning}</span></span>
          <span>Critical ≥ <span className="text-status-critical font-mono">{thresholds[metric].critical}</span></span>
        </div>
      </Card>
    </div>
  );
}

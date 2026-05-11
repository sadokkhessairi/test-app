import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Activity, Gauge } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import {
  Machine,
  MachineReading,
  METRIC_UNIT,
  MetricKey,
  Severity,
  Thresholds,
  overallSeverity,
  severityClass,
  severityFor,
  severityTextClass,
} from "@/lib/monitoring";

interface Props {
  machine: Machine;
  history: MachineReading[];
  thresholds: Thresholds;
}

const metricMeta: { key: MetricKey; label: string; icon: typeof Thermometer }[] = [
  { key: "temperature", label: "Temperature", icon: Thermometer },
  { key: "vibration", label: "Vibration", icon: Activity },
  { key: "pression", label: "Pression", icon: Gauge },
];

function statusGlow(sev: Severity) {
  if (sev === "CRITICAL") return "shadow-[0_0_28px_-4px_hsl(var(--status-critical)/0.55)] border-status-critical/40";
  if (sev === "WARNING") return "shadow-[0_0_24px_-6px_hsl(var(--status-warning)/0.5)] border-status-warning/40";
  return "shadow-[0_0_20px_-8px_hsl(var(--status-normal)/0.4)] border-status-normal/30";
}

function strokeFor(sev: Severity) {
  if (sev === "CRITICAL") return "hsl(var(--status-critical))";
  if (sev === "WARNING") return "hsl(var(--status-warning))";
  return "hsl(var(--status-normal))";
}

export function MachineCard({ machine, history, thresholds }: Props) {
  const latest = history[history.length - 1];
  const sev = overallSeverity(latest, thresholds);
  const sparkData = history.slice(-30);

  return (
    <Card
      className={`relative overflow-hidden border bg-[image:var(--gradient-card)] transition-all ${statusGlow(sev)}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight">{machine.name}</h3>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {machine.id}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{machine.location}</p>
          </div>
          <Badge className={`${severityClass(sev)} font-mono text-[10px] tracking-wider`}>
            {sev}
          </Badge>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {metricMeta.map(({ key, label, icon: Icon }) => {
            const v = latest[key];
            const mSev = severityFor(key, v, thresholds);
            return (
              <div
                key={key}
                className="rounded-lg border border-border/60 bg-surface-deep/60 p-3"
              >
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
                <div className={`mt-1 font-mono text-xl font-semibold tabular-nums ${severityTextClass(mSev)}`}>
                  {v.toFixed(key === "temperature" ? 1 : 2)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {METRIC_UNIT[key]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 h-16 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke={strokeFor(sev)}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Last update</span>
          <span className="font-mono tabular-nums">
            {new Date(latest.t).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </Card>
  );
}

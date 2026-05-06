import { Card } from "@/components/ui/card";
import { MachineCard } from "@/components/MachineCard";
import { MACHINES, overallSeverity } from "@/lib/monitoring";
import { useMonitoring } from "@/store/monitoringStore";
import { CircleCheck, AlertTriangle, OctagonAlert, Cpu } from "lucide-react";

export default function Dashboard() {
  const { history, thresholds, source } = useMonitoring();
  const isLive = source === "api";

  const counts = MACHINES.reduce(
    (acc, m) => {
      const latest = history[m.id][history[m.id].length - 1];
      const sev = overallSeverity(latest, thresholds);
      acc[sev]++;
      return acc;
    },
    { NORMAL: 0, WARNING: 0, CRITICAL: 0 } as Record<string, number>
  );

  const summary = [
    { label: "Total machines", value: MACHINES.length, icon: Cpu, color: "text-primary" },
    { label: "Normal", value: counts.NORMAL, icon: CircleCheck, color: "text-status-normal" },
    { label: "Warning", value: counts.WARNING, icon: AlertTriangle, color: "text-status-warning" },
    { label: "Critical", value: counts.CRITICAL, icon: OctagonAlert, color: "text-status-critical" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Live Overview</h2>
          <p className="text-sm text-muted-foreground">Auto-refresh every 5 seconds</p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wider ${
            isLive
              ? "border-status-normal/40 text-status-normal"
              : "border-status-warning/40 text-status-warning"
          }`}
          title={isLive ? "Connected to REST API" : "API unreachable — using mock data"}
        >
          <span
            className={`h-2 w-2 rounded-full pulse-dot ${
              isLive ? "bg-status-normal" : "bg-status-warning"
            }`}
          />
          {isLive ? "API · Live" : "Mock · Offline"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label} className="bg-[image:var(--gradient-card)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${s.color}`}>
              {s.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MACHINES.map((m) => (
          <MachineCard
            key={m.id}
            machine={m}
            history={history[m.id]}
            thresholds={thresholds}
          />
        ))}
      </div>
    </div>
  );
}

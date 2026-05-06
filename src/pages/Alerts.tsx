import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useMonitoring } from "@/store/monitoringStore";
import { MACHINES, METRIC_LABEL, METRIC_UNIT, severityClass } from "@/lib/monitoring";

export default function Alerts() {
  const { alerts, resolveAlert } = useMonitoring();
  const [sev, setSev] = useState<string>("ALL");
  const [machine, setMachine] = useState<string>("ALL");

  const filtered = useMemo(() => {
    return alerts.filter(
      (a) =>
        (sev === "ALL" || a.severity === sev) &&
        (machine === "ALL" || a.machineId === machine)
    );
  }, [alerts, sev, machine]);

  const activeWarn = alerts.filter((a) => a.status === "Active" && a.severity === "WARNING").length;
  const activeCrit = alerts.filter((a) => a.status === "Active" && a.severity === "CRITICAL").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Alerts</h2>
          <p className="text-sm text-muted-foreground">Triggered threshold violations</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-status-warning text-status-warning-foreground">
            {activeWarn} active warnings
          </Badge>
          <Badge className="bg-status-critical text-status-critical-foreground">
            {activeCrit} active critical
          </Badge>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[180px]">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Severity
            </label>
            <Select value={sev} onValueChange={setSev}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All severities</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px]">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Machine
            </label>
            <Select value={machine} onValueChange={setMachine}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All machines</SelectItem>
                {MACHINES.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.id})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Machine</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Threshold</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No alerts to display
                </TableCell>
              </TableRow>
            )}
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs">{a.machineId}</TableCell>
                <TableCell>{METRIC_LABEL[a.metric]}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {a.value.toFixed(2)} {METRIC_UNIT[a.metric]}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {a.threshold} {METRIC_UNIT[a.metric]}
                </TableCell>
                <TableCell>
                  <Badge className={severityClass(a.severity)}>{a.severity}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {new Date(a.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      a.status === "Active"
                        ? "text-status-warning"
                        : "text-muted-foreground"
                    }
                  >
                    ● {a.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {a.status === "Active" && (
                    <Button size="sm" variant="ghost" onClick={() => resolveAlert(a.id)}>
                      Resolve
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

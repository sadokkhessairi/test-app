import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMonitoring } from "@/store/monitoringStore";
import { DEFAULT_THRESHOLDS, METRIC_LABEL, METRIC_UNIT, MetricKey, Thresholds } from "@/lib/monitoring";
import { toast } from "@/hooks/use-toast";
import { RotateCcw, Save } from "lucide-react";

export default function Settings() {
  const { thresholds, setThresholds } = useMonitoring();
  const [draft, setDraft] = useState<Thresholds>(thresholds);

  const update = (metric: MetricKey, level: "warning" | "critical", value: string) => {
    setDraft({
      ...draft,
      [metric]: { ...draft[metric], [level]: parseFloat(value) || 0 },
    });
  };

  const save = () => {
    setThresholds(draft);
    toast({ title: "Thresholds saved", description: "New alert rules are now active." });
  };

  const reset = () => {
    setDraft(DEFAULT_THRESHOLDS);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">Global alert thresholds (applied to all machines)</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(["temperature", "vibration", "pression"] as MetricKey[]).map((metric) => (
          <Card key={metric} className="bg-[image:var(--gradient-card)] p-5">
            <h3 className="text-base font-semibold">
              {METRIC_LABEL[metric]} <span className="text-xs font-normal text-muted-foreground">({METRIC_UNIT[metric]})</span>
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-status-warning text-xs uppercase tracking-wider">Warning ≥</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={draft[metric].warning}
                  onChange={(e) => update(metric, "warning", e.target.value)}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-status-critical text-xs uppercase tracking-wider">Critical ≥</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={draft[metric].critical}
                  onChange={(e) => update(metric, "critical", e.target.value)}
                  className="mt-1 font-mono"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={save}>
          <Save className="mr-2 h-4 w-4" /> Save thresholds
        </Button>
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reset to defaults
        </Button>
      </div>

      <Card className="p-4 text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Note:</span> Mock data is used for now.
          Backend will be connected later via REST API at <code className="rounded bg-muted px-1 py-0.5 font-mono">http://localhost:8000</code>.
        </p>
      </Card>
    </div>
  );
}

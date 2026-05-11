import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useEffect, useState } from "react";

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-1.5 font-mono text-sm tabular-nums">
      <span className="h-2 w-2 rounded-full bg-status-normal pulse-dot" />
      <span className="text-muted-foreground">{now.toLocaleDateString()}</span>
      <span className="text-foreground">{now.toLocaleTimeString()}</span>
    </div>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="hidden md:flex flex-col leading-tight">
                <h1 className="text-sm font-semibold">Sagemcom Machine Monitor</h1>
                <p className="text-[11px] text-muted-foreground">Industrial telemetry · live</p>
              </div>
            </div>
            <LiveClock />
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

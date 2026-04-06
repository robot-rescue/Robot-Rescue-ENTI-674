import React from "react";
import { Sidebar } from "./sidebar";
import { Bell } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <div className="data-grid-bg absolute inset-0 pointer-events-none opacity-20" />
      <div className="scanline" />
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-6 z-20">
          <div className="font-sans font-bold tracking-wider text-sm">ROBOT RESCUE</div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-emerald-500 tracking-widest">LIVE SYSTEM ONLINE</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-muted-foreground hover:text-foreground transition-colors relative">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-mono font-bold text-primary border border-primary/20">
              OP
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

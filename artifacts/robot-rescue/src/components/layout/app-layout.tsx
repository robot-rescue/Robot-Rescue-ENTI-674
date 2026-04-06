import React from "react";
import { Sidebar } from "./sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <div className="data-grid-bg absolute inset-0 pointer-events-none opacity-20" />
      <div className="scanline" />
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {children}
      </main>
    </div>
  );
}

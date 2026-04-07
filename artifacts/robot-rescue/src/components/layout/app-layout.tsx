import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./sidebar";
import { Bell, CheckCheck, ChevronRight, Bot, AlertTriangle, Activity } from "lucide-react";
import { useSimulatedAlerts } from "../simulated-alerts-provider";
import { useListIncidents } from "@workspace/api-client-react";
import { SeverityBadge } from "../ui-helpers";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const { notifications, unreadCount, markAllRead, markOneRead, simulatedIncidents } = useSimulatedAlerts();
  const { data: apiIncidents = [] } = useListIncidents({ status: "active" });

  const totalActive = apiIncidents.length + simulatedIncidents.length;
  const criticalCount = [...apiIncidents, ...simulatedIncidents].filter(i => i.severity === 'high').length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNotifClick = (notifId: string, incidentId: string) => {
    markOneRead(notifId);
    setBellOpen(false);
    setLocation(`/incidents/${incidentId}`);
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <div className="data-grid-bg absolute inset-0 pointer-events-none opacity-20" />
      <div className="scanline" />
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-6 z-20">
          <div className="font-sans font-bold tracking-wider text-sm">ROBOT RESCUE</div>

          <div className="flex items-center gap-5">
            {/* System status pills */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <Bot className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-muted-foreground">ONLINE</span>
                <span className="text-emerald-500 font-bold">{Math.max(0, 10 - totalActive)}</span>
              </div>
              <div className="w-px h-3.5 bg-border" />
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">ACTIVE</span>
                <span className="text-primary font-bold">{totalActive}</span>
              </div>
              <div className="w-px h-3.5 bg-border" />
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-muted-foreground">CRITICAL</span>
                <span className={`font-bold ${criticalCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>{criticalCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-emerald-500 tracking-widest hidden md:inline">LIVE SYSTEM ONLINE</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div ref={bellRef} className="relative">
              <button
                onClick={() => { setBellOpen(v => !v); if (!bellOpen) markAllRead(); }}
                className="text-muted-foreground hover:text-foreground transition-colors relative p-1"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-[0_0_6px_rgba(239,68,68,0.7)] animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
                      <div className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
                        Alerts
                        {unreadCount > 0 && (
                          <span className="ml-2 text-primary">({unreadCount} new)</span>
                        )}
                      </div>
                      {notifications.some(n => !n.read) && (
                        <button
                          onClick={markAllRead}
                          className="flex items-center gap-1 text-[10px] font-mono text-primary hover:text-primary/80 transition-colors"
                        >
                          <CheckCheck className="w-3 h-3" />
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground font-mono">
                          No alerts yet.<br />New incidents appear here.
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <button
                            key={notif.id}
                            onClick={() => handleNotifClick(notif.id, notif.incident.id)}
                            className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-secondary/50 transition-colors flex items-start gap-3 group ${!notif.read ? 'bg-primary/5' : ''}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-bold text-xs text-foreground">{notif.incident.robotId}</span>
                                <SeverityBadge severity={notif.incident.severity} />
                                {!notif.read && (
                                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {notif.incident.issueType.replace(/_/g, ' ')}
                              </div>
                              <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                                {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                              </div>
                            </div>
                            <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary mt-1 flex-shrink-0 transition-colors" />
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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

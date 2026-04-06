import { Link, useLocation } from "wouter";
import { Activity, AlertTriangle, BarChart3, Bot, List, ShieldAlert } from "lucide-react";
import { useSimulatedAlerts } from "../simulated-alerts-provider";

export function Sidebar() {
  const [location] = useLocation();
  const { hasUnread } = useSimulatedAlerts();

  const navItems = [
    { href: "/", icon: AlertTriangle, label: "Active Alerts", badge: hasUnread },
    { href: "/log", icon: List, label: "Incident Log" },
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full relative z-10">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <ShieldAlert className="w-6 h-6 text-primary mr-3" />
        <span className="font-bold text-lg tracking-wider text-foreground uppercase">RBT-RESCUE</span>
      </div>
      
      <div className="flex-1 py-6 flex flex-col gap-2 px-4">
        <div className="text-xs font-mono text-muted-foreground mb-2 px-2 uppercase tracking-wider">
          Mission Control
        </div>
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-md transition-all duration-200 group relative ${
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-sm" />
              )}
              <item.icon className={`w-5 h-5 mr-3 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              <span className="text-sm tracking-wide">{item.label}</span>
              
              {item.badge && (
                <span className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(255,85,0,0.8)]" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground">OPERATOR-01</span>
            <span className="text-[10px] text-primary flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1 animate-pulse" />
              SYSTEM ONLINE
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

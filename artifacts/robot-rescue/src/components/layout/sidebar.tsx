import { Link, useLocation } from "wouter";
import { AlertTriangle, BarChart3, Bot, List, ShieldAlert, Users } from "lucide-react";
import { useSimulatedAlerts } from "../simulated-alerts-provider";

export function Sidebar() {
  const [location] = useLocation();
  const { unreadCount } = useSimulatedAlerts();

  const navItems = [
    { href: "/", icon: AlertTriangle, label: "Active Alerts", badge: unreadCount > 0 },
    { href: "/assignments", icon: Users, label: "Assignments" },
    { href: "/log", icon: List, label: "Incident Log" },
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
  ];

  return (
    <aside className="w-16 hover:w-[220px] transition-all duration-300 border-r border-border bg-sidebar flex flex-col h-full relative z-20 group">
      <div className="h-14 flex items-center px-4 border-b border-border overflow-hidden whitespace-nowrap">
        <ShieldAlert className="w-6 h-6 text-primary flex-shrink-0" />
        <span className="font-bold text-lg tracking-wider text-foreground uppercase ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">ROBOT RESCUE</span>
      </div>
      
      <div className="flex-1 py-6 flex flex-col gap-1 px-2 overflow-hidden whitespace-nowrap">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-md transition-all duration-200 relative group/item ${
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
              title={item.label}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-sm" />
              )}
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
              <span className="text-sm tracking-wide ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.label}</span>
              
              {item.badge && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-3 border-t border-border overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-xs font-bold text-foreground">OPERATOR-01</span>
            <span className="text-[10px] text-emerald-500 flex items-center font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
              ONLINE
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

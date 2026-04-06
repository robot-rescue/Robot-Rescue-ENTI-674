import React, { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Clock } from "lucide-react";

export function IncidentTimer({ timestamp }: { timestamp: string }) {
  const [timeText, setTimeText] = useState("");

  useEffect(() => {
    const updateTime = () => {
      try {
        const text = formatDistanceToNowStrict(new Date(timestamp));
        setTimeText(text);
      } catch (e) {
        setTimeText("--");
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <div className="flex items-center text-xs font-mono">
      <Clock className="w-3 h-3 mr-1.5 opacity-70" />
      {timeText}
    </div>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "high": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "low": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${getSeverityColor(severity)}`}>
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const getStatusColor = (st: string) => {
    switch (st.toLowerCase()) {
      case "resolved": return "text-emerald-500";
      case "in_progress": return "text-amber-500";
      case "waiting": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono uppercase">
      <span className={`w-1.5 h-1.5 rounded-full ${status.toLowerCase() !== 'resolved' ? 'animate-pulse' : ''} bg-current ${getStatusColor(status)}`} />
      <span className={getStatusColor(status)}>{status.replace('_', ' ')}</span>
    </div>
  );
}

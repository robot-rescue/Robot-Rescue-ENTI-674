import React, { useEffect, useState } from "react";
import { formatDistanceToNowStrict, differenceInMinutes } from "date-fns";
import { Clock } from "lucide-react";

export function IncidentTimer({ timestamp }: { timestamp: string }) {
  const [timeText, setTimeText] = useState("");
  const [isLate, setIsLate] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      try {
        const date = new Date(timestamp);
        const text = formatDistanceToNowStrict(date);
        setTimeText(text);
        
        const diffMins = differenceInMinutes(new Date(), date);
        setIsLate(diffMins > 30);
        setIsWarning(diffMins > 15 && diffMins <= 30);
      } catch (e) {
        setTimeText("--");
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);

  const colorClass = isLate ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-500';

  return (
    <div className={`flex items-center text-xs font-mono font-bold ${colorClass}`}>
      <Clock className="w-3 h-3 mr-1.5" />
      {timeText}
    </div>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const getSeverityStyle = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "high": return "bg-red-500/10 text-red-500 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]";
      case "medium": return "bg-amber-500/10 text-amber-500 border-amber-500/50";
      case "low": return "bg-blue-500/10 text-blue-400 border-blue-500/50";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/50";
    }
  };

  const isHigh = severity.toLowerCase() === 'high';

  return (
    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest border ${getSeverityStyle(severity)}`}>
      {isHigh && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
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
    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold">
      <span className={`w-2 h-2 rounded-full ${status.toLowerCase() !== 'resolved' ? 'animate-pulse' : ''} bg-current ${getStatusColor(status)}`} />
      <span className={getStatusColor(status)}>{status.replace('_', ' ')}</span>
    </div>
  );
}

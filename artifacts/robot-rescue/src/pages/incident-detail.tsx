import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetIncident, useUpdateIncident, getListIncidentsQueryKey, getGetIncidentLogQueryKey, UpdateIncidentBodyActionTaken } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSimulatedAlerts } from "../components/simulated-alerts-provider";
import { IncidentTimer, SeverityBadge, StatusBadge } from "../components/ui-helpers";
import {
  ArrowLeft, Battery, Bot, Cpu, Navigation, PauseOctagon,
  ShieldAlert, Signal, Thermometer, AlertTriangle, User, ChevronDown, Brain, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const OPERATORS = ["Unassigned", "Alex Chen", "Sarah Kim", "Jordan Patel", "Darren Watkins Jr."];
const OPERATOR_COLORS: Record<string, string> = {
  "Alex Chen": "bg-cyan-600",
  "Sarah Kim": "bg-violet-600",
  "Jordan Patel": "bg-amber-600",
  "Darren Watkins Jr.": "bg-emerald-600",
};
const OPERATOR_INITIALS: Record<string, string> = {
  "Alex Chen": "AC",
  "Sarah Kim": "SK",
  "Jordan Patel": "JP",
  "Darren Watkins Jr.": "DW",
};

type AISuggestion = { action: string; reason: string; priority: "high" | "medium" | "low" };

function getAISuggestions(issueType: string, severity: string): AISuggestion[] {
  const suggestions: Record<string, AISuggestion[]> = {
    obstacle_detected: [
      { action: "Reroute robot around the detected obstacle", reason: "Lidar confirms a static object — alternate path available via Corridor B.", priority: "high" },
      { action: "Pause system and request visual inspection", reason: "Object classification inconclusive. Human verification recommended before resuming.", priority: "medium" },
      { action: "Activate sensor sweep mode", reason: "Extended 360° scan may resolve object type and clear path safely.", priority: "low" },
    ],
    system_error: [
      { action: "Initiate remote system restart", reason: "Motor controller error 0x4A21 is recoverable via soft reset protocol.", priority: "high" },
      { action: "Execute manual override sequence", reason: "If restart fails, manual control allows safe navigation to maintenance bay.", priority: "high" },
      { action: "Escalate to Level 2 engineering team", reason: "Recurring error code warrants hardware diagnostics by on-site technicians.", priority: "medium" },
    ],
    path_blocked: [
      { action: "Recalculate route via alternate corridor", reason: "Fleet map shows viable detour through Sector 4B — est. 2 min delay.", priority: "high" },
      { action: "Hold position and await path clearance", reason: "Maintenance crew activity is temporary — projected clear in 8 minutes.", priority: "medium" },
      { action: "Coordinate with fleet manager for resequencing", reason: "Multiple blocked units may benefit from synchronized rerouting.", priority: "low" },
    ],
    sensor_failure: [
      { action: "Switch to backup sensor array", reason: "Secondary proximity sensors online and functional — degraded mode available.", priority: "high" },
      { action: "Reduce speed and proceed with caution", reason: "Partial sensor capability allows slow safe transit to charging bay.", priority: "medium" },
      { action: "Halt and schedule immediate maintenance", reason: "Operating without primary sensors poses collision risk — immediate service recommended.", priority: "high" },
    ],
    battery_critical: [
      { action: "Guide robot to nearest charging station", reason: "Station C-7 is 45 meters away — within current battery range.", priority: "high" },
      { action: "Dispatch mobile charging unit", reason: "Robot cannot safely reach charging bay — mobile unit deployment advised.", priority: "high" },
      { action: "Suspend non-critical tasks immediately", reason: "Reducing computational load may extend operational window by 3–5 minutes.", priority: "medium" },
    ],
    communication_lost: [
      { action: "Attempt signal boost via relay node", reason: "Node RN-12 is in range — may restore connectivity within 30 seconds.", priority: "high" },
      { action: "Allow autonomous safe-hold protocol to proceed", reason: "Robot is executing standard disconnection protocol — minimal risk if in open space.", priority: "medium" },
      { action: "Send technician to physical location", reason: "If signal not restored in 2 minutes, on-site manual override is safest option.", priority: "medium" },
    ],
  };
  return suggestions[issueType] || [
    { action: "Perform diagnostic check", reason: "System scan may identify the root cause and suggest automated resolution.", priority: "medium" },
    { action: "Escalate to operations team", reason: "Unknown issue type requires human expert review.", priority: "high" },
  ];
}

function CountdownTimer({ timestamp, severity }: { timestamp: string; severity: string }) {
  const [remaining, setRemaining] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (severity !== "high") return;
    const update = () => {
      const elapsedMs = Date.now() - new Date(timestamp).getTime();
      const elapsedMins = elapsedMs / 60000;
      const remainingMins = Math.max(0, 30 - elapsedMins);
      const mins = Math.floor(remainingMins);
      const secs = Math.floor((remainingMins - mins) * 60);
      setRemaining(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      setIsUrgent(remainingMins < 5);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [timestamp, severity]);

  if (severity !== "high") return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono font-bold ${isUrgent ? 'border-red-500/60 bg-red-500/10 text-red-400 animate-pulse' : 'border-amber-500/40 bg-amber-500/10 text-amber-400'}`}>
      <AlertTriangle className="w-3.5 h-3.5" />
      <span>RESPONSE WINDOW: {remaining}</span>
    </div>
  );
}

function CameraFeed({ robotId, location, issueType }: { robotId: string; location: string; issueType: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(iv);
  }, []);

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();

  const isObstacle = issueType === 'obstacle_detected' || issueType === 'path_blocked';
  const isComms = issueType === 'communication_lost';

  return (
    <div className="aspect-video bg-black relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 scanline opacity-30" />

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#040810" />
          </linearGradient>
          <radialGradient id="glowGreen" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,255,200,0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        <rect width="640" height="360" fill="url(#floorGrad)" />
        <rect width="640" height="360" fill="url(#glowGreen)" />

        {/* Floor perspective grid */}
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <line key={`vg${i}`} x1={80*i} y1="360" x2={320 + (80*i-320)*0.1} y2="200"
            stroke="rgba(0,200,200,0.08)" strokeWidth="1" />
        ))}
        {[0,1,2,3,4,5].map(i => {
          const y = 200 + i * 30;
          const spread = (y-200) / 160;
          return <line key={`hg${i}`} x1={320 - spread*320} y1={y} x2={320 + spread*320} y2={y}
            stroke="rgba(0,200,200,0.06)" strokeWidth="1" />;
        })}

        {/* Wall outlines */}
        <rect x="0" y="0" width="640" height="205" fill="rgba(5,10,20,0.5)" />
        <line x1="0" y1="200" x2="640" y2="200" stroke="rgba(0,200,200,0.15)" strokeWidth="1" />

        {/* Shelf outlines on wall */}
        {[60, 200, 340, 480].map(x => (
          <g key={`shelf${x}`}>
            <rect x={x} y="60" width="80" height="110" rx="2" fill="rgba(20,30,45,0.8)" stroke="rgba(0,200,200,0.1)" strokeWidth="1" />
            <rect x={x+5} y="70" width="70" height="12" rx="1" fill="rgba(0,200,200,0.05)" />
            <rect x={x+5} y="87" width="70" height="12" rx="1" fill="rgba(0,200,200,0.05)" />
            <rect x={x+5} y="104" width="70" height="12" rx="1" fill="rgba(0,200,200,0.05)" />
          </g>
        ))}

        {/* Robot body */}
        <g transform="translate(285, 240)">
          <rect x="-30" y="-35" width="60" height="70" rx="6" fill="rgba(15,25,40,0.95)" stroke="rgba(0,200,200,0.4)" strokeWidth="1.5" />
          <rect x="-20" y="-25" width="40" height="25" rx="2" fill="rgba(0,180,220,0.1)" stroke="rgba(0,200,200,0.2)" strokeWidth="1" />
          {/* Eye/sensor */}
          <circle cx="0" cy="-12" r="8" fill="rgba(0,200,200,0.15)" stroke="rgba(0,200,200,0.5)" strokeWidth="1" />
          <circle cx="0" cy="-12" r={4 + (tick % 2) * 1} fill="rgba(0,220,220,0.7)" />
          {/* Wheels */}
          <ellipse cx="-22" cy="30" rx="10" ry="5" fill="rgba(30,40,55,0.9)" stroke="rgba(0,200,200,0.2)" strokeWidth="1" />
          <ellipse cx="22" cy="30" rx="10" ry="5" fill="rgba(30,40,55,0.9)" stroke="rgba(0,200,200,0.2)" strokeWidth="1" />
          {/* Status light */}
          <circle cx="18" cy="-28" r="4" fill={issueType === 'battery_critical' ? '#ef4444' : 'rgba(0,220,200,0.8)'} opacity={tick % 2 === 0 ? 1 : 0.3} />
        </g>

        {/* Obstacle if applicable */}
        {isObstacle && (
          <g transform="translate(310, 215)">
            <rect x="-18" y="-18" width="36" height="36" rx="3" fill="rgba(239,68,68,0.2)" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x="0" y="5" textAnchor="middle" fontSize="14" fill="#ef4444" fontFamily="monospace">!</text>
          </g>
        )}

        {/* Sensor sweep arc */}
        {!isComms && (
          <path
            d={`M 285 240 L ${285 + 120*Math.cos((tick*15-60)*Math.PI/180)} ${240 + 120*Math.sin((tick*15-60)*Math.PI/180)} A 120 120 0 0 1 ${285 + 120*Math.cos((tick*15)*Math.PI/180)} ${240 + 120*Math.sin((tick*15)*Math.PI/180)} Z`}
            fill="rgba(0,200,200,0.04)"
            stroke="rgba(0,200,200,0.15)"
            strokeWidth="0.5"
          />
        )}

        {/* Static noise effect for comms loss */}
        {isComms && (
          <>
            <rect width="640" height="360" fill="rgba(255,100,0,0.03)" />
            <text x="320" y="170" textAnchor="middle" fontSize="11" fill="rgba(255,100,0,0.6)" fontFamily="monospace">
              {tick % 2 === 0 ? "SIGNAL LOST" : "RECONNECTING..."}
            </text>
          </>
        )}

        {/* Crosshair */}
        <circle cx="285" cy="240" r="60" fill="none" stroke="rgba(0,200,200,0.07)" strokeWidth="1" />
        <line x1="285" y1="195" x2="285" y2="210" stroke="rgba(0,200,200,0.3)" strokeWidth="1" />
        <line x1="285" y1="270" x2="285" y2="285" stroke="rgba(0,200,200,0.3)" strokeWidth="1" />
        <line x1="240" y1="240" x2="255" y2="240" stroke="rgba(0,200,200,0.3)" strokeWidth="1" />
        <line x1="315" y1="240" x2="330" y2="240" stroke="rgba(0,200,200,0.3)" strokeWidth="1" />
      </svg>

      {/* HUD Overlays */}
      <div className="absolute top-3 left-3 text-[10px] font-mono text-primary/80 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 font-bold">LIVE FEED</span>
        </div>
        <div className="text-primary/60">{robotId} / CAM-01</div>
        <div className="text-primary/50">{location}</div>
      </div>

      <div className="absolute top-3 right-3 text-[10px] font-mono text-primary/60 text-right space-y-0.5">
        <div>{dateStr}</div>
        <div className="font-bold text-primary/80">{timeStr}</div>
        <div className="text-primary/40">UTC+0</div>
      </div>

      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-5 h-5 border-l-2 border-t-2 border-primary/40" />
      <div className="absolute top-2 right-2 w-5 h-5 border-r-2 border-t-2 border-primary/40" />
      <div className="absolute bottom-2 left-2 w-5 h-5 border-l-2 border-b-2 border-primary/40" />
      <div className="absolute bottom-2 right-2 w-5 h-5 border-r-2 border-b-2 border-primary/40" />

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-primary/40 tracking-widest">
        FEED-ENCRYPTED · AES-256
      </div>
    </div>
  );
}

function AISuggestionsPanel({ issueType, severity }: { issueType: string; severity: string }) {
  const suggestions = getAISuggestions(issueType, severity);
  const priorityStyle = {
    high: "border-red-500/30 bg-red-500/5",
    medium: "border-amber-500/30 bg-amber-500/5",
    low: "border-primary/20 bg-primary/5",
  };
  const priorityBadge = {
    high: "text-red-400 bg-red-500/15 border-red-500/30",
    medium: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    low: "text-primary bg-primary/15 border-primary/30",
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-mono text-primary uppercase mb-4 flex items-center gap-2">
        <Brain className="w-4 h-4" /> AI Suggested Actions
        <span className="ml-auto text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border">
          RULE-BASED
        </span>
      </h3>
      <div className="space-y-3">
        {suggestions.map((sug, i) => (
          <div key={i} className={`rounded-md border p-3 ${priorityStyle[sug.priority]}`}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <Zap className={`w-3.5 h-3.5 flex-shrink-0 ${sug.priority === 'high' ? 'text-red-400' : sug.priority === 'medium' ? 'text-amber-400' : 'text-primary'}`} />
                <span className="text-sm font-medium text-foreground">{sug.action}</span>
              </div>
              <span className={`flex-shrink-0 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${priorityBadge[sug.priority]}`}>
                {sug.priority}
              </span>
            </div>
            <p className="text-xs text-muted-foreground pl-5 leading-relaxed">{sug.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IncidentDetail() {
  const [, params] = useRoute("/incidents/:id");
  const id = params?.id || "";
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const assignRef = useRef<HTMLDivElement>(null);

  const { simulatedIncidents, removeSimulatedIncident } = useSimulatedAlerts();
  const isSimulated = id.startsWith("SIM-");
  const simulatedData = isSimulated ? simulatedIncidents.find(inc => inc.id === id) : null;

  const { data: apiData, isLoading } = useGetIncident(id, {
    query: { enabled: !!id && !isSimulated, queryKey: ['/api/incidents', id] }
  });

  const incident = isSimulated ? simulatedData : apiData;
  const updateIncident = useUpdateIncident();

  const [localAssignee, setLocalAssignee] = useState<string>(() =>
    incident?.assignedTo || "Unassigned"
  );

  useEffect(() => {
    if (incident?.assignedTo) setLocalAssignee(incident.assignedTo);
    else setLocalAssignee("Unassigned");
  }, [incident?.assignedTo]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (assignRef.current && !assignRef.current.contains(e.target as Node)) setAssignOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!incident && isLoading) {
    return (
      <div className="p-8 flex flex-col gap-6">
        <div className="h-16 bg-secondary/50 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-secondary/50 rounded-lg animate-pulse" />
            <div className="h-48 bg-secondary/50 rounded-lg animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-secondary/50 rounded-lg animate-pulse" />
            <div className="h-48 bg-secondary/50 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Incident Not Found</h2>
        <Button onClick={() => setLocation("/")} variant="outline">Return to Dashboard</Button>
      </div>
    );
  }

  const handleAction = (action: keyof typeof UpdateIncidentBodyActionTaken) => {
    if (isSimulated) {
      removeSimulatedIncident(id);
      toast({ title: "Action Executed", description: `Simulated incident resolved via ${action}.` });
      setLocation("/");
      return;
    }
    updateIncident.mutate({ id, data: { status: "resolved", actionTaken: action } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetIncidentLogQueryKey() });
        toast({ title: "Action Executed", description: `Incident ${incident.robotId} resolved via ${action}.` });
        setLocation("/");
      },
      onError: () => {
        toast({ title: "Action Failed", description: "Failed to communicate with robot.", variant: "destructive" });
      },
    });
  };

  const handleAssign = (operator: string) => {
    setLocalAssignee(operator);
    setAssignOpen(false);
    if (!isSimulated) {
      updateIncident.mutate({ id, data: { assignedTo: operator === "Unassigned" ? null : operator } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/incidents', id] });
          toast({ title: operator === "Unassigned" ? "Assignment cleared" : `Assigned to ${operator}`, description: operator === "Unassigned" ? "Incident is now unassigned." : "Operator notified." });
        },
      });
    } else {
      toast({ title: operator === "Unassigned" ? "Assignment cleared" : `Assigned to ${operator}`, description: "Simulated assignment updated." });
    }
  };

  const isResolved = incident.status === "resolved";

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="w-8 h-8 rounded border-border flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-xl font-bold tracking-tight font-mono">{incident.robotId}</h1>
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>
        <div className="flex items-center gap-3">
          <CountdownTimer timestamp={incident.timestamp} severity={incident.severity} />
          <div className="flex items-center text-sm font-mono text-muted-foreground bg-secondary px-3 py-1 rounded">
            <IncidentTimer timestamp={incident.timestamp} />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
              <div className="p-3 border-b border-border bg-secondary/50 flex justify-between items-center text-xs font-mono uppercase">
                <span className="flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /> Camera Feed</span>
                <span className="text-red-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE · REC</span>
              </div>
              <CameraFeed robotId={incident.robotId} location={incident.location} issueType={incident.issueType} />
            </div>

            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-mono text-muted-foreground uppercase mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Incident Report
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Issue Type</div>
                  <div className="text-lg font-medium">{incident.issueType.replace(/_/g, ' ').toUpperCase()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Location</div>
                  <div className="text-md">{incident.location}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Description</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{incident.description}</p>
                </div>
                {incident.resolvedAt && incident.actionTaken && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Resolved Via</div>
                    <div className="text-sm capitalize text-emerald-400">{incident.actionTaken.replace(/_/g, ' ')}</div>
                  </div>
                )}
              </div>
            </div>

            {!isResolved && (
              <AISuggestionsPanel issueType={incident.issueType} severity={incident.severity} />
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-mono text-muted-foreground uppercase mb-4 flex items-center gap-2">
                <User className="w-4 h-4" /> Assignment
              </h3>
              <div ref={assignRef} className="relative">
                <button
                  onClick={() => setAssignOpen(v => !v)}
                  disabled={isResolved}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary/50 border border-border rounded hover:border-primary/40 hover:bg-secondary transition-colors text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    {localAssignee !== "Unassigned" ? (
                      <div className={`w-6 h-6 rounded-full ${OPERATOR_COLORS[localAssignee] || 'bg-zinc-600'} flex items-center justify-center text-[9px] font-bold text-white`}>
                        {OPERATOR_INITIALS[localAssignee] || '??'}
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] text-muted-foreground">—</div>
                    )}
                    <span className={localAssignee === "Unassigned" ? "text-muted-foreground" : "text-foreground"}>{localAssignee}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${assignOpen ? "rotate-180" : ""}`} />
                </button>
                {assignOpen && (
                  <div className="absolute top-full mt-1 left-0 w-full bg-card border border-border rounded shadow-xl z-10 overflow-hidden py-1">
                    {OPERATORS.map(op => (
                      <button
                        key={op}
                        onClick={() => handleAssign(op)}
                        className={`w-full text-left px-3 py-2 text-sm font-mono flex items-center gap-2.5 hover:bg-secondary/70 transition-colors ${localAssignee === op ? "text-primary bg-primary/5" : "text-foreground"}`}
                      >
                        <div className={`w-6 h-6 rounded-full ${OPERATOR_COLORS[op] || 'bg-zinc-700'} flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0`}>
                          {OPERATOR_INITIALS[op] || '--'}
                        </div>
                        {op}
                        {localAssignee === op && <span className="ml-auto text-primary text-[10px]">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-mono text-muted-foreground uppercase mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Telemetry Data
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm"><Battery className="w-4 h-4 text-muted-foreground" /> Battery</div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${incident.sensorData.battery < 20 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${incident.sensorData.battery}%` }} />
                    </div>
                    <span className="text-xs font-mono w-8 text-right">{Math.round(incident.sensorData.battery)}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm"><Signal className="w-4 h-4 text-muted-foreground" /> Signal</div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${incident.sensorData.signalStrength}%` }} />
                    </div>
                    <span className="text-xs font-mono w-8 text-right">{Math.round(incident.sensorData.signalStrength)}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm"><Thermometer className="w-4 h-4 text-muted-foreground" /> Temp</div>
                  <span className={`text-xs font-mono ${incident.sensorData.temperature > 60 ? 'text-red-400' : 'text-amber-500'}`}>{incident.sensorData.temperature}°C</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
                  <div className="text-sm text-muted-foreground">Speed</div>
                  <span className="text-xs font-mono">{incident.sensorData.speed.toFixed(1)} m/s</span>
                </div>
                {incident.sensorData.obstacleDistance !== undefined && incident.sensorData.obstacleDistance !== null && (
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div className="text-sm text-muted-foreground">Obstacle Dist</div>
                    <span className="text-xs font-mono text-red-400">{incident.sensorData.obstacleDistance.toFixed(2)} m</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-primary/20 rounded-lg p-5 shadow-sm shadow-primary/5">
              <h3 className="text-sm font-mono text-primary uppercase mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Tactical Commands
              </h3>
              <div className="flex flex-col gap-3">
                <Button onClick={() => handleAction("reroute")} disabled={isResolved} variant="outline" className="w-full justify-start font-mono uppercase bg-secondary/50 hover:bg-secondary border-border hover:border-blue-500/50 hover:text-blue-300 transition-all">
                  <Navigation className="w-4 h-4 mr-3 text-blue-400" />Reroute Path
                </Button>
                <Button onClick={() => handleAction("pause")} disabled={isResolved} variant="outline" className="w-full justify-start font-mono uppercase bg-secondary/50 hover:bg-secondary border-border hover:border-amber-500/50 hover:text-amber-300 transition-all">
                  <PauseOctagon className="w-4 h-4 mr-3 text-amber-500" />Halt Operation
                </Button>
                <Button onClick={() => handleAction("manual_override")} disabled={isResolved} className="w-full justify-start font-mono uppercase bg-primary hover:bg-primary/90 text-primary-foreground border-transparent transition-all">
                  <Bot className="w-4 h-4 mr-3" />Manual Override
                </Button>
                <Button onClick={() => handleAction("escalate")} disabled={isResolved} variant="destructive" className="w-full justify-start font-mono uppercase mt-1 transition-all">
                  <AlertTriangle className="w-4 h-4 mr-3" />Escalate to L2
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

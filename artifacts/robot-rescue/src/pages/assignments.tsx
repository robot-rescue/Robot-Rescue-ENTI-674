import { useState } from "react";
import { Link } from "wouter";
import { useListIncidents, useUpdateIncident, getListIncidentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSimulatedAlerts } from "../components/simulated-alerts-provider";
import { SeverityBadge, StatusBadge } from "../components/ui-helpers";
import { Users, ChevronDown, MapPin, CheckCircle2, UserMinus, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export const OPERATORS = [
  { id: "unassigned", name: "Unassigned", initials: "--", color: "bg-zinc-600" },
  { id: "alex-chen", name: "Alex Chen", initials: "AC", color: "bg-cyan-600" },
  { id: "sarah-kim", name: "Sarah Kim", initials: "SK", color: "bg-violet-600" },
  { id: "jordan-patel", name: "Jordan Patel", initials: "JP", color: "bg-amber-600" },
  { id: "darren-watkins", name: "Darren Watkins Jr.", initials: "DW", color: "bg-emerald-600" },
];

function OperatorAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const op = OPERATORS.find(o => o.name === name) || OPERATORS[0];
  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div className={`${sz} rounded-full ${op.color} flex items-center justify-center font-mono font-bold text-white flex-shrink-0`} title={op.name}>
      {op.initials}
    </div>
  );
}

function AssignmentDropdown({
  currentAssignee,
  onAssign,
  disabled,
}: {
  currentAssignee: string | null;
  onAssign: (name: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const displayName = currentAssignee || "Unassigned";

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-mono transition-all ${
          disabled
            ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
            : currentAssignee
            ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400"
            : "border-border bg-secondary/50 hover:border-primary/40 hover:bg-secondary text-muted-foreground hover:text-foreground"
        }`}
      >
        {currentAssignee ? (
          <OperatorAvatar name={currentAssignee} />
        ) : (
          <UserMinus className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">{displayName}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-lg shadow-2xl z-50 overflow-hidden py-1">
            {OPERATORS.map(op => (
              <button
                key={op.id}
                onClick={() => {
                  onAssign(op.id === "unassigned" ? null : op.name);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-secondary/70 transition-colors text-sm ${
                  (currentAssignee || null) === (op.id === "unassigned" ? null : op.name)
                    ? "text-primary bg-primary/5"
                    : "text-foreground"
                }`}
              >
                <div className={`w-7 h-7 rounded-full ${op.color} flex items-center justify-center font-mono font-bold text-[10px] text-white flex-shrink-0`}>
                  {op.initials}
                </div>
                <span>{op.name}</span>
                {(currentAssignee || null) === (op.id === "unassigned" ? null : op.name) && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Assignments() {
  const { data: apiIncidents = [], isLoading } = useListIncidents({ status: "active" });
  const { simulatedIncidents } = useSimulatedAlerts();
  const updateIncident = useUpdateIncident();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const allActive = [...apiIncidents, ...simulatedIncidents];
  const assignedCount = allActive.filter(i => i.assignedTo).length;
  const unassignedCount = allActive.length - assignedCount;

  const handleAssign = (incidentId: string, robotId: string, isSimulated: boolean, operator: string | null) => {
    if (isSimulated) {
      toast({
        title: operator ? `Assigned to ${operator}` : "Assignment cleared",
        description: `Simulated incident for ${robotId} updated.`,
      });
      return;
    }
    updateIncident.mutate(
      { id: incidentId, data: { assignedTo: operator } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
          toast({
            title: operator ? `Assigned to ${operator}` : "Assignment cleared",
            description: `${robotId} incident updated.`,
          });
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Assignments
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">OPERATOR TASK MANAGEMENT</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">ASSIGNED</span>
            <span className="text-emerald-500 font-bold">{assignedCount}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">UNASSIGNED</span>
            <span className="text-amber-500 font-bold">{unassignedCount}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">TOTAL</span>
            <span className="font-bold">{allActive.length}</span>
          </div>
        </div>
      </header>

      <div className="px-6 py-4 border-b border-border/50 bg-secondary/10">
        <div className="flex items-center gap-3 flex-wrap">
          {OPERATORS.slice(1).map(op => {
            const count = allActive.filter(i => i.assignedTo === op.name).length;
            return (
              <div key={op.id} className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-md text-xs font-mono">
                <div className={`w-5 h-5 rounded-full ${op.color} flex items-center justify-center text-[9px] font-bold text-white`}>
                  {op.initials}
                </div>
                <span className="text-muted-foreground">{op.name.split(' ')[0]}</span>
                <span className={`font-bold ${count > 0 ? 'text-foreground' : 'text-muted-foreground/50'}`}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading && allActive.length === 0 ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-secondary/50 rounded-lg border border-border animate-pulse" />)}
          </div>
        ) : allActive.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">No active incidents</p>
            <p className="text-xs mt-1">All robots are operating normally.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground w-28">Robot</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Issue</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Severity</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {allActive.map((incident, idx) => {
                  const isSimulated = incident.id.startsWith("SIM-");
                  return (
                    <motion.tr
                      key={incident.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-border/40 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/incidents/${incident.id}`} className="flex items-center gap-1.5 group">
                          <span className="font-mono font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                            {incident.robotId}
                          </span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        </Link>
                        {isSimulated && (
                          <span className="text-[9px] font-mono text-primary/60">SIM</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                        {incident.issueType.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate max-w-32">{incident.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={incident.severity} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end">
                          <AssignmentDropdown
                            currentAssignee={incident.assignedTo ?? null}
                            onAssign={(op) => handleAssign(incident.id, incident.robotId, isSimulated, op)}
                            disabled={incident.status === "resolved"}
                          />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

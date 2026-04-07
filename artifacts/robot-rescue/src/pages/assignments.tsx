import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useListIncidents, useUpdateIncident, getListIncidentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSimulatedAlerts } from "../components/simulated-alerts-provider";
import { SeverityBadge, StatusBadge, OperatorChip } from "../components/ui-helpers";
import { SearchFilterBar, SeverityFilter, SortKey } from "../components/search-filter-bar";
import { Users, ChevronDown, MapPin, CheckCircle2, UserMinus, ExternalLink, Shuffle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export const OPERATORS = [
  { id: "unassigned",      name: "Unassigned",         initials: "--", color: "bg-zinc-600" },
  { id: "alex-chen",       name: "Alex Chen",           initials: "AC", color: "bg-cyan-600" },
  { id: "sarah-kim",       name: "Sarah Kim",           initials: "SK", color: "bg-violet-600" },
  { id: "jordan-patel",    name: "Jordan Patel",        initials: "JP", color: "bg-amber-600" },
  { id: "darren-watkins",  name: "Darren Watkins Jr.",  initials: "DW", color: "bg-emerald-600" },
];

const ACTIVE_OPS = OPERATORS.slice(1);
const SEV_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function AssignmentDropdown({
  currentAssignee,
  workloads,
  onAssign,
  disabled,
}: {
  currentAssignee: string | null;
  workloads: Record<string, number>;
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
          <OperatorChip name={currentAssignee} size="sm" />
        ) : (
          <>
            <UserMinus className="w-4 h-4" />
            <span className="hidden sm:inline text-muted-foreground">{displayName}</span>
          </>
        )}
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-60 bg-card border border-border rounded-lg shadow-2xl z-50 overflow-hidden py-1">
            {OPERATORS.map(op => {
              const load = op.id !== "unassigned" ? (workloads[op.name] ?? 0) : null;
              const isCurrent = (currentAssignee || null) === (op.id === "unassigned" ? null : op.name);
              return (
                <button
                  key={op.id}
                  onClick={() => { onAssign(op.id === "unassigned" ? null : op.name); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-secondary/70 transition-colors text-sm ${isCurrent ? "text-primary bg-primary/5" : "text-foreground"}`}
                >
                  <div className={`w-7 h-7 rounded-full ${op.color} flex items-center justify-center font-mono font-bold text-[10px] text-white flex-shrink-0`}>
                    {op.initials}
                  </div>
                  <span className="flex-1">{op.name}</span>
                  {load !== null && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      load === 0 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                      load >= 3 ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                      'text-amber-400 border-amber-500/30 bg-amber-500/10'
                    }`}>
                      {load}
                    </span>
                  )}
                  {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function Assignments() {
  const { data: apiIncidents = [], isLoading } = useListIncidents({ status: "active" });
  const { simulatedIncidents, manualAssign, forceAutoAssign } = useSimulatedAlerts();
  const updateIncident = useUpdateIncident();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const allActive = useMemo(() => [...apiIncidents, ...simulatedIncidents], [apiIncidents, simulatedIncidents]);

  const workloads = useMemo(() => {
    const wl: Record<string, number> = {};
    for (const op of ACTIVE_OPS) wl[op.name] = 0;
    for (const inc of allActive) {
      if (inc.assignedTo && wl[inc.assignedTo] !== undefined) wl[inc.assignedTo]++;
    }
    return wl;
  }, [allActive]);

  const filtered = useMemo(() => {
    let list = allActive;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(i =>
      i.robotId.toLowerCase().includes(q) ||
      i.issueType.replace(/_/g, ' ').toLowerCase().includes(q) ||
      i.location.toLowerCase().includes(q) ||
      (i.assignedTo || '').toLowerCase().includes(q)
    );
    if (severityFilter !== "all") list = list.filter(i => i.severity === severityFilter);
    if (assigneeFilter === "unassigned") list = list.filter(i => !i.assignedTo);
    else if (assigneeFilter !== "all") list = list.filter(i => i.assignedTo === assigneeFilter);
    list = [...list].sort((a, b) => {
      if (sortKey === "severity") return (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3);
      if (sortKey === "oldest") return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    return list;
  }, [allActive, query, severityFilter, sortKey, assigneeFilter]);

  const assignedCount = allActive.filter(i => i.assignedTo).length;
  const unassignedCount = allActive.length - assignedCount;

  const handleAssign = (incidentId: string, robotId: string, isSimulated: boolean, operator: string | null) => {
    if (isSimulated) {
      manualAssign(incidentId, operator);
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

  const handleAutoAssign = () => {
    const unassigned = allActive.filter(i => !i.assignedTo);
    if (unassigned.length === 0) {
      toast({ title: "All incidents assigned", description: "No unassigned incidents to distribute." });
      return;
    }
    // Assign API incidents manually
    for (const inc of unassigned.filter(i => !i.id.startsWith("SIM-"))) {
      const leastBusy = ACTIVE_OPS.reduce((a, b) =>
        (workloads[a.name] ?? 0) <= (workloads[b.name] ?? 0) ? a : b
      );
      handleAssign(inc.id, inc.robotId, false, leastBusy.name);
    }
    // Simulated incidents use the context's forceAutoAssign
    forceAutoAssign();
    toast({
      title: `Auto-assigned ${unassigned.length} incident${unassigned.length > 1 ? "s" : ""}`,
      description: "Distributed to least-loaded operators.",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Assignments
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">OPERATOR TASK MANAGEMENT</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
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
          {unassignedCount > 0 && (
            <button
              onClick={handleAutoAssign}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-mono font-bold transition-all"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Auto Assign
            </button>
          )}
        </div>
      </header>

      {/* Operator workload pills — clickable to filter */}
      <div className="px-6 py-3 border-b border-border/50 bg-secondary/10 flex items-center gap-3 flex-wrap">
        {ACTIVE_OPS.map(op => {
          const count = workloads[op.name] ?? 0;
          const isSelected = assigneeFilter === op.name;
          return (
            <button
              key={op.id}
              onClick={() => setAssigneeFilter(isSelected ? "all" : op.name)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all border ${
                isSelected
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'bg-card border-border hover:border-primary/30'
              }`}
            >
              <div className={`w-5 h-5 rounded-full ${op.color} flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0`}>
                {op.initials}
              </div>
              <span className="text-muted-foreground">{op.name.split(' ')[0]}</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                count === 0 ? 'text-muted-foreground/50' :
                count >= 3 ? 'text-red-400 bg-red-500/10' :
                'text-amber-400 bg-amber-500/10'
              }`}>{count}</span>
            </button>
          );
        })}
        {assigneeFilter !== "all" && (
          <button onClick={() => setAssigneeFilter("all")} className="text-xs text-primary hover:text-primary/80 font-mono ml-1 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div className="px-6 py-3 border-b border-border/30 bg-secondary/5">
        <SearchFilterBar
          query={query}
          onQueryChange={setQuery}
          severityFilter={severityFilter}
          onSeverityChange={setSeverityFilter}
          sortKey={sortKey}
          onSortChange={setSortKey}
          resultCount={filtered.length}
          totalCount={allActive.length}
          placeholder="Search by robot ID, issue, or operator..."
        />
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading && allActive.length === 0 ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-secondary/50 rounded-lg border border-border animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">{allActive.length === 0 ? "No active incidents" : "No incidents match your filters"}</p>
            <p className="text-xs mt-1">{allActive.length === 0 ? "All robots are operating normally." : "Try adjusting your search or filters."}</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground w-24">Robot</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Issue</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Severity</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Status</th>
                  <th className="text-right px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((incident, idx) => {
                    const isSimulated = incident.id.startsWith("SIM-");
                    const rowClass = incident.severity === 'high' ? 'list-row-high' : incident.severity === 'medium' ? 'list-row-medium' : 'list-row-low';
                    return (
                      <motion.tr
                        key={incident.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20, scale: 0.98 }}
                        transition={{ duration: 0.25, delay: idx < 6 ? idx * 0.03 : 0 }}
                        className={`border-b border-border/30 alt-row transition-colors ${rowClass}`}
                      >
                        <td className="px-4 py-3">
                          <Link href={`/incidents/${incident.id}`} className="flex items-center gap-1.5 group">
                            <span className="font-mono font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                              {incident.robotId}
                            </span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                          </Link>
                          {isSimulated && <span className="text-[9px] font-mono text-primary/50">SIM</span>}
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
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <StatusBadge status={incident.status} assignedTo={incident.assignedTo} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end">
                            <AssignmentDropdown
                              currentAssignee={incident.assignedTo ?? null}
                              workloads={workloads}
                              onAssign={op => handleAssign(incident.id, incident.robotId, isSimulated, op)}
                              disabled={incident.status === "resolved"}
                            />
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

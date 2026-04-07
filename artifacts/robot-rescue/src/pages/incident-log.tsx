import { useMemo, useState } from "react";
import { useGetIncidentLog } from "@workspace/api-client-react";
import { SeverityBadge, StatusBadge, OperatorChip } from "../components/ui-helpers";
import { useSimulatedAlerts } from "../components/simulated-alerts-provider";
import { SearchFilterBar, SeverityFilter, SortKey } from "../components/search-filter-bar";
import { format, subDays, startOfDay } from "date-fns";
import { ShieldCheck, List, Calendar, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ActionFilter = "all" | "reroute" | "pause" | "manual_override" | "escalate";
type DateRange = "all" | "today" | "7d" | "30d";

export default function IncidentLog() {
  const { data: apiLogs = [], isLoading } = useGetIncidentLog();
  const { resolvedSimIncidents } = useSimulatedAlerts();

  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  // Merge API resolved logs + simulated resolved incidents
  const allLogs = useMemo(() => {
    return [...resolvedSimIncidents, ...apiLogs];
  }, [resolvedSimIncidents, apiLogs]);

  const filtered = useMemo(() => {
    let list = allLogs;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(log =>
        log.robotId.toLowerCase().includes(q) ||
        log.issueType.replace(/_/g, ' ').toLowerCase().includes(q) ||
        (log.actionTaken || '').replace(/_/g, ' ').toLowerCase().includes(q) ||
        (log.location || '').toLowerCase().includes(q) ||
        (log.assignedTo || '').toLowerCase().includes(q)
      );
    }
    if (severityFilter !== "all") list = list.filter(l => l.severity === severityFilter);
    if (actionFilter !== "all") list = list.filter(l => l.actionTaken === actionFilter);
    if (dateRange !== "all") {
      const cutoff = dateRange === "today"
        ? startOfDay(new Date())
        : subDays(new Date(), dateRange === "7d" ? 7 : 30);
      list = list.filter(l => l.resolvedAt && new Date(l.resolvedAt) >= cutoff);
    }
    list = [...list].sort((a, b) => {
      if (sortKey === "severity") {
        const s: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (s[a.severity] ?? 3) - (s[b.severity] ?? 3);
      }
      const ta = a.resolvedAt ? new Date(a.resolvedAt).getTime() : 0;
      const tb = b.resolvedAt ? new Date(b.resolvedAt).getTime() : 0;
      return sortKey === "oldest" ? ta - tb : tb - ta;
    });
    return list;
  }, [allLogs, query, severityFilter, actionFilter, dateRange, sortKey]);

  const hasActiveFilters = query !== "" || severityFilter !== "all" || actionFilter !== "all" || dateRange !== "all";

  const clearFilters = () => {
    setQuery("");
    setSeverityFilter("all");
    setActionFilter("all");
    setDateRange("all");
    setSortKey("newest");
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <List className="w-5 h-5 text-primary" />
            Incident Log
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">HISTORICAL RESOLUTION RECORDS</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">TOTAL RESOLVED</span>
            <span className="font-bold text-emerald-500">{allLogs.length}</span>
          </div>
          {resolvedSimIncidents.length > 0 && (
            <>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">SIMULATED</span>
                <span className="font-bold text-primary">{resolvedSimIncidents.length}</span>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="px-6 py-3 border-b border-border/30 bg-secondary/5 space-y-2">
        <SearchFilterBar
          query={query}
          onQueryChange={setQuery}
          severityFilter={severityFilter}
          onSeverityChange={setSeverityFilter}
          sortKey={sortKey}
          onSortChange={setSortKey}
          resultCount={filtered.length}
          totalCount={allLogs.length}
          placeholder="Search by robot ID, issue, action, operator, or location..."
          extraFilters={
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Date</span>
                <div className="flex gap-1">
                  {(["all", "today", "7d", "30d"] as DateRange[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setDateRange(r)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all ${
                        dateRange === r
                          ? "bg-primary/20 text-primary border-primary/40"
                          : "text-muted-foreground border-transparent hover:border-border"
                      }`}
                    >
                      {r === "all" ? "All time" : r === "today" ? "Today" : r === "7d" ? "7 days" : "30 days"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Action</span>
                <div className="flex gap-1 flex-wrap">
                  {(["all", "reroute", "pause", "manual_override", "escalate"] as ActionFilter[]).map(act => (
                    <button
                      key={act}
                      onClick={() => setActionFilter(act)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all capitalize ${
                        actionFilter === act
                          ? "bg-primary/20 text-primary border-primary/40"
                          : "text-muted-foreground border-transparent hover:border-border"
                      }`}
                    >
                      {act.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          }
        />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground w-24">Robot</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Issue</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Location</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Severity</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Operator</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell w-24">Res. Time</th>
                <th className="text-right px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Resolved At</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && allLogs.length === 0 ? (
                <>
                  {[1,2,3,4,5].map(i => (
                    <tr key={i} className="border-b border-border/50">
                      {[1,2,3,4,5,6,7,8].map(j => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-secondary/60 rounded animate-pulse w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 text-center text-muted-foreground font-mono text-sm">
                    {hasActiveFilters ? (
                      <div>
                        <p>No records match your search.</p>
                        <button onClick={clearFilters} className="mt-2 text-primary text-xs hover:underline">
                          Clear filters
                        </button>
                      </div>
                    ) : "No historical logs found."}
                  </td>
                </tr>
              ) : (
                <AnimatePresence initial={false}>
                  {filtered.map((log, idx) => {
                    const rowClass = log.severity === 'high' ? 'list-row-high' : log.severity === 'medium' ? 'list-row-medium' : 'list-row-low';
                    const isSim = log.id.startsWith('SIM-');
                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, delay: idx < 5 ? idx * 0.03 : 0 }}
                        className={`border-b border-border/30 alt-row transition-colors ${rowClass}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-sm text-foreground">{log.robotId}</div>
                          {isSim && <div className="text-[9px] font-mono text-primary/50">SIM</div>}
                        </td>
                        <td className="px-4 py-3 text-sm capitalize text-foreground">
                          {log.issueType.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                          {log.location}
                        </td>
                        <td className="px-4 py-3">
                          <SeverityBadge severity={log.severity} />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <OperatorChip name={log.assignedTo} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="capitalize">{log.actionTaken?.replace(/_/g, ' ') || 'Resolved'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {log.responseTimeSeconds ? `${log.responseTimeSeconds}s` : '--'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                          {log.resolvedAt ? format(new Date(log.resolvedAt), "MMM d, HH:mm") : '--'}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

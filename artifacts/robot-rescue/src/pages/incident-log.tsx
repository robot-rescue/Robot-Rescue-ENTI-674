import { useMemo, useState } from "react";
import { useGetIncidentLog } from "@workspace/api-client-react";
import { SeverityBadge } from "../components/ui-helpers";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";

type SeverityFilter = "all" | "high" | "medium" | "low";
type ActionFilter = "all" | "reroute" | "pause" | "manual_override" | "escalate";

export default function IncidentLog() {
  const { data: logs = [], isLoading } = useGetIncidentLog();
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = logs;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(log =>
        log.robotId.toLowerCase().includes(q) ||
        log.issueType.replace(/_/g, ' ').toLowerCase().includes(q) ||
        (log.actionTaken || '').replace(/_/g, ' ').toLowerCase().includes(q) ||
        (log.location || '').toLowerCase().includes(q)
      );
    }
    if (severityFilter !== "all") list = list.filter(l => l.severity === severityFilter);
    if (actionFilter !== "all") list = list.filter(l => l.actionTaken === actionFilter);
    return list;
  }, [logs, query, severityFilter, actionFilter]);

  const hasActiveFilters = query !== "" || severityFilter !== "all" || actionFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setSeverityFilter("all");
    setActionFilter("all");
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Incident Log</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">HISTORICAL RESOLUTION RECORDS</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-56 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9 bg-secondary/50 border-border h-9 text-sm font-mono focus-visible:ring-primary/50"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 h-9 px-3 rounded border text-xs font-mono transition-colors ${showFilters || (severityFilter !== "all" || actionFilter !== "all") ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {(severityFilter !== "all" || actionFilter !== "all") && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                {(severityFilter !== "all" ? 1 : 0) + (actionFilter !== "all" ? 1 : 0)}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground font-mono flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </header>

      {showFilters && (
        <div className="px-6 py-3 border-b border-border/50 bg-secondary/10 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Severity</span>
            <div className="flex gap-1">
              {(["all", "high", "medium", "low"] as SeverityFilter[]).map(sev => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors capitalize ${severityFilter === sev
                    ? sev === "high" ? "bg-red-500/20 text-red-400 border-red-500/40"
                      : sev === "medium" ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : sev === "low" ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                      : "bg-primary/20 text-primary border-primary/40"
                    : "text-muted-foreground border-transparent hover:border-border"}`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Action</span>
            <div className="flex gap-1 flex-wrap">
              {(["all", "reroute", "pause", "manual_override", "escalate"] as ActionFilter[]).map(act => (
                <button
                  key={act}
                  onClick={() => setActionFilter(act)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors capitalize ${actionFilter === act ? "bg-primary/20 text-primary border-primary/40" : "text-muted-foreground border-transparent hover:border-border"}`}
                >
                  {act.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {filtered.length > 0 && (
          <div className="mb-3 text-xs font-mono text-muted-foreground">
            Showing {filtered.length} of {logs.length} records
            {hasActiveFilters && <span className="text-primary ml-1">(filtered)</span>}
          </div>
        )}
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs font-bold uppercase tracking-wider w-[120px]">Robot ID</TableHead>
                <TableHead className="font-mono text-xs font-bold uppercase tracking-wider">Issue Type</TableHead>
                <TableHead className="font-mono text-xs font-bold uppercase tracking-wider">Location</TableHead>
                <TableHead className="font-mono text-xs font-bold uppercase tracking-wider">Severity</TableHead>
                <TableHead className="font-mono text-xs font-bold uppercase tracking-wider">Action Taken</TableHead>
                <TableHead className="font-mono text-xs font-bold uppercase tracking-wider">Resolution Time</TableHead>
                <TableHead className="font-mono text-xs font-bold uppercase tracking-wider text-right">Resolved At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  {[1,2,3,4,5].map(i => (
                    <TableRow key={i} className="border-border/50">
                      {[1,2,3,4,5,6,7].map(j => (
                        <TableCell key={j}><div className="h-4 bg-secondary/60 rounded animate-pulse w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-mono text-sm">
                    {hasActiveFilters ? (
                      <div>
                        <p>No records match your search.</p>
                        <button onClick={clearFilters} className="mt-2 text-primary text-xs hover:underline">Clear filters</button>
                      </div>
                    ) : "No historical logs found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow key={log.id} className="border-border/50 hover:bg-secondary/40 transition-colors">
                    <TableCell className="font-mono font-medium">{log.robotId}</TableCell>
                    <TableCell className="text-sm">{log.issueType.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.location}</TableCell>
                    <TableCell><SeverityBadge severity={log.severity} /></TableCell>
                    <TableCell className="text-sm capitalize text-emerald-400 flex items-center gap-1.5 mt-2">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {log.actionTaken?.replace(/_/g, ' ') || 'Resolved'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.responseTimeSeconds ? `${log.responseTimeSeconds}s` : '--'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {log.resolvedAt ? format(new Date(log.resolvedAt), "MMM d, HH:mm:ss") : '--'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

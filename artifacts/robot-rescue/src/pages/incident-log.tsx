import { useMemo, useState } from "react";
import { useGetIncidentLog } from "@workspace/api-client-react";
import { SeverityBadge } from "../components/ui-helpers";
import { SearchFilterBar, SeverityFilter, SortKey } from "../components/search-filter-bar";
import { format, subDays, startOfDay } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, List, Calendar } from "lucide-react";

type ActionFilter = "all" | "reroute" | "pause" | "manual_override" | "escalate";
type DateRange = "all" | "today" | "7d" | "30d";

export default function IncidentLog() {
  const { data: logs = [], isLoading } = useGetIncidentLog();
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");

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
    if (dateRange !== "all") {
      const cutoff = dateRange === "today"
        ? startOfDay(new Date())
        : subDays(new Date(), dateRange === "7d" ? 7 : 30);
      list = list.filter(l => l.resolvedAt && new Date(l.resolvedAt) >= cutoff);
    }
    list = [...list].sort((a, b) => {
      if (sortKey === "severity") {
        const s: Record<string,number> = { high: 0, medium: 1, low: 2 };
        return s[a.severity] - s[b.severity];
      }
      const ta = a.resolvedAt ? new Date(a.resolvedAt).getTime() : 0;
      const tb = b.resolvedAt ? new Date(b.resolvedAt).getTime() : 0;
      return sortKey === "oldest" ? ta - tb : tb - ta;
    });
    return list;
  }, [logs, query, severityFilter, actionFilter, dateRange, sortKey]);

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
            <List className="w-5 h-5 text-primary" /> Incident Log
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">HISTORICAL RESOLUTION RECORDS</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-muted-foreground">TOTAL RESOLVED</span>
          <span className="font-bold text-emerald-500">{logs.length}</span>
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
          totalCount={logs.length}
          placeholder="Search by robot ID, issue, action, or location..."
          extraFilters={
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Date Range</span>
                <div className="flex gap-1">
                  {(["all", "today", "7d", "30d"] as DateRange[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setDateRange(r)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all ${
                        dateRange === r ? "bg-primary/20 text-primary border-primary/40" : "text-muted-foreground border-transparent hover:border-border"
                      }`}
                    >
                      {r === "all" ? "All time" : r === "today" ? "Today" : r === "7d" ? "Last 7d" : "Last 30d"}
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
                        actionFilter === act ? "bg-primary/20 text-primary border-primary/40" : "text-muted-foreground border-transparent hover:border-border"
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
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs font-bold uppercase tracking-wider w-[110px]">Robot ID</TableHead>
                <TableHead className="font-mono text-xs font-bold uppercase tracking-wider">Issue Type</TableHead>
                <TableHead className="font-mono text-xs font-bold uppercase tracking-wider hidden md:table-cell">Location</TableHead>
                <TableHead className="font-mono text-xs font-bold uppercase tracking-wider">Severity</TableHead>
                <TableHead className="font-mono text-xs font-bold uppercase tracking-wider">Action Taken</TableHead>
                <TableHead className="font-mono text-xs font-bold uppercase tracking-wider">Res. Time</TableHead>
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
                filtered.map((log, idx) => {
                  const rowClass = log.severity === 'high' ? 'list-row-high' : log.severity === 'medium' ? 'list-row-medium' : 'list-row-low';
                  return (
                    <TableRow key={log.id} className={`border-border/30 alt-row transition-colors ${rowClass}`}>
                      <TableCell className="font-mono font-bold text-sm">{log.robotId}</TableCell>
                      <TableCell className="text-sm capitalize">{log.issueType.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{log.location}</TableCell>
                      <TableCell><SeverityBadge severity={log.severity} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="capitalize">{log.actionTaken?.replace(/_/g, ' ') || 'Resolved'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.responseTimeSeconds ? `${log.responseTimeSeconds}s` : '--'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {log.resolvedAt ? format(new Date(log.resolvedAt), "MMM d, HH:mm") : '--'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

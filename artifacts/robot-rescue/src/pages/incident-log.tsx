import { useGetIncidentLog } from "@workspace/api-client-react";
import { SeverityBadge } from "../components/ui-helpers";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function IncidentLog() {
  const { data: logs = [], isLoading } = useGetIncidentLog();

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Incident Log</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">HISTORICAL RESOLUTION RECORDS</p>
        </div>
        <div className="w-64 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search records..." 
            className="pl-9 bg-secondary/50 border-border h-9 text-sm font-mono focus-visible:ring-primary/50" 
          />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
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
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-mono text-sm">
                    Loading records...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-mono text-sm">
                    No historical logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="border-border/50 hover:bg-secondary/40 transition-colors">
                    <TableCell className="font-mono font-medium">{log.robotId}</TableCell>
                    <TableCell className="text-sm">{log.issueType.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.location}</TableCell>
                    <TableCell><SeverityBadge severity={log.severity} /></TableCell>
                    <TableCell className="text-sm capitalize text-emerald-400 flex items-center gap-1.5 mt-2">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {log.actionTaken?.replace('_', ' ') || 'Resolved'}
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

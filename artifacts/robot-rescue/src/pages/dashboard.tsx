import { useEffect, useMemo, useRef } from "react";
import { Link } from "wouter";
import { useListIncidents } from "@workspace/api-client-react";
import { useSimulatedAlerts } from "../components/simulated-alerts-provider";
import { IncidentTimer, SeverityBadge, StatusBadge } from "../components/ui-helpers";
import { Activity, AlertOctagon, Bot, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { simulatedIncidents, markAsRead } = useSimulatedAlerts();
  const { toast } = useToast();
  const prevSimCount = useRef(simulatedIncidents.length);
  
  const { data: apiIncidents = [], isLoading } = useListIncidents({ status: "active" });
  
  useEffect(() => {
    if (simulatedIncidents.length > prevSimCount.current) {
      const newest = simulatedIncidents[0];
      if (newest) {
        toast({
          title: `New alert: ${newest.robotId} — ${newest.issueType.replace(/_/g, ' ')}`,
          description: `Location: ${newest.location}`,
          variant: newest.severity === 'high' ? 'destructive' : 'default',
        });
      }
    }
    prevSimCount.current = simulatedIncidents.length;
    markAsRead();
  }, [markAsRead, simulatedIncidents, toast]);

  const allActiveIncidents = useMemo(() => {
    // Combine API incidents and simulated ones, sorting by newest first
    const combined = [...simulatedIncidents, ...apiIncidents];
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [apiIncidents, simulatedIncidents]);

  const highSeverityCount = allActiveIncidents.filter(i => i.severity === 'high').length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-border/50 bg-secondary/20 flex items-center justify-between text-xs font-mono">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">ACTIVE ALERTS</span>
            <span className="font-bold text-foreground">{allActiveIncidents.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">CRITICAL</span>
            <span className="font-bold text-red-500">{highSeverityCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-emerald-500">
          <Activity className="w-3 h-3" />
          <span>FLEET NOMINAL</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading && apiIncidents.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-48 bg-secondary/50 rounded-lg border border-border animate-pulse" />
            ))}
          </div>
        ) : allActiveIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bot className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No active alerts</p>
            <p className="text-sm">All robot units are operating normally.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {allActiveIncidents.map((incident) => {
                const severityClass = incident.severity === 'high' ? 'incident-card-high' : incident.severity === 'medium' ? 'incident-card-medium' : 'incident-card-low';
                
                // Calculate progress bar for urgency (60 mins = 100%)
                const elapsedMs = new Date().getTime() - new Date(incident.timestamp).getTime();
                const elapsedMins = elapsedMs / 60000;
                const progressPct = Math.min(100, Math.max(0, (elapsedMins / 60) * 100));
                
                const progressColor = progressPct > 80 ? 'bg-red-500' : progressPct > 40 ? 'bg-amber-500' : 'bg-blue-500';

                return (
                  <motion.div
                    key={incident.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link href={`/incidents/${incident.id}`}>
                      <div className={`group block bg-card/80 backdrop-blur rounded-lg border border-border overflow-hidden hover:border-primary/50 cursor-pointer shadow-sm hover:shadow-primary/10 relative transition-all duration-200 hover:scale-[1.02] ${severityClass}`}>
                        
                        <div className="p-4 border-b border-border/50 flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <AlertOctagon className={`w-5 h-5 ${
                              incident.severity === 'high' ? 'text-red-500 animate-pulse glow-red' : 
                              incident.severity === 'medium' ? 'text-amber-500' : 'text-blue-400'
                            }`} />
                            <span className="font-mono font-bold text-lg text-foreground">{incident.robotId}</span>
                          </div>
                          <SeverityBadge severity={incident.severity} />
                        </div>
                        
                        <div className="p-4 space-y-4">
                          <div>
                            <div className="text-sm font-medium mb-1 truncate text-foreground">
                              {incident.issueType.replace(/_/g, ' ').toUpperCase()}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground font-mono">
                              <MapPin className="w-3 h-3 mr-1" />
                              {incident.location}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2">
                            <StatusBadge status={incident.status} />
                            <IncidentTimer timestamp={incident.timestamp} />
                          </div>
                        </div>
                        
                        <div className="h-1 w-full bg-secondary absolute bottom-0 left-0">
                          <div className={`h-full ${progressColor} transition-all duration-1000`} style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

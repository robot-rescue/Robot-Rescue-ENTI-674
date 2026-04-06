import { useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useListIncidents } from "@workspace/api-client-react";
import { useSimulatedAlerts } from "../components/simulated-alerts-provider";
import { IncidentTimer, SeverityBadge, StatusBadge } from "../components/ui-helpers";
import { Activity, AlertOctagon, ArrowRight, Bot, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const { simulatedIncidents, markAsRead } = useSimulatedAlerts();
  
  const { data: apiIncidents = [], isLoading } = useListIncidents({ status: "active" });
  
  useEffect(() => {
    markAsRead();
  }, [markAsRead, simulatedIncidents.length]);

  const allActiveIncidents = useMemo(() => {
    // Combine API incidents and simulated ones, sorting by newest first
    const combined = [...simulatedIncidents, ...apiIncidents];
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [apiIncidents, simulatedIncidents]);

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Active Alerts</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">MONITORING {allActiveIncidents.length} CRITICAL EVENTS</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-mono bg-secondary px-3 py-1.5 rounded border border-border">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="text-emerald-500">FLEET STATUS: NOMINAL</span>
          </div>
        </div>
      </header>

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
              {allActiveIncidents.map((incident) => (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link href={`/incidents/${incident.id}`}>
                    <div className="group block bg-card rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-colors cursor-pointer shadow-sm hover:shadow-primary/5 relative">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="p-4 border-b border-border/50 flex justify-between items-start bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <AlertOctagon className={`w-5 h-5 ${
                            incident.severity === 'high' ? 'text-red-500 animate-pulse' : 
                            incident.severity === 'medium' ? 'text-amber-500' : 'text-blue-400'
                          }`} />
                          <span className="font-mono font-bold text-lg">{incident.robotId}</span>
                        </div>
                        <SeverityBadge severity={incident.severity} />
                      </div>
                      
                      <div className="p-4 space-y-4">
                        <div>
                          <div className="text-sm font-medium mb-1 truncate">
                            {incident.issueType.replace(/_/g, ' ').toUpperCase()}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground font-mono">
                            <MapPin className="w-3 h-3 mr-1" />
                            {incident.location}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <StatusBadge status={incident.status} />
                          <IncidentTimer timestamp={incident.timestamp} />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

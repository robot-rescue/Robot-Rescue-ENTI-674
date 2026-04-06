import { useRoute, useLocation } from "wouter";
import { useGetIncident, useUpdateIncident, getListIncidentsQueryKey, getGetIncidentLogQueryKey, UpdateIncidentBodyActionTaken } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSimulatedAlerts } from "../components/simulated-alerts-provider";
import { IncidentTimer, SeverityBadge, StatusBadge } from "../components/ui-helpers";
import { 
  ArrowLeft, Battery, Bot, Cpu, Navigation, PauseOctagon, 
  ShieldAlert, Signal, Thermometer, AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function IncidentDetail() {
  const [, params] = useRoute("/incidents/:id");
  const id = params?.id || "";
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { simulatedIncidents, removeSimulatedIncident } = useSimulatedAlerts();
  
  const isSimulated = id.startsWith("SIM-");
  const simulatedData = isSimulated ? simulatedIncidents.find(inc => inc.id === id) : null;

  const { data: apiData, isLoading } = useGetIncident(id, { 
    query: { 
      enabled: !!id && !isSimulated,
      queryKey: ['/api/incidents', id] // fallback, we don't have the exact getter function signature imported if it's tricky, but let's use the standard
    } 
  });

  const incident = isSimulated ? simulatedData : apiData;
  const updateIncident = useUpdateIncident();

  if (!incident && isLoading) {
    return <div className="p-8 flex justify-center"><Bot className="w-8 h-8 animate-spin text-primary" /></div>;
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
      toast({
        title: "Action Executed",
        description: `Simulated incident resolved via ${action}.`,
      });
      setLocation("/");
      return;
    }

    updateIncident.mutate({ 
      id, 
      data: { status: "resolved", actionTaken: action } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetIncidentLogQueryKey() });
        toast({
          title: "Action Executed",
          description: `Incident ${incident.robotId} resolved via ${action}.`,
        });
        setLocation("/");
      },
      onError: () => {
        toast({
          title: "Action Failed",
          description: "Failed to communicate with robot. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const isResolved = incident.status === "resolved";

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="w-8 h-8 rounded border-border">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-4 w-px bg-border mx-2" />
          <h1 className="text-xl font-bold tracking-tight font-mono">{incident.robotId}</h1>
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>
        <div className="flex items-center text-sm font-mono text-muted-foreground bg-secondary px-3 py-1 rounded">
          <IncidentTimer timestamp={incident.timestamp} />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
              <div className="p-3 border-b border-border bg-secondary flex justify-between items-center text-xs font-mono uppercase">
                <span className="flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /> Camera Feed (Live)</span>
                <span className="text-red-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/> REC</span>
              </div>
              <div className="aspect-video bg-gradient-to-br from-zinc-900 to-black relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 scanline opacity-50" />
                <Bot className="w-32 h-32 text-white/5" />
                
                {/* HUD Overlay elements */}
                <div className="absolute top-4 left-4 text-[10px] font-mono text-primary/70">
                  <div>CAM-01 / FRONT</div>
                  <div>COORD: {Math.random().toFixed(4)}, {Math.random().toFixed(4)}</div>
                </div>
                <div className="absolute bottom-4 left-4 flex gap-1">
                  <div className="w-4 h-4 border-l-2 border-b-2 border-primary/50" />
                </div>
                <div className="absolute top-4 right-4 flex gap-1">
                  <div className="w-4 h-4 border-r-2 border-t-2 border-primary/50" />
                </div>
                <div className="absolute bottom-4 right-4 flex gap-1">
                  <div className="w-4 h-4 border-r-2 border-b-2 border-primary/50" />
                </div>
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-primary/30 rounded-full flex items-center justify-center">
                  <div className="w-1 h-1 bg-primary/80 rounded-full" />
                </div>
              </div>
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
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {incident.description || "Automated diagnostic error code triggered safety protocols. Immediate operator attention required to assess physical environment and override systems."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-mono text-muted-foreground uppercase mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Telemetry Data
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Battery className="w-4 h-4 text-muted-foreground" /> Battery
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${incident.sensorData.battery < 20 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${incident.sensorData.battery}%` }} />
                    </div>
                    <span className="text-xs font-mono w-8 text-right">{Math.round(incident.sensorData.battery)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Signal className="w-4 h-4 text-muted-foreground" /> Signal
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${incident.sensorData.signalStrength}%` }} />
                    </div>
                    <span className="text-xs font-mono w-8 text-right">{Math.round(incident.sensorData.signalStrength)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Thermometer className="w-4 h-4 text-muted-foreground" /> Temp
                  </div>
                  <span className="text-xs font-mono text-amber-500">{incident.sensorData.temperature}°C</span>
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
                <Button 
                  onClick={() => handleAction("reroute")} 
                  disabled={isResolved}
                  variant="outline" 
                  className="w-full justify-start font-mono uppercase bg-secondary/50 hover:bg-secondary border-border hover:border-primary/50"
                >
                  <Navigation className="w-4 h-4 mr-3 text-blue-400" />
                  Reroute Path
                </Button>
                
                <Button 
                  onClick={() => handleAction("pause")} 
                  disabled={isResolved}
                  variant="outline" 
                  className="w-full justify-start font-mono uppercase bg-secondary/50 hover:bg-secondary border-border hover:border-amber-500/50"
                >
                  <PauseOctagon className="w-4 h-4 mr-3 text-amber-500" />
                  Halt Operation
                </Button>
                
                <Button 
                  onClick={() => handleAction("manual_override")} 
                  disabled={isResolved}
                  className="w-full justify-start font-mono uppercase bg-primary hover:bg-primary/90 text-primary-foreground border-transparent"
                >
                  <Bot className="w-4 h-4 mr-3" />
                  Manual Override
                </Button>
                
                <Button 
                  onClick={() => handleAction("escalate")} 
                  disabled={isResolved}
                  variant="destructive" 
                  className="w-full justify-start font-mono uppercase mt-2"
                >
                  <AlertTriangle className="w-4 h-4 mr-3" />
                  Escalate to L2
                </Button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

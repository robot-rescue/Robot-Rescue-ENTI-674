import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';
import { Incident, IncidentIssueType, IncidentSeverity, IncidentStatus } from '@workspace/api-client-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  incident: Incident;
  timestamp: string;
  read: boolean;
}

export interface ActivityEvent {
  id: string;
  type: 'created' | 'assigned' | 'in_progress' | 'resolved';
  message: string;
  detail: string;
  time: Date;
  severity?: string;
  incidentId: string;
  robotId: string;
}

export interface ToastItem {
  id: string;
  title: string;
  description: string;
  variant: 'default' | 'destructive';
}

interface SimulatedAlertsContextType {
  simulatedIncidents: Incident[];
  resolvedSimIncidents: Incident[];
  notifications: Notification[];
  activityLog: ActivityEvent[];
  toastQueue: ToastItem[];
  unreadCount: number;
  markAllRead: () => void;
  markOneRead: (id: string) => void;
  removeSimulatedIncident: (id: string) => void;
  addNotification: (incident: Incident) => void;
  manualAssign: (incidentId: string, operator: string | null) => void;
  forceAutoAssign: () => void;
  consumeToasts: () => ToastItem[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROBOT_IDS = [
  'RBT-001', 'RBT-002', 'RBT-003', 'RBT-004', 'RBT-005',
  'RBT-006', 'RBT-007', 'RBT-008', 'RBT-009',
];
const LOCATIONS = [
  'Sector 7G', 'Warehouse A', 'Loading Dock B', 'Assembly Line 1',
  'Storage Facility', 'Main Corridor', 'Cold Storage Zone', 'Shipping Bay 3',
];
const ISSUE_TYPES = Object.values(IncidentIssueType);
const SEVERITIES = Object.values(IncidentSeverity);
const ACTIONS = ['reroute', 'pause', 'manual_override', 'escalate'] as const;

const OPERATORS = ['Alex Chen', 'Sarah Kim', 'Jordan Patel', 'Darren Watkins Jr.'];
const MAX_PER_OPERATOR = 4;

// Timing (ms) — keep these fast enough to feel alive but not chaotic
const ASSIGN_DELAY   = () => 1500  + Math.random() * 2000;   // 1.5–3.5s
const PROGRESS_DELAY = () => 4000  + Math.random() * 6000;   // 4–10s
const RESOLVE_DELAY  = () => 12000 + Math.random() * 18000;  // 12–30s
const SPAWN_INTERVAL = 18000; // new incident every 18s

const DESCRIPTIONS: Record<string, string> = {
  obstacle_detected: 'Unknown object detected at intersection point. Visual sensors unable to classify.',
  system_error: 'Critical system error in motor controller firmware. Error code: 0x4A21.',
  path_blocked: 'Designated path blocked by unscheduled obstruction. Alternate route required.',
  sensor_failure: 'Primary proximity sensor array returning null values. Backup sensors online.',
  battery_critical: 'Battery level at 8%. Robot cannot safely navigate to charging station.',
  communication_lost: 'Telemetry link severed. Last known position cached. Signal relay unavailable.',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLeastBusyOperator(incidents: Incident[]): string | null {
  const loads: Record<string, number> = {};
  for (const op of OPERATORS) loads[op] = 0;
  for (const inc of incidents) {
    if (inc.assignedTo && loads[inc.assignedTo] !== undefined) loads[inc.assignedTo]++;
  }
  const available = OPERATORS.filter(op => loads[op] < MAX_PER_OPERATOR);
  if (!available.length) return null;
  const minLoad = Math.min(...available.map(op => loads[op]));
  const tied = available.filter(op => loads[op] === minLoad);
  return tied[Math.floor(Math.random() * tied.length)];
}

function generateFakeIncident(): Incident {
  const issueType = ISSUE_TYPES[Math.floor(Math.random() * ISSUE_TYPES.length)];
  const id = `SIM-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
  return {
    id,
    robotId: ROBOT_IDS[Math.floor(Math.random() * ROBOT_IDS.length)],
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
    issueType,
    severity: SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)],
    status: IncidentStatus.waiting,
    description: DESCRIPTIONS[issueType] || 'Automated alert triggered by onboard diagnostics.',
    timestamp: new Date().toISOString(),
    resolvedAt: null,
    actionTaken: null,
    responseTimeSeconds: null,
    assignedTo: null,
    sensorData: {
      battery: Math.floor(Math.random() * 100),
      speed: parseFloat((Math.random() * 4).toFixed(1)),
      temperature: 28 + Math.floor(Math.random() * 45),
      obstacleDistance: Math.random() > 0.5 ? parseFloat((Math.random() * 8).toFixed(2)) : null,
      signalStrength: Math.floor(Math.random() * 100),
    },
  };
}

// ─── Context ─────────────────────────────────────────────────────────────────

const SimulatedAlertsContext = createContext<SimulatedAlertsContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function SimulatedAlertsProvider({ children }: { children: React.ReactNode }) {
  const [simulatedIncidents, setSimulatedIncidents] = useState<Incident[]>([]);
  const [resolvedSimIncidents, setResolvedSimIncidents] = useState<Incident[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);

  // Refs so setTimeout callbacks always see latest state
  const incidentsRef = useRef<Incident[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map());

  useEffect(() => { incidentsRef.current = simulatedIncidents; }, [simulatedIncidents]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const pushActivity = useCallback((event: Omit<ActivityEvent, 'id'>) => {
    const e: ActivityEvent = { ...event, id: `act-${Date.now()}-${Math.random().toString(36).substr(2,5)}` };
    setActivityLog(prev => [e, ...prev].slice(0, 50));
  }, []);

  const pushToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    setToastQueue(prev => [
      ...prev,
      { ...item, id: `toast-${Date.now()}-${Math.random()}` },
    ]);
  }, []);

  const addNotification = useCallback((incident: Incident) => {
    const notif: Notification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      incident,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 20));
  }, []);

  const cancelTimers = useCallback((id: string) => {
    const timers = timersRef.current.get(id);
    if (timers) { timers.forEach(clearTimeout); timersRef.current.delete(id); }
  }, []);

  // ── Lifecycle: schedule auto-assign → in_progress → resolve ───────────────

  const scheduleLifecycle = useCallback((incident: Incident) => {
    cancelTimers(incident.id);
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Step 1 – Auto-assign
    const t1 = setTimeout(() => {
      const operator = getLeastBusyOperator(incidentsRef.current);
      if (!operator) return; // all operators full

      setSimulatedIncidents(prev =>
        prev.map(inc => inc.id === incident.id ? { ...inc, assignedTo: operator } : inc)
      );
      pushActivity({
        type: 'assigned',
        message: `Assigned to ${operator}`,
        detail: `${incident.robotId} · ${incident.issueType.replace(/_/g, ' ')}`,
        time: new Date(),
        severity: incident.severity,
        incidentId: incident.id,
        robotId: incident.robotId,
      });

      // Step 2 – In Progress
      const t2 = setTimeout(() => {
        setSimulatedIncidents(prev =>
          prev.map(inc => inc.id === incident.id ? { ...inc, status: IncidentStatus.in_progress } : inc)
        );
        pushActivity({
          type: 'in_progress',
          message: `${incident.robotId} now in progress`,
          detail: `Operator response initiated · ${operator}`,
          time: new Date(),
          severity: incident.severity,
          incidentId: incident.id,
          robotId: incident.robotId,
        });

        // Step 3 – Resolve
        const t3 = setTimeout(() => {
          const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
          const resolvedAt = new Date().toISOString();

          setSimulatedIncidents(prev => {
            const inc = prev.find(i => i.id === incident.id);
            if (inc) {
              const responseTimeSeconds = parseFloat(
                ((new Date(resolvedAt).getTime() - new Date(inc.timestamp).getTime()) / 1000).toFixed(1)
              );
              const resolved: Incident = {
                ...inc,
                status: IncidentStatus.resolved,
                actionTaken: action as string,
                resolvedAt,
                responseTimeSeconds,
                assignedTo: inc.assignedTo || operator,
              };
              setResolvedSimIncidents(r => [resolved, ...r].slice(0, 60));
              pushActivity({
                type: 'resolved',
                message: `Resolved by ${inc.assignedTo || operator}`,
                detail: `${inc.robotId} · ${action.replace(/_/g, ' ')} · ${responseTimeSeconds}s`,
                time: new Date(),
                severity: inc.severity,
                incidentId: inc.id,
                robotId: inc.robotId,
              });
              pushToast({
                title: `✓ Incident resolved`,
                description: `${inc.robotId} resolved by ${inc.assignedTo || operator} via ${action.replace(/_/g, ' ')}`,
                variant: 'default',
              });
            }
            return prev.filter(i => i.id !== incident.id);
          });
          cancelTimers(incident.id);
        }, RESOLVE_DELAY());
        timers.push(t3);
      }, PROGRESS_DELAY());
      timers.push(t2);
    }, ASSIGN_DELAY());
    timers.push(t1);

    timersRef.current.set(incident.id, timers);
  }, [cancelTimers, pushActivity, pushToast]);

  // ── Spawn new incidents periodically ──────────────────────────────────────

  useEffect(() => {
    const spawnIncident = () => {
      const newIncident = generateFakeIncident();
      setSimulatedIncidents(prev => {
        // Cap at 12 active incidents total
        const updated = [newIncident, ...prev].slice(0, 12);
        return updated;
      });
      addNotification(newIncident);
      pushActivity({
        type: 'created',
        message: `New incident: ${newIncident.robotId}`,
        detail: `${newIncident.issueType.replace(/_/g, ' ')} · ${newIncident.location}`,
        time: new Date(),
        severity: newIncident.severity,
        incidentId: newIncident.id,
        robotId: newIncident.robotId,
      });
      scheduleLifecycle(newIncident);
    };

    // Initial spawn after short delay
    const initTimer = setTimeout(spawnIncident, 2000);
    const interval = setInterval(spawnIncident, SPAWN_INTERVAL);
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [addNotification, pushActivity, scheduleLifecycle]);

  // ── Cleanup timers on unmount ──────────────────────────────────────────────

  useEffect(() => {
    const ref = timersRef.current;
    return () => {
      ref.forEach(timers => timers.forEach(clearTimeout));
    };
  }, []);

  // ── Manual operations ──────────────────────────────────────────────────────

  const removeSimulatedIncident = useCallback((id: string) => {
    cancelTimers(id);
    setSimulatedIncidents(prev => prev.filter(inc => inc.id !== id));
  }, [cancelTimers]);

  const manualAssign = useCallback((incidentId: string, operator: string | null) => {
    setSimulatedIncidents(prev =>
      prev.map(inc => inc.id === incidentId ? { ...inc, assignedTo: operator } : inc)
    );
    if (operator) {
      pushActivity({
        type: 'assigned',
        message: `Manually assigned to ${operator}`,
        detail: `Operator override via assignments panel`,
        time: new Date(),
        incidentId,
        robotId: incidentsRef.current.find(i => i.id === incidentId)?.robotId || '??',
      });
    }
  }, [pushActivity]);

  const forceAutoAssign = useCallback(() => {
    const unassigned = incidentsRef.current.filter(i => !i.assignedTo);
    for (const inc of unassigned) {
      const op = getLeastBusyOperator(incidentsRef.current);
      if (!op) break;
      manualAssign(inc.id, op);
    }
  }, [manualAssign]);

  const consumeToasts = useCallback((): ToastItem[] => {
    const items = toastQueue;
    if (items.length > 0) setToastQueue([]);
    return items;
  }, [toastQueue]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markOneRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  return (
    <SimulatedAlertsContext.Provider value={{
      simulatedIncidents,
      resolvedSimIncidents,
      notifications,
      activityLog,
      toastQueue,
      unreadCount,
      markAllRead,
      markOneRead,
      removeSimulatedIncident,
      addNotification,
      manualAssign,
      forceAutoAssign,
      consumeToasts,
    }}>
      {children}
    </SimulatedAlertsContext.Provider>
  );
}

export function useSimulatedAlerts() {
  const context = useContext(SimulatedAlertsContext);
  if (!context) throw new Error('useSimulatedAlerts must be used within a SimulatedAlertsProvider');
  return context;
}

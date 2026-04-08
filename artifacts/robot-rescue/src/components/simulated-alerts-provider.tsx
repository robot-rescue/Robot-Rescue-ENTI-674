import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Incident, IncidentIssueType, IncidentSeverity, IncidentStatus } from '@workspace/api-client-react';

export interface Notification {
  id: string;
  incident: Incident;
  timestamp: string;
  read: boolean;
}

interface SimulatedAlertsContextType {
  simulatedIncidents: Incident[];
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markOneRead: (id: string) => void;
  removeSimulatedIncident: (id: string) => void;
  addNotification: (incident: Incident) => void;
}

const SimulatedAlertsContext = createContext<SimulatedAlertsContextType | undefined>(undefined);

const ROBOT_IDS = ['RBT-001', 'RBT-002', 'RBT-003', 'RBT-004', 'RBT-005', 'RBT-006'];
const LOCATIONS = ['Sector 7G', 'Warehouse A', 'Loading Dock B', 'Assembly Line 1', 'Storage Facility', 'Main Corridor'];
const ISSUE_TYPES = Object.values(IncidentIssueType);
const SEVERITIES = Object.values(IncidentSeverity);

const generateFakeIncident = (): Incident => {
  const id = `SIM-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  return {
    id,
    robotId: ROBOT_IDS[Math.floor(Math.random() * ROBOT_IDS.length)],
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
    issueType: ISSUE_TYPES[Math.floor(Math.random() * ISSUE_TYPES.length)],
    severity: SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)],
    status: IncidentStatus.waiting,
    description: 'Automated alert triggered by onboard diagnostics.',
    timestamp,
    resolvedAt: null,
    actionTaken: null,
    responseTimeSeconds: null,
    assignedTo: null,
    sensorData: {
      battery: Math.floor(Math.random() * 100),
      speed: Math.floor(Math.random() * 5),
      temperature: 30 + Math.floor(Math.random() * 50),
      obstacleDistance: Math.random() > 0.5 ? Math.random() * 10 : null,
      signalStrength: Math.floor(Math.random() * 100),
    },
  };
};

export function SimulatedAlertsProvider({ children }: { children: React.ReactNode }) {
  const [simulatedIncidents, setSimulatedIncidents] = useState<Incident[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((incident: Incident) => {
    const notif: Notification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      incident,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 20));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newIncident = generateFakeIncident();
      setSimulatedIncidents(prev => [newIncident, ...prev].slice(0, 10));
      addNotification(newIncident);
    }, 15000);
    return () => clearInterval(interval);
  }, [addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markOneRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const removeSimulatedIncident = useCallback((id: string) => {
    setSimulatedIncidents(prev => prev.filter(inc => inc.id !== id));
  }, []);

  return (
    <SimulatedAlertsContext.Provider value={{
      simulatedIncidents,
      notifications,
      unreadCount,
      markAllRead,
      markOneRead,
      removeSimulatedIncident,
      addNotification,
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

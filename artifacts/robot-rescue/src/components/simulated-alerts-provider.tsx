import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Incident, IncidentIssueType, IncidentSeverity, IncidentStatus } from '@workspace/api-client-react';

interface SimulatedAlertsContextType {
  simulatedIncidents: Incident[];
  hasUnread: boolean;
  markAsRead: () => void;
  removeSimulatedIncident: (id: string) => void;
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
    sensorData: {
      battery: Math.floor(Math.random() * 100),
      speed: Math.floor(Math.random() * 5),
      temperature: 30 + Math.floor(Math.random() * 50),
      obstacleDistance: Math.random() > 0.5 ? Math.random() * 10 : null,
      signalStrength: Math.floor(Math.random() * 100)
    }
  };
};

export function SimulatedAlertsProvider({ children }: { children: React.ReactNode }) {
  const [simulatedIncidents, setSimulatedIncidents] = useState<Incident[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const newIncident = generateFakeIncident();
      setSimulatedIncidents(prev => [newIncident, ...prev].slice(0, 10)); // Keep max 10
      setHasUnread(true);
    }, 15000); // Every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const markAsRead = useCallback(() => {
    setHasUnread(false);
  }, []);

  const removeSimulatedIncident = useCallback((id: string) => {
    setSimulatedIncidents(prev => prev.filter(inc => inc.id !== id));
  }, []);

  return (
    <SimulatedAlertsContext.Provider value={{ simulatedIncidents, hasUnread, markAsRead, removeSimulatedIncident }}>
      {children}
    </SimulatedAlertsContext.Provider>
  );
}

export function useSimulatedAlerts() {
  const context = useContext(SimulatedAlertsContext);
  if (!context) {
    throw new Error('useSimulatedAlerts must be used within a SimulatedAlertsProvider');
  }
  return context;
}

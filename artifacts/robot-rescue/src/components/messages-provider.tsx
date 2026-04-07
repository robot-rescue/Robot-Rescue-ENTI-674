import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSimulatedAlerts } from "./simulated-alerts-provider";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageFrom = "system" | "operator" | "self";

export interface ChatMessage {
  id: string;
  from: MessageFrom;
  text: string;
  timestamp: Date;
  incidentId?: string;
}

export interface Conversation {
  operatorName: string;
  messages: ChatMessage[];
  unreadCount: number;
}

interface MessagesContextType {
  conversations: Conversation[];
  addSystemMessage: (operatorName: string, text: string, incidentId?: string) => void;
  sendMessage: (operatorName: string, text: string) => void;
  markConversationRead: (operatorName: string) => void;
  totalUnread: number;
  typingOps: string[];
}

// ─── Operator roster ─────────────────────────────────────────────────────────

export const MSG_OPERATORS = [
  "Alex Chen",
  "Sarah Kim",
  "Jordan Patel",
  "Darren Watkins Jr.",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

let msgIdSeq = 0;
function makeId() {
  return `msg-${Date.now()}-${++msgIdSeq}`;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3_600_000);
}
function minsAgo(m: number): Date {
  return new Date(Date.now() - m * 60_000);
}

// ─── Auto-reply pool ─────────────────────────────────────────────────────────

const AUTO_REPLIES: Record<string, string[]> = {
  "Alex Chen": [
    "Copy that. I'll handle it.",
    "On it — updating route now.",
    "Understood. Will report back shortly.",
    "Confirmed. Running diagnostics.",
    "Roger. Status update incoming.",
  ],
  "Sarah Kim": [
    "Acknowledged. Monitoring closely.",
    "Understood, coordinating with floor team.",
    "Copy. Battery levels being tracked.",
    "Will escalate if status changes.",
    "Confirmed. Proceeding with protocol.",
  ],
  "Jordan Patel": [
    "Got it. Running sensor checks.",
    "Acknowledged. Rerouting now.",
    "Copy that. Diagnostic underway.",
    "Understood. Will keep you posted.",
    "On it. Checking comms relay.",
  ],
  "Darren Watkins Jr.": [
    "Copy. En route to affected zone.",
    "Acknowledged. Activating override.",
    "Understood. Standby for status.",
    "Confirmed. Assessing damage now.",
    "On it. Manual intervention initiated.",
  ],
};

// ─── Preloaded seed conversations ─────────────────────────────────────────────

function seedConversations(): Conversation[] {
  return [
    {
      operatorName: "Alex Chen",
      unreadCount: 0,
      messages: [
        { id: makeId(), from: "system",   text: "Incident RX-301 assigned to Alex Chen.",                     timestamp: daysAgo(2),         incidentId: "1001" },
        { id: makeId(), from: "operator", text: "On it — routing to the affected sector now.",                 timestamp: daysAgo(2),         },
        { id: makeId(), from: "system",   text: "RX-301: obstacle detected in Aisle 4. Path blocked.",        timestamp: daysAgo(2),         incidentId: "1001" },
        { id: makeId(), from: "operator", text: "Confirmed visual on object. Activating alternate path B.",   timestamp: hoursAgo(47),       },
        { id: makeId(), from: "self",     text: "What's your ETA on clearance?",                              timestamp: hoursAgo(47),       },
        { id: makeId(), from: "operator", text: "Roughly 4 minutes. Object classified as static debris.",     timestamp: hoursAgo(46),       },
        { id: makeId(), from: "system",   text: "Incident RX-301 resolved successfully.",                     timestamp: hoursAgo(46),       incidentId: "1001" },
        { id: makeId(), from: "operator", text: "Path cleared. Robot resuming nominal operations.",           timestamp: hoursAgo(46),       },
        { id: makeId(), from: "self",     text: "Good work. Moving you to next priority.",                    timestamp: hoursAgo(45),       },
      ],
    },
    {
      operatorName: "Sarah Kim",
      unreadCount: 2,
      messages: [
        { id: makeId(), from: "system",   text: "Incident RX-445 assigned to Sarah Kim.",                     timestamp: hoursAgo(26),       incidentId: "1002" },
        { id: makeId(), from: "operator", text: "Acknowledged. Battery critical — monitoring charge status.", timestamp: hoursAgo(25),       },
        { id: makeId(), from: "system",   text: "High priority alert: RX-445 battery below 5%.",             timestamp: hoursAgo(24),       incidentId: "1002" },
        { id: makeId(), from: "operator", text: "Initiating emergency recharge protocol at Dock 3.",         timestamp: hoursAgo(24),       },
        { id: makeId(), from: "self",     text: "Keep me posted on charge levels.",                           timestamp: hoursAgo(23),       },
        { id: makeId(), from: "system",   text: "Incident RX-445 resolved successfully.",                     timestamp: hoursAgo(23),       incidentId: "1002" },
        { id: makeId(), from: "operator", text: "Charging complete. Unit back to full operational status.",   timestamp: minsAgo(45),        },
        { id: makeId(), from: "operator", text: "RX-934 showing elevated temp readings. Should I monitor?",  timestamp: minsAgo(12),        },
      ],
    },
    {
      operatorName: "Jordan Patel",
      unreadCount: 0,
      messages: [
        { id: makeId(), from: "system",   text: "Incident RX-718 assigned to Jordan Patel.",                  timestamp: hoursAgo(5),        incidentId: "1003" },
        { id: makeId(), from: "operator", text: "RX-718 has intermittent comms. Running diagnostic now.",     timestamp: hoursAgo(5),        },
        { id: makeId(), from: "self",     text: "Suspected RF interference from dock machinery. Check relay.", timestamp: hoursAgo(4.5),     },
        { id: makeId(), from: "operator", text: "Confirmed — relay unit on Bay 7 overheating.",              timestamp: hoursAgo(4),        },
        { id: makeId(), from: "operator", text: "Communication restored after relay reset. All nominal.",     timestamp: hoursAgo(3),        },
        { id: makeId(), from: "system",   text: "Incident RX-718 resolved successfully.",                     timestamp: hoursAgo(3),        incidentId: "1003" },
        { id: makeId(), from: "self",     text: "Nice catch. Log the relay fault for maintenance review.",    timestamp: hoursAgo(2),        },
        { id: makeId(), from: "operator", text: "Logged. Maintenance ticket #MT-0492 filed.",                 timestamp: hoursAgo(1.5),      },
      ],
    },
    {
      operatorName: "Darren Watkins Jr.",
      unreadCount: 1,
      messages: [
        { id: makeId(), from: "system",   text: "Incident RX-204 assigned to Darren Watkins Jr.",             timestamp: hoursAgo(3),        incidentId: "1004" },
        { id: makeId(), from: "operator", text: "Acknowledged. En route to Warehouse B sector.",              timestamp: hoursAgo(3),        },
        { id: makeId(), from: "operator", text: "Path obstruction confirmed — large pallet in main aisle.",   timestamp: hoursAgo(2.5),      },
        { id: makeId(), from: "self",     text: "Activate manual reroute via loading bay entrance.",           timestamp: hoursAgo(2),        },
        { id: makeId(), from: "operator", text: "Manual reroute active. Robot navigating around obstruction.", timestamp: hoursAgo(1.5),     },
        { id: makeId(), from: "system",   text: "Incident RX-204 resolved successfully.",                     timestamp: hoursAgo(1),        incidentId: "1004" },
        { id: makeId(), from: "operator", text: "All clear. Pallet flagged for relocation by ground crew.",   timestamp: minsAgo(20),        },
      ],
    },
  ];
}

// ─── Context ──────────────────────────────────────────────────────────────────

const MessagesContext = createContext<MessagesContextType | null>(null);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(seedConversations);
  const [typingOps, setTypingOps] = useState<string[]>([]);

  const { resolvedSimIncidents } = useSimulatedAlerts();
  const prevResolvedLen = useRef(resolvedSimIncidents.length);

  // ── Watch for newly resolved SIM incidents and inject system messages ──────
  useEffect(() => {
    if (resolvedSimIncidents.length <= prevResolvedLen.current) {
      prevResolvedLen.current = resolvedSimIncidents.length;
      return;
    }
    const newResolved = resolvedSimIncidents.slice(0, resolvedSimIncidents.length - prevResolvedLen.current);
    prevResolvedLen.current = resolvedSimIncidents.length;

    for (const inc of newResolved) {
      if (!inc.assignedTo) continue;
      const operator = MSG_OPERATORS.find(op => op === inc.assignedTo);
      if (!operator) continue;

      injectSystemMessage(
        operator,
        `Incident ${inc.robotId} resolved successfully.`,
        inc.id,
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedSimIncidents]);

  // ── Internal helpers (no dependency on state setters to avoid stale closures)
  function injectSystemMessage(operatorName: string, text: string, incidentId?: string) {
    setConversations(prev =>
      prev.map(conv => {
        if (conv.operatorName !== operatorName) return conv;
        return {
          ...conv,
          messages: [
            ...conv.messages,
            { id: makeId(), from: "system", text, timestamp: new Date(), incidentId },
          ],
          unreadCount: conv.unreadCount + 1,
        };
      })
    );
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  const addSystemMessage = useCallback((operatorName: string, text: string, incidentId?: string) => {
    injectSystemMessage(operatorName, text, incidentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback((operatorName: string, text: string) => {
    const newMsg: ChatMessage = {
      id: makeId(),
      from: "self",
      text,
      timestamp: new Date(),
    };

    setConversations(prev =>
      prev.map(conv =>
        conv.operatorName === operatorName
          ? { ...conv, messages: [...conv.messages, newMsg] }
          : conv
      )
    );

    // Simulate operator typing then auto-reply
    const delay = 1_500 + Math.random() * 2_000;
    setTypingOps(prev => [...prev, operatorName]);

    setTimeout(() => {
      setTypingOps(prev => prev.filter(op => op !== operatorName));

      const pool = AUTO_REPLIES[operatorName] ?? ["Acknowledged."];
      const reply = pool[Math.floor(Math.random() * pool.length)];

      setConversations(prev =>
        prev.map(conv =>
          conv.operatorName === operatorName
            ? {
                ...conv,
                messages: [
                  ...conv.messages,
                  { id: makeId(), from: "operator", text: reply, timestamp: new Date() },
                ],
              }
            : conv
        )
      );
    }, delay);
  }, []);

  const markConversationRead = useCallback((operatorName: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.operatorName === operatorName ? { ...conv, unreadCount: 0 } : conv
      )
    );
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <MessagesContext.Provider
      value={{ conversations, addSystemMessage, sendMessage, markConversationRead, totalUnread, typingOps }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used inside MessagesProvider");
  return ctx;
}

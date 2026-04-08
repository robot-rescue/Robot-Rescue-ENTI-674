import { pgTable, text, integer, jsonb, timestamp, serial } from "drizzle-orm/pg-core";

export interface SensorData {
  battery: number;
  speed: number;
  temperature: number;
  obstacleDistance: number | null;
  signalStrength: number;
}

export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),
  robotId: text("robot_id").notNull(),
  location: text("location").notNull(),
  issueType: text("issue_type").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("waiting"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  actionTaken: text("action_taken"),
  responseTimeSeconds: integer("response_time_seconds"),
  assignedTo: text("assigned_to"),
  sensorData: jsonb("sensor_data").$type<SensorData>().notNull(),
});

export type IncidentRow = typeof incidentsTable.$inferSelect;
export type InsertIncident = Omit<typeof incidentsTable.$inferInsert, "id">;

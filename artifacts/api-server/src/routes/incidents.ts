import { Router } from "express";
import { eq, ne, desc } from "drizzle-orm";
import { db, incidentsTable } from "@workspace/db";
import {
  ListIncidentsQueryParams,
  CreateIncidentBody,
  UpdateIncidentBody,
} from "@workspace/api-zod";
import { generateIncident, toIncident } from "./store";

const router = Router();

router.get("/incidents", async (req, res) => {
  const query = ListIncidentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { status } = query.data;

  let rows;
  if (!status || status === "all") {
    rows = await db.select().from(incidentsTable).orderBy(desc(incidentsTable.createdAt));
  } else if (status === "resolved") {
    rows = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.status, "resolved"))
      .orderBy(desc(incidentsTable.resolvedAt));
  } else {
    rows = await db
      .select()
      .from(incidentsTable)
      .where(ne(incidentsTable.status, "resolved"))
      .orderBy(desc(incidentsTable.createdAt));
  }

  res.json(rows.map(toIncident));
});

router.get("/incidents/log", async (_req, res) => {
  const rows = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.status, "resolved"))
    .orderBy(desc(incidentsTable.resolvedAt));

  res.json(
    rows.map((r) => ({
      id: String(r.id),
      robotId: r.robotId,
      issueType: r.issueType,
      actionTaken: r.actionTaken,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      responseTimeSeconds: r.responseTimeSeconds,
      severity: r.severity,
      location: r.location,
    }))
  );
});

router.post("/incidents", async (req, res) => {
  const body = CreateIncidentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const inc = generateIncident({ ...body.data });
  const [row] = await db
    .insert(incidentsTable)
    .values({
      robotId: inc.robotId,
      location: inc.location,
      issueType: inc.issueType,
      severity: inc.severity,
      status: inc.status,
      description: inc.description,
      createdAt: new Date(inc.timestamp),
      resolvedAt: null,
      actionTaken: null,
      responseTimeSeconds: null,
      assignedTo: null,
      sensorData: inc.sensorData,
    })
    .returning();
  res.status(201).json(toIncident(row));
});

router.get("/incidents/:id", async (req, res) => {
  const numId = Number(req.params.id);
  if (isNaN(numId)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [row] = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.id, numId));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(toIncident(row));
});

router.patch("/incidents/:id", async (req, res) => {
  const numId = Number(req.params.id);
  if (isNaN(numId)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const body = UpdateIncidentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const [current] = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.id, numId));
  if (!current) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { status, actionTaken, assignedTo } = body.data;
  const updates: Partial<typeof incidentsTable.$inferInsert> = {};

  if (assignedTo !== undefined) updates.assignedTo = assignedTo;
  if (status) updates.status = status;
  if (actionTaken) updates.actionTaken = actionTaken;

  const shouldResolve =
    status === "resolved" ||
    (actionTaken !== undefined && current.status !== "resolved");

  if (shouldResolve) {
    updates.status = "resolved";
    updates.resolvedAt = new Date();
    updates.responseTimeSeconds = Math.round(
      (Date.now() - current.createdAt.getTime()) / 1000
    );
    if (actionTaken) updates.actionTaken = actionTaken;
  }

  const [updated] = await db
    .update(incidentsTable)
    .set(updates)
    .where(eq(incidentsTable.id, numId))
    .returning();

  res.json(toIncident(updated));
});

export default router;

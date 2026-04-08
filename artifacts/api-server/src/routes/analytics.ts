import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, incidentsTable } from "@workspace/db";
import { toIncident } from "./store";

const router = Router();

router.get("/analytics/summary", async (_req, res) => {
  const rows = await db.select().from(incidentsTable);
  const all = rows.map(toIncident);

  const active = all.filter((i) => i.status !== "resolved");
  const resolved = all.filter((i) => i.status === "resolved");

  const responseTimes = resolved
    .map((i) => i.responseTimeSeconds)
    .filter((t): t is number => t !== null);
  const avgResponseTimeSeconds =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  const issueTypeCounts: Record<string, number> = {};
  for (const i of all) {
    issueTypeCounts[i.issueType] = (issueTypeCounts[i.issueType] || 0) + 1;
  }
  const issueBreakdown = Object.entries(issueTypeCounts).map(
    ([issueType, count]) => ({ issueType, count })
  );
  const mostFrequentIssueType = issueBreakdown.reduce(
    (max, cur) => (cur.count > max.count ? cur : max),
    { issueType: "N/A", count: 0 }
  ).issueType;

  const severityCounts: Record<string, number> = {};
  for (const i of all) {
    severityCounts[i.severity] = (severityCounts[i.severity] || 0) + 1;
  }
  const severityBreakdown = Object.entries(severityCounts).map(
    ([severity, count]) => ({ severity, count })
  );
  const highSeverityPct =
    all.length > 0
      ? Math.round(((severityCounts["high"] || 0) / all.length) * 100)
      : 0;

  const locationCounts: Record<string, number> = {};
  for (const i of all) {
    locationCounts[i.location] = (locationCounts[i.location] || 0) + 1;
  }
  const locationBreakdown = Object.entries(locationCounts)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split("T")[0]);
  }
  const incidentsPerDay = last7Days.map((day) => ({
    day,
    count: all.filter((i) => i.timestamp.startsWith(day)).length,
  }));

  const recentActivity = [...all]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  res.json({
    totalIncidents: all.length,
    activeIncidents: active.length,
    resolvedIncidents: resolved.length,
    avgResponseTimeSeconds,
    highSeverityPct,
    mostFrequentIssueType,
    issueBreakdown,
    severityBreakdown,
    locationBreakdown,
    incidentsPerDay,
    recentActivity,
  });
});

export default router;

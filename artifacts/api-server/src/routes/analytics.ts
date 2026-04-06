import { Router } from "express";
import { incidents, resolvedIncidents, type Incident } from "./store";

const router = Router();

router.get("/analytics/summary", (_req, res) => {
  const allIncidents: Incident[] = [...incidents, ...resolvedIncidents];
  const totalIncidents = allIncidents.length;
  const activeIncidents = incidents.filter((i) => i.status !== "resolved").length;
  const resolvedCount = resolvedIncidents.length;

  const responseTimes = resolvedIncidents
    .map((i) => i.responseTimeSeconds)
    .filter((t): t is number => t !== null);
  const avgResponseTimeSeconds =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        )
      : 0;

  const issueTypeCounts: Record<string, number> = {};
  for (const i of allIncidents) {
    issueTypeCounts[i.issueType] = (issueTypeCounts[i.issueType] || 0) + 1;
  }
  const issueBreakdown = Object.entries(issueTypeCounts).map(
    ([issueType, count]) => ({ issueType, count })
  );

  const severityCounts: Record<string, number> = {};
  for (const i of allIncidents) {
    severityCounts[i.severity] = (severityCounts[i.severity] || 0) + 1;
  }
  const severityBreakdown = Object.entries(severityCounts).map(
    ([severity, count]) => ({ severity, count })
  );

  const recentActivity = [...allIncidents]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 5);

  res.json({
    totalIncidents,
    activeIncidents,
    resolvedIncidents: resolvedCount,
    avgResponseTimeSeconds,
    issueBreakdown,
    severityBreakdown,
    recentActivity,
  });
});

export default router;

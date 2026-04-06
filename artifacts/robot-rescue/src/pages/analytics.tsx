import { useGetAnalyticsSummary } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, Clock, ShieldAlert, CheckCircle2 } from "lucide-react";

const COLORS = ['hsl(20, 100%, 55%)', 'hsl(0, 84%, 60%)', 'hsl(45, 100%, 50%)', 'hsl(190, 90%, 50%)', 'hsl(240, 5%, 65%)'];

export default function Analytics() {
  const { data: analytics, isLoading } = useGetAnalyticsSummary();

  if (isLoading || !analytics) {
    return <div className="p-8 flex justify-center text-primary font-mono text-sm">INITIALIZING TELEMETRY...</div>;
  }

  const severityData = analytics.severityBreakdown.map(item => ({
    name: item.severity.toUpperCase(),
    value: item.count
  }));

  const issueData = analytics.issueBreakdown.map(item => ({
    name: item.issueType.replace(/_/g, ' ').toUpperCase(),
    count: item.count
  }));

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight">System Analytics</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">FLEET PERFORMANCE METRICS</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard 
            title="Total Incidents" 
            value={analytics.totalIncidents} 
            icon={Activity} 
            trend="+12%" 
          />
          <MetricCard 
            title="Active Alerts" 
            value={analytics.activeIncidents} 
            icon={ShieldAlert} 
            valueClass="text-primary"
          />
          <MetricCard 
            title="Resolved" 
            value={analytics.resolvedIncidents} 
            icon={CheckCircle2} 
            valueClass="text-emerald-500"
          />
          <MetricCard 
            title="Avg Response Time" 
            value={`${Math.round(analytics.avgResponseTimeSeconds)}s`} 
            icon={Clock} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-mono text-muted-foreground uppercase mb-6">Incidents by Issue Type</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 12%)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'hsl(240, 5%, 65%)' }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(value) => value.split(' ')[0]} // Shorten labels
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'hsl(240, 5%, 65%)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(240, 10%, 12%)' }}
                    contentStyle={{ backgroundColor: 'hsl(240, 10%, 6%)', borderColor: 'hsl(240, 10%, 12%)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                    itemStyle={{ color: 'hsl(0, 0%, 98%)' }}
                  />
                  <Bar dataKey="count" fill="hsl(20, 100%, 55%)" radius={[2, 2, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-mono text-muted-foreground uppercase mb-6">Severity Distribution</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(240, 10%, 6%)', borderColor: 'hsl(240, 10%, 12%)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {severityData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs font-mono">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {entry.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, valueClass = "" }: { title: string, value: string | number, icon: any, trend?: string, valueClass?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between text-muted-foreground mb-4">
        <span className="text-xs font-mono uppercase tracking-wider">{title}</span>
        <Icon className="w-4 h-4 opacity-50" />
      </div>
      <div className="flex items-end justify-between mt-auto">
        <span className={`text-3xl font-bold font-mono ${valueClass}`}>{value}</span>
        {trend && <span className="text-xs text-emerald-500 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">{trend}</span>}
      </div>
    </div>
  );
}

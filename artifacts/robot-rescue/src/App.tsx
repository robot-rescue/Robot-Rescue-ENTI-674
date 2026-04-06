import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";

import { AppLayout } from "@/components/layout/app-layout";
import { SimulatedAlertsProvider } from "@/components/simulated-alerts-provider";
import Dashboard from "@/pages/dashboard";
import IncidentDetail from "@/pages/incident-detail";
import IncidentLog from "@/pages/incident-log";
import Analytics from "@/pages/analytics";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/incidents/:id" component={IncidentDetail} />
        <Route path="/log" component={IncidentLog} />
        <Route path="/analytics" component={Analytics} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SimulatedAlertsProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </SimulatedAlertsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

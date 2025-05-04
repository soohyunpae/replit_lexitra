import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Project from "@/pages/project";
import Translation from "@/pages/translation";
import Glossary from "@/pages/glossary";
import TM from "@/pages/tm";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/projects/:id" component={Project} />
      <Route path="/translation/:fileId" component={Translation} />
      <Route path="/glossary" component={Glossary} />
      <Route path="/tm" component={TM} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

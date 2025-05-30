import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/main-layout";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { LanguageProvider } from "@/hooks/use-language";
import { ProtectedRoute } from "@/components/auth/protected-route";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import LandingPage from "@/pages/landing";
import Projects from "@/pages/projects";
import Project from "@/pages/project";
import Translation from "@/pages/translation";
import GlossariesIndex from "@/pages/glossaries";
// Removed import for entries page
// Removed import for resources page
import GlossariesUnified from "@/pages/glossaries/unified";
import TMUnified from "@/pages/tm/unified";
// Removed import for settings page
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile";
import AuthDebugPage from "@/pages/auth-debug";
import AdminConsole from "@/pages/admin/admin-index";
import TMUpload from "@/pages/admin/tm/upload";
import TMAlignment from "@/pages/admin/tm/alignment";
import TMCleanup from "@/pages/admin/tm/cleanup";


// Admin role protected route component
const AdminRoute = ({ component: Component, ...rest }: any) => {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Check if the user is admin
  const isAdmin = user?.role === "admin";

  if (!user) {
    // User not logged in
    navigate("/auth");
    return null;
  }

  if (!isAdmin) {
    // User logged in but not admin
    navigate("/");
    return null;
  }

  return <Component {...rest} />;
};

function Router() {
  return (
    <Switch>
      <Route path="/landing" component={LandingPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/projects" component={Projects} />
      <ProtectedRoute path="/projects/:id" component={Project} />
      <ProtectedRoute path="/translation/:fileId" component={Translation} />

      {/* New unified glossary page */}
      <ProtectedRoute path="/glossaries" component={GlossariesUnified} />

      {/* Redirect old routes to the unified page */}
      <ProtectedRoute path="/termbases" component={GlossariesUnified} />

      {/* TM page */}
      <ProtectedRoute path="/tm" component={TMUnified} />

      <ProtectedRoute path="/profile" component={ProfilePage} />
      <Route path="/admin">
        <AdminRoute component={AdminConsole} />
      </Route>
      <Route path="/admin/tm/upload">
        <AdminRoute component={TMUpload} />
      </Route>
      <Route path="/admin/tm/alignment">
        <AdminRoute component={TMAlignment} />
      </Route>
      <Route path="/admin/tm/cleanup">
        <AdminRoute component={TMCleanup} />
      </Route>
      
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth-debug" component={AuthDebugPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="lexitra-theme-preference">
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <Router />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
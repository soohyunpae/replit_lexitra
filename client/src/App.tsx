import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { MainLayout } from "@/components/layout/main-layout";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Projects from "@/pages/projects";
import Project from "@/pages/project";
import Translation from "@/pages/translation";
import GlossariesIndex from "@/pages/glossaries";
import GlossariesEntries from "@/pages/glossaries/entries";
import GlossariesResources from "@/pages/glossaries/resources";
import GlossariesUnified from "@/pages/glossaries/unified";
import TM from "@/pages/tm/index";
import TMResources from "@/pages/tm/resources";
import TMUnified from "@/pages/tm/unified";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile";
import AuthDebugPage from "@/pages/auth-debug";
import AdminDashboard from "@/pages/admin/admin-index";
import TMUpload from "@/pages/admin/tm/upload";
import TMAlignment from "@/pages/admin/tm/alignment";
import TMCleanup from "@/pages/admin/tm/cleanup";
import PDFProcessing from "@/pages/admin/file/pdf";
import FileConversion from "@/pages/admin/file/conversion";
import FileProcessing from "@/pages/admin/file/index";

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
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/projects" component={Projects} />
      <ProtectedRoute path="/projects/:id" component={Project} />
      <ProtectedRoute path="/translation/:fileId" component={Translation} />
      
      {/* New unified glossary page */}
      <ProtectedRoute path="/glossaries" component={GlossariesUnified} />
      
      {/* Keep old routes for backward compatibility */}
      <ProtectedRoute path="/glossaries/entries" component={GlossariesEntries} />
      <ProtectedRoute path="/glossaries/resources" component={GlossariesResources} />
      <ProtectedRoute path="/termbases" component={GlossariesUnified} />
      <ProtectedRoute path="/termbases/entries" component={GlossariesEntries} />
      <ProtectedRoute path="/termbases/resources" component={GlossariesResources} />
      
      {/* New unified TM page */}
      <ProtectedRoute path="/tm" component={TMUnified} />
      
      {/* Keep old routes for backward compatibility */}
      <ProtectedRoute path="/tm/resources" component={TMResources} />
      
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <Route path="/admin">
        <AdminRoute component={AdminDashboard} />
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
      <Route path="/admin/file/pdf">
        <AdminRoute component={PDFProcessing} />
      </Route>
      <Route path="/admin/file/conversion">
        <AdminRoute component={FileConversion} />
      </Route>
      <Route path="/admin/file">
        <AdminRoute component={FileProcessing} />
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
      <ThemeProvider defaultTheme="dark" storageKey="lexitra-theme-preference">
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
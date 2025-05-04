import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { MainLayout } from "@/components/layout/main-layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Project from "@/pages/project";
import Translation from "@/pages/translation";
import Glossary from "@/pages/glossary";
import TM from "@/pages/tm";

function Router() {
  const [location] = useLocation();

  // 각 경로에 따른 페이지 제목 구성
  const getTitle = () => {
    if (location === "/") return "Projects";
    if (location.startsWith("/projects/")) return "Project Details";
    if (location.startsWith("/translation/")) return "Translation Editor";
    if (location === "/glossary") return "Terminology Base";
    if (location === "/tm") return "Translation Memory";
    return "Lexitra";
  };

  // 검색 기능이 필요한 페이지 확인
  const needsSearch = location.startsWith("/translation/") || 
                      location === "/glossary" || 
                      location === "/tm";

  return (
    <MainLayout title={getTitle()} showSearch={needsSearch}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/projects/:id" component={Project} />
        <Route path="/translation/:fileId" component={Translation} />
        <Route path="/glossary" component={Glossary} />
        <Route path="/tm" component={TM} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="lexitra-theme-preference">
        <Router />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

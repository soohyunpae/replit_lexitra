import React from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { Home, FileText, Book, Database } from "lucide-react";
import { useLocation } from "wouter";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
  showSidebarTrigger?: boolean;
}

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

export function MainLayout({ 
  children, 
  title = "Lexitra", 
  showSearch = false,
  showSidebarTrigger = false 
}: MainLayoutProps) {
  const [location] = useLocation();
  
  // 네비게이션 아이템 정의
  const navigationItems: NavItem[] = [
    {
      icon: <Home className="h-5 w-5" />,
      label: "Projects",
      href: "/",
      active: location === "/"
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: "Translation",
      href: location.startsWith("/translation/") ? location : "/projects",
      active: location.startsWith("/translation/") || location.startsWith("/projects/")
    },
    {
      icon: <Book className="h-5 w-5" />,
      label: "Terminology",
      href: "/glossary",
      active: location === "/glossary"
    },
    {
      icon: <Database className="h-5 w-5" />,
      label: "Translation Memory",
      href: "/tm",
      active: location === "/tm"
    }
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          title={title} 
          showSearch={showSearch} 
          showSidebarTrigger={showSidebarTrigger}
        />
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSidebarTrigger?: boolean;
}

export function MainLayout({ 
  children, 
  title = "Lexitra", 
  showSidebarTrigger = false 
}: MainLayoutProps) {

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          title={title} 
          showSidebarTrigger={showSidebarTrigger}
        />
        
        {/* Page Content - overflow-y-auto allows scrolling in the main content area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

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
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

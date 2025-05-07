import React from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebarTrigger?: boolean;
  actionButtons?: React.ReactNode;
  pageHeader?: React.ReactNode;
}

export function MainLayout({ 
  children, 
  showSidebarTrigger = false,
  actionButtons,
  pageHeader
}: MainLayoutProps) {

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar actionButtons={actionButtons} />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Simple header with just icons */}
        <Header showSidebarTrigger={showSidebarTrigger} />
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {/* Optional Page Header Section */}
          {pageHeader && (
            <div className="border-b border-border bg-card/50 py-4 px-6">
              {pageHeader}
            </div>
          )}
          
          {/* Main Content Area */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

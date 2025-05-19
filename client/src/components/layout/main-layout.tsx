
import React from "react";
import { Sidebar } from "./sidebar";
import { useTranslation } from "react-i18next";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSidebarTrigger?: boolean;
}

export function MainLayout({ 
  children, 
  title,
  showSidebarTrigger = false 
}: MainLayoutProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  ChevronsUpDown, 
  Settings, 
  PlusCircle,
  FolderOpen,
  Book,
  Database,
  Home,
  Layers,
  Server
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Project } from "@/types";
import { Separator } from "@/components/ui/separator";

interface ProjectFile {
  id: number;
  name: string;
}

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

export function Sidebar() {
  const [location] = useLocation();
  const isMobile = useMobile();
  const [isProjectOpen, setIsProjectOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { data: projects } = useQuery({ 
    queryKey: ['/api/projects'],
  });
  
  // Get the current project ID from URL if it exists
  const projectId = location.startsWith('/projects/') 
    ? parseInt(location.split('/projects/')[1])
    : null;
  
  // Get the current file ID from URL if it exists
  const fileId = location.startsWith('/translation/') 
    ? parseInt(location.split('/translation/')[1])
    : null;
  
  const { data: currentProject } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Main navigation items
  const mainNavItems: NavItem[] = [
    {
      icon: <Home className="h-5 w-5" />,
      label: "Projects",
      href: "/"
    },
    {
      icon: <Layers className="h-5 w-5" />,
      label: "Translation Editor",
      href: fileId ? `/translation/${fileId}` : "/"
    },
    {
      icon: <Book className="h-5 w-5" />,
      label: "Terminology Base",
      href: "/glossary"
    },
    {
      icon: <Database className="h-5 w-5" />,
      label: "Translation Memory",
      href: "/tm"
    },
    {
      icon: <Server className="h-5 w-5" />,
      label: "Settings",
      href: "/settings"
    }
  ];
  
  return (
    <aside className="w-16 lg:w-64 border-r border-border flex flex-col bg-sidebar h-screen">
      <div className="py-4 px-3 border-b border-border">
        <div className="flex items-center justify-center lg:justify-start">
          <svg
            viewBox="0 0 24 24"
            className="text-primary h-8 w-8 mr-0 lg:mr-2"
            fill="currentColor"
          >
            <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
          </svg>
          <h1 className="font-semibold text-lg hidden lg:block">Lexitra</h1>
        </div>
      </div>
      
      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav>
          <ul className="space-y-2">
            {mainNavItems.map((item, index) => (
              <li key={index}>
                <Link href={item.href} className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg transition-colors",
                  "text-foreground/70 hover:text-foreground hover:bg-accent/60",
                  {
                    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground": 
                      (location === item.href) || 
                      (item.href === "/" && location === "/") || 
                      (item.href.includes("/translation/") && location.includes("/translation/"))
                  }
                )}>
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="ml-3 text-sm font-medium hidden lg:block">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      
      {/* Project Files - Only show when in a project context */}
      {currentProject && (
        <div className="px-3 py-4 border-t border-border">
          <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-3 hidden lg:block">
            Project Files
          </h3>
          
          <ul className="space-y-1">
            {currentProject?.files?.map((file: ProjectFile) => (
              <li key={file.id}>
                <Link href={`/translation/${file.id}`}>
                  <a className={cn(
                    "flex items-center px-2 py-2 text-sm rounded-md",
                    fileId === file.id 
                      ? "bg-primary/90 text-primary-foreground"
                      : "hover:bg-accent text-foreground/80 hover:text-foreground"
                  )}>
                    <FileText className="h-4 w-4 mr-2 lg:mr-2 flex-shrink-0" />
                    <span className="hidden lg:block truncate text-xs">{file.name}</span>
                  </a>
                </Link>
              </li>
            ))}
            
            {!currentProject?.files?.length && (
              <li className="px-2 py-2 text-sm text-muted-foreground italic">
                <div className="flex items-center">
                  <FolderOpen className="h-4 w-4 mr-2 lg:mr-2 flex-shrink-0" />
                  <span className="hidden lg:block text-xs">No files</span>
                </div>
              </li>
            )}
          </ul>
        </div>
      )}
      
      {/* Settings Section */}
      <div className="p-3 border-t border-border">
        <Collapsible 
          open={isSettingsOpen} 
          onOpenChange={setIsSettingsOpen}
          className="w-full"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-sidebar-foreground text-xs hidden lg:block">Language Settings</h2>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent>
            <div className="mt-3 hidden lg:block">
              <div className="text-xs text-muted-foreground mb-1">Language Direction</div>
              <div className="flex bg-accent rounded-md p-1 w-full">
                <Button variant="secondary" size="sm" className="flex-1 font-medium text-xs">
                  KO
                </Button>
                <div className="flex items-center px-1">
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                </div>
                <Button variant="ghost" size="sm" className="flex-1 font-medium text-muted-foreground text-xs">
                  EN
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </aside>
  );
}

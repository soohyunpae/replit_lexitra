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
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ProjectFile {
  id: number;
  name: string;
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
  
  const { data: currentProject } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });
  
  return (
    <aside className="w-16 lg:w-64 border-r border-border flex flex-col bg-sidebar h-screen">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sidebar-foreground hidden lg:block">Project Files</h2>
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <PlusCircle className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1">
        <nav className="px-3 py-2">
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
                    <FileText className="h-5 w-5 mr-3 lg:mr-2 flex-shrink-0" />
                    <span className="hidden lg:block truncate">{file.name}</span>
                  </a>
                </Link>
              </li>
            ))}
            
            {!currentProject?.files?.length && (
              <li className="px-2 py-2 text-sm text-muted-foreground italic">
                <div className="flex items-center">
                  <FolderOpen className="h-5 w-5 mr-3 lg:mr-2 flex-shrink-0" />
                  <span className="hidden lg:block">No files available</span>
                </div>
              </li>
            )}
          </ul>
        </nav>
      </div>
      
      {/* System Links */}
      <div className="p-3 border-t border-border">
        <div className="mb-3">
          <h2 className="font-medium text-sidebar-foreground hidden lg:block mb-2">Translation Resources</h2>
          <ul className="space-y-1">
            <li>
              <Link href="/glossary">
                <a className={cn(
                  "flex items-center px-2 py-2 text-sm rounded-md",
                  location === "/glossary" 
                    ? "bg-primary/90 text-primary-foreground"
                    : "hover:bg-accent text-foreground/80 hover:text-foreground"
                )}>
                  <Book className="h-5 w-5 mr-3 lg:mr-2 flex-shrink-0" />
                  <span className="hidden lg:block">Terminology Base</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/tm">
                <a className={cn(
                  "flex items-center px-2 py-2 text-sm rounded-md",
                  location === "/tm" 
                    ? "bg-primary/90 text-primary-foreground"
                    : "hover:bg-accent text-foreground/80 hover:text-foreground"
                )}>
                  <Database className="h-5 w-5 mr-3 lg:mr-2 flex-shrink-0" />
                  <span className="hidden lg:block">Translation Memory</span>
                </a>
              </Link>
            </li>
          </ul>
        </div>
        
        <Collapsible 
          open={isSettingsOpen} 
          onOpenChange={setIsSettingsOpen}
          className="w-full"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-sidebar-foreground hidden lg:block">Project Settings</h2>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="h-5 w-5" />
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent>
            <div className="mt-3 hidden lg:block">
              <div className="text-xs text-muted-foreground mb-1">Language Direction</div>
              <div className="flex bg-accent rounded-md p-1 w-full">
                <Button variant="secondary" size="sm" className="flex-1 font-medium">
                  KO
                </Button>
                <div className="flex items-center px-1">
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                </div>
                <Button variant="ghost" size="sm" className="flex-1 font-medium text-muted-foreground">
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

import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  FileText,
  ChevronsUpDown,
  LogOut,
  PlusCircle,
  FolderOpen,
  Book,
  Database,
  Home,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  Globe,
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
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";

interface ProjectFile {
  id: number;
  name: string;
}

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

// Define the type for sidebar context
type SidebarContextType = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  getCurrentSectionTitle: () => string;
  setActiveSubSection: (section: string) => void;
  activeSubSection: string | null;
};

// Create a context to share sidebar state
export const SidebarContext = React.createContext<SidebarContextType>({
  isCollapsed: false,
  toggleSidebar: () => {},
  getCurrentSectionTitle: () => "",
  setActiveSubSection: () => {},
  activeSubSection: null,
});

export function Sidebar() {
  const [location, navigate] = useLocation();
  const isMobile = useMobile();
  const [isProjectOpen, setIsProjectOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeSubSection, setActiveSubSection] = useState<string | null>(null);
  const { logoutMutation } = useAuth();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  // Get current user
  const { data: user } = useQuery<{
    id: number;
    username: string;
    role?: string;
  }>({
    queryKey: ["/api/user"],
  });

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Get the current project ID from URL if it exists
  const projectMatch = location.match(/\/projects\/(\d+)/);
  const projectId = projectMatch ? parseInt(projectMatch[1]) : null;

  // Get the current file ID from URL if it exists
  const fileMatch = location.match(/\/translation\/(\d+)/);
  const fileId = fileMatch ? parseInt(fileMatch[1]) : null;

  // Only query the current project when on a project page or translation page
  const showProjectContext =
    location.includes("/projects/") || location.includes("/translation/");

  const { data: currentProject } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId && showProjectContext,
  });

  // Main navigation items
  const mainNavItems: NavItem[] = [
    {
      icon: <Home className="h-5 w-5" />,
      label: t('common.home'),
      href: "/",
    },
    {
      icon: <FolderOpen className="h-5 w-5" />,
      label: t('common.projects'),
      href: "/projects",
    },
    {
      icon: <Book className="h-5 w-5" />,
      label: t('common.glossary'),
      href: "/glossaries",
    },
    {
      icon: <Database className="h-5 w-5" />,
      label: t('common.tm'),
      href: "/tm",
    },
  ];

  // Admin navigation items
  const adminNavItems: NavItem[] = [
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      label: t('common.admin'),
      href: "/admin",
    },
  ];

  // Toggle sidebar collapse state
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Get the current section title for the header
  const getCurrentSectionTitle = () => {
    if (location === "/") return t('common.home');
    if (location.startsWith("/projects")) return t('common.projects');
    if (location.startsWith("/termbases") || location.startsWith("/glossaries"))
      return t('common.glossaries');
    if (location.startsWith("/tm")) return t('common.tm');
    if (location.startsWith("/admin")) return t('common.admin');
    return t('common.appName');
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        toggleSidebar,
        getCurrentSectionTitle,
        setActiveSubSection,
        activeSubSection,
      }}
    >
      <aside
        className={cn(
          "border-r border-border flex flex-col bg-sidebar h-screen overflow-y-auto transition-all duration-300",
          isCollapsed ? "w-16" : "w-16 lg:w-64",
        )}
      >
        <div className="py-4 px-3 flex items-center justify-between">
          <div className="flex items-center">
            <svg
              viewBox="0 0 24 24"
              className="text-primary h-8 w-8 mr-0 lg:mr-2 flex-shrink-0"
              fill="currentColor"
            >
              <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
            </svg>
            {!isCollapsed && (
              <h1 className="font-semibold text-lg hidden lg:block">{t('common.appName')}</h1>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hidden lg:flex"
            onClick={toggleSidebar}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <nav>
            <ul className="space-y-2">
              {mainNavItems.map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-lg transition-colors",
                      "text-foreground/70 hover:text-foreground hover:bg-accent/60",
                      {
                        "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground":
                          // Dashboard menu: active on home page
                          (item.label === "Dashboard" && location === "/") ||
                          // Projects menu: active on projects list or project detail page or translation page
                          (item.label === "Projects" &&
                            (location === "/projects" ||
                              /^\/projects\/\d+$/.test(location) ||
                              /^\/translation\/\d+$/.test(location))) ||
                          // Glossaries: active on glossaries or termbases pages
                          (item.label === "Glossaries" &&
                            (location.startsWith("/glossaries") ||
                              location.startsWith("/termbases"))) ||
                          // Translation Memory: active on any TM page
                          (item.label === "Translation Memory" &&
                            location.startsWith("/tm")),
                      },
                    )}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span
                      className={cn(
                        "ml-3 text-sm font-medium",
                        isCollapsed ? "hidden" : "hidden lg:block",
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}

              {/* Admin Menu Items - Only show for admin users */}
              {isAdmin &&
                adminNavItems.map((item, index) => (
                  <li key={`admin-${index}`}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-2.5 rounded-lg transition-colors",
                        "text-foreground/70 hover:text-foreground hover:bg-accent/60",
                        {
                          "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground":
                            // Admin Dashboard: active on admin page or admin subpages
                            location.startsWith("/admin"),
                        },
                      )}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span
                        className={cn(
                          "ml-3 text-sm font-medium",
                          isCollapsed ? "hidden" : "hidden lg:block",
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </div>

        {/* Project Files - Only show when in a project context */}
        {currentProject && (
          <div className="px-3 py-4 border-t border-border">
            <h3
              className={cn(
                "font-medium text-xs text-muted-foreground uppercase tracking-wider mb-3",
                isCollapsed ? "hidden" : "hidden lg:block",
              )}
            >
              {t('projects.files')}
            </h3>

            <ul className="space-y-1">
              {currentProject?.files?.map((file: ProjectFile) => (
                <li key={file.id}>
                  <Link
                    href={`/translation/${file.id}`}
                    className={cn(
                      "flex items-center px-2 py-2 text-sm rounded-md",
                      fileId === file.id
                        ? "bg-primary/90 text-primary-foreground"
                        : "hover:bg-accent text-foreground/80 hover:text-foreground",
                    )}
                  >
                    <FileText className="h-4 w-4 mr-2 lg:mr-2 flex-shrink-0" />
                    <span
                      className={cn(
                        "truncate text-xs",
                        isCollapsed ? "hidden" : "hidden lg:block",
                      )}
                    >
                      {file.name}
                    </span>
                  </Link>
                </li>
              ))}

              {!currentProject?.files?.length && (
                <li className="px-2 py-2 text-sm text-muted-foreground italic">
                  <div className="flex items-center">
                    <FolderOpen className="h-4 w-4 mr-2 lg:mr-2 flex-shrink-0" />
                    <span
                      className={cn(
                        "text-xs",
                        isCollapsed ? "hidden" : "hidden lg:block",
                      )}
                    >
                      {t('projects.noFiles')}
                    </span>
                  </div>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* User Account Section */}
        <div className="mt-auto px-3 py-4 border-t border-border">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "p-0 rounded-full flex items-center justify-center",
                    isCollapsed ? "w-8 h-8" : "w-full justify-start px-3 py-2",
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full bg-primary text-white font-medium flex items-center justify-center text-sm",
                      !isCollapsed && "mr-3",
                    )}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  {!isCollapsed && (
                    <span className="text-sm">{user.username}</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile">{t('common.myAccount')}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    logoutMutation.mutate();
                  }}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  {logoutMutation.isPending ? t('common.loading') : t('common.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/auth")}
              className="w-full"
            >
              {t('common.login')}
            </Button>
          )}
        </div>
      </aside>
    </SidebarContext.Provider>
  );
}
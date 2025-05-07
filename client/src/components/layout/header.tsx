import React, { useState, useContext } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useThemeToggle } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import {
  Moon,
  Sun,
  Search,
  Settings,
  Menu,
  UserCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { SidebarContext } from "./sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

interface HeaderProps {
  title?: string;
  showSidebarTrigger?: boolean;
}

interface Breadcrumb {
  label: string;
  href: string;
  active?: boolean;
}

export function Header({
  title = "Lexitra",
  showSidebarTrigger = true,
}: HeaderProps) {
  const { toggleTheme, isDarkMode, mounted } = useThemeToggle();
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const { isCollapsed, getCurrentSectionTitle } = useContext(SidebarContext);

  // Generate breadcrumbs based on current location
  const getBreadcrumbs = (): Breadcrumb[] | null => {
    // If we're on homepage, don't show breadcrumbs
    if (location === "/") return null;

    const paths = location.split("/").filter(Boolean);
    const breadcrumbs: Breadcrumb[] = [];

    // Add home as first breadcrumb
    breadcrumbs.push({
      label: "Home",
      href: "/",
    });

    // Special handling for tabbed pages
    if (paths[0] === "tm") {
      breadcrumbs.push({
        label: "Translation Memory",
        href: "/tm",
        active: paths.length === 1,
      });

      if (paths[1] === "resources") {
        breadcrumbs.push({
          label: "TM List",
          href: "/tm/resources",
          active: true,
        });
      } else if (paths.length === 1) {
        breadcrumbs.push({
          label: "TM Entries",
          href: "/tm",
          active: true,
        });
      }
      return breadcrumbs;
    }

    if (paths[0] === "termbases") {
      breadcrumbs.push({
        label: "Termbases",
        href: "/termbases",
        active: paths.length === 1,
      });

      if (paths[1] === "resources") {
        breadcrumbs.push({
          label: "Termbase List",
          href: "/termbases/resources",
          active: true,
        });
      } else if (paths[1] === "entries") {
        breadcrumbs.push({
          label: "Glossary Entries",
          href: "/termbases/entries",
          active: true,
        });
      }
      return breadcrumbs;
    }

    // Build path progressively for other pages
    let currentPath = "";
    paths.forEach((path, index) => {
      currentPath += `/${path}`;

      // Check if this is a project ID
      const isProjectId = /^\d+$/.test(path) && paths[index - 1] === "projects";
      // Check if this is a file ID
      const isFileId = /^\d+$/.test(path) && paths[index - 1] === "translation";

      // Skip numeric IDs in the breadcrumb labels
      let label = path;
      if (isProjectId) {
        label = "Project Details";
      } else if (isFileId) {
        label = "Translation Editor";
      } else {
        // Capitalize first letter
        label = path.charAt(0).toUpperCase() + path.slice(1);
      }

      breadcrumbs.push({
        label,
        href: currentPath,
        active: index === paths.length - 1,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="bg-card border-b border-border py-2 px-4 flex flex-col space-y-2">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-2">
          {showSidebarTrigger && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <Sidebar />
              </SheetContent>
            </Sheet>
          )}

          {!breadcrumbs && (
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <h1 className="text-xl font-semibold">
                  {isCollapsed ? getCurrentSectionTitle() : title}
                </h1>
              </div>
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {mounted && isDarkMode ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>

          <Link href="/settings">
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative p-1 rounded-full">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">My Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/auth")}
            >
              Login
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center text-sm text-muted-foreground">
        {breadcrumbs ? (
          breadcrumbs.map((item, index) => (
            <React.Fragment key={item.href}>
              <Link
                href={item.href}
                className={`hover:text-foreground ${item.active ? "font-medium text-foreground" : ""}`}
              >
                {item.label}
              </Link>
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="h-4 w-4 mx-2" />
              )}
            </React.Fragment>
          ))
        ) : (
          <Link href="/" className="hover:text-foreground">
            Lexitra
          </Link>
        )}
      </div>
    </header>
  );
}
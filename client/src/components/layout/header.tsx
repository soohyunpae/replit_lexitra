import React, { useState, useContext } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useThemeToggle } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { Moon, Sun, Search, Settings, Menu, UserCircle, LogOut, ChevronRight } from "lucide-react";
import { SidebarContext } from "./sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { useTranslation } from "react-i18next";

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
  showSidebarTrigger = true
}: HeaderProps) {
  const { toggleTheme, isDarkMode, mounted } = useThemeToggle();
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const { isCollapsed, getCurrentSectionTitle, activeSubSection } = useContext(SidebarContext);
  const { i18n } = useTranslation();

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

    // Build path progressively
    let currentPath = "";
    paths.forEach((path, index) => {
      currentPath += `/${path}`;

      // Check if this is a project ID
      const isProjectId = /^\d+$/.test(path) && paths[index-1] === "projects";
      // Check if this is a file ID
      const isFileId = /^\d+$/.test(path) && paths[index-1] === "translation";

      // Skip numeric IDs in the breadcrumb labels
      let label = path;
      if (isProjectId) {
        label = "Project Details";
      } else if (isFileId) {
        label = "Translation Editor";
      } else {
        // 활성화된 부제목이 있으면 표시 (TM, Admin, Glossaries 섹션)
        if (index === paths.length - 1 && activeSubSection && 
            (paths[index] === "tm" || paths[index] === "admin" || 
             paths[index] === "termbases" || paths[index] === "glossaries")) {
          label = activeSubSection;
        } else {
          // Capitalize first letter
          label = path.charAt(0).toUpperCase() + path.slice(1);
        }
      }

      breadcrumbs.push({
        label,
        href: currentPath,
        active: index === paths.length - 1
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="bg-card border-b border-border py-1 px-4">
      <div className="flex items-center justify-between w-full h-10">
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
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="h-8 w-8"
          >
            {mounted && isDarkMode ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {/* Settings 버튼 제거 */}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative p-1 rounded-full h-8 w-8">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm">
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
    </header>
  );
}
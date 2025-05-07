import React, { useContext } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useThemeToggle } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { Moon, Sun, Settings, Menu, LogOut } from "lucide-react";
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

interface HeaderProps {
  title?: string;
  showSidebarTrigger?: boolean;
  children?: React.ReactNode;
}

export function Header({ 
  title = "Lexitra", 
  showSidebarTrigger = true,
  children
}: HeaderProps) {
  const { toggleTheme, isDarkMode, mounted } = useThemeToggle();
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const { isCollapsed, getCurrentSectionTitle } = useContext(SidebarContext);

  // Get page title from current section if collapsed
  const displayTitle = isCollapsed ? getCurrentSectionTitle() : title;

  return (
    <header className="bg-card border-b border-border py-4 px-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          {showSidebarTrigger && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden mr-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <Sidebar />
              </SheetContent>
            </Sheet>
          )}

          {/* Page Title - Always shown and positioned on the left */}
          <h1 className="text-xl font-semibold">
            {displayTitle}
          </h1>
        </div>
      
        <div className="flex items-center">
          {/* Action Buttons (Passed as children) */}
          {children && (
            <div className="mr-6">
              {children}
            </div>
          )}
          
          {/* Global Actions (Theme, Settings, Account) */}
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
      </div>
    </header>
  );
}

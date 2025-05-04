import React, { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useThemeToggle } from "@/hooks/use-theme";
import { Moon, Sun, Search, Settings, Menu } from "lucide-react";
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
  showSearch?: boolean;
  showSidebarTrigger?: boolean;
}

export function Header({ 
  title = "Lexitra", 
  showSearch = true,
  showSidebarTrigger = true
}: HeaderProps) {
  const { toggleTheme, isDarkMode, mounted } = useThemeToggle();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="bg-card border-b border-border py-2 px-4 flex items-center justify-between">
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

        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <svg 
              viewBox="0 0 24 24" 
              className="text-primary h-6 w-6 mr-2"
              fill="currentColor"
            >
              <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
            </svg>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
        </Link>
        <span className="text-xs bg-accent px-2 py-1 rounded text-muted-foreground">1.0.0</span>
      </div>
      
      <div className="flex items-center space-x-3">
        {showSearch && (
          <div className="relative md:block hidden">
            <div className="flex items-center bg-accent rounded-lg px-3 py-1.5 text-sm">
              <Search className="text-muted-foreground h-4 w-4 mr-2" />
              <Input 
                type="text" 
                placeholder="Search in TM..." 
                className="bg-transparent border-none focus:outline-none h-7 placeholder:text-muted-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}
        
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
        
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative p-1 rounded-full">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm">
                JD
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Your Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

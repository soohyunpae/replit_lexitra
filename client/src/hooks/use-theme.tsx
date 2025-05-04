import { useEffect, useState } from "react";
import { useTheme } from "@/components/ui/theme-provider";

export function useThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Ensure component is mounted before accessing window/localStorage
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Toggle between light and dark mode
  const toggleTheme = () => {
    if (!mounted) return;
    
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };
  
  const isDarkMode = mounted && (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));
  
  return { toggleTheme, isDarkMode, mounted };
}

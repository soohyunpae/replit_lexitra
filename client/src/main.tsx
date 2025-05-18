import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n"; // Import i18n configuration
import { ThemeProvider } from "@/components/ui/theme-provider";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light">
    <App />
  </ThemeProvider>
);

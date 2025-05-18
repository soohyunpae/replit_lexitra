import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import i18n from "./i18n"; // Import i18n configuration
import { I18nextProvider } from "react-i18next";
import { ThemeProvider } from "@/components/ui/theme-provider";

createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}>
    <ThemeProvider defaultTheme="light">
      <App />
    </ThemeProvider>
  </I18nextProvider>
);

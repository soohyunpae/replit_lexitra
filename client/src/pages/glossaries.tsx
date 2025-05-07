import React, { useEffect } from "react";
import { useLocation } from "wouter";

// This page serves as a redirector to glossaries (updated from termbases)
export default function GlossaryPage() {
  // Navigate to glossary entries by default
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/glossaries/entries");
  }, [navigate]);

  return null; // We immediately redirect, so no need to render anything
}
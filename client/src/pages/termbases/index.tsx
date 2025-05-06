import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Book, FileText, Tag } from "lucide-react";
import { Link } from "wouter";

// This page serves as a redirector to termbases features
export default function TermbasesIndexPage() {
  // Navigate to entries by default
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/termbases/entries");
  }, [navigate]);

  return (
    <MainLayout title="Termbases">
      <div className="container max-w-screen-xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-2">
          <Book className="h-5 w-5" />
          <h2 className="text-3xl font-bold tracking-tight">Termbases</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          Manage termbases and glossary entries
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5" />
              <h3 className="text-xl font-semibold">Glossary Entries</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Manage glossary entries, source and target terms
            </p>
            <Link href="/termbases/entries">
              <Button className="w-full">Go to Glossary Entries</Button>
            </Link>
          </div>

          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-5 w-5" />
              <h3 className="text-xl font-semibold">Termbases</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Manage termbases, domains, and language pairs
            </p>
            <Link href="/termbases/resources">
              <Button className="w-full">Go to Termbases</Button>
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <div className="text-sm text-muted-foreground">
            Redirecting to Glossary Entries...
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

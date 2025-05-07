import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Book, FileText, Tag } from "lucide-react";
import { Link } from "wouter";

// This page serves as a redirector to glossaries features
export default function GlossariesIndexPage() {
  // Navigate to entries by default
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/glossaries/entries");
  }, [navigate]);

  return (
    <MainLayout title="Glossaries">
      <div className="container max-w-screen-xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-2">
          <Book className="h-5 w-5" />
          <h2 className="text-3xl font-bold tracking-tight">Glossaries</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          Manage glossary entries and list
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
            <Link href="/glossaries/entries">
              <Button className="w-full">Go to Glossary Entries</Button>
            </Link>
          </div>

          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-5 w-5" />
              <h3 className="text-xl font-semibold">Glossary List</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Manage glossary list, domains, and language pairs
            </p>
            <Link href="/glossaries/resources">
              <Button className="w-full">Go to Glossary List</Button>
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

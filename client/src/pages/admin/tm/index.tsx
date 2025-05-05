import React, { useState } from "react";
import { Redirect } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Database, ArrowUpDown, FileHeart, Loader2 } from "lucide-react";
import TMUpload from "./upload";
import TMAlignment from "./alignment";
import TMCleanup from "./cleanup";

export default function TranslationMemoryHub() {
  const { user, isLoading } = useAuth();
  const [activeSection, setActiveSection] = useState<string>("upload");

  // Loading state
  if (isLoading) {
    return (
      <MainLayout title="Translation Memory Management">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </MainLayout>
    );
  }

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return (
    <MainLayout title="Translation Memory Management">
      <div className="container py-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Translation Memory Management</h1>
          </div>
          <p className="text-muted-foreground">
            Upload, align, and manage translation memory entries for use in translation projects.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>TM Management Tools</CardTitle>
            <CardDescription>
              Select a tool to work with translation memory data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full" value={activeSection} onValueChange={setActiveSection}>
              <AccordionItem value="upload" className="border rounded-md mb-4 px-4">
                <AccordionTrigger className="py-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    <span className="text-lg font-medium">TM Upload</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6">
                  <TMUpload embedded={true} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="alignment" className="border rounded-md mb-4 px-4">
                <AccordionTrigger className="py-4">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-5 w-5" />
                    <span className="text-lg font-medium">Bilingual Alignment</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6">
                  <TMAlignment embedded={true} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cleanup" className="border rounded-md mb-4 px-4">
                <AccordionTrigger className="py-4">
                  <div className="flex items-center gap-2">
                    <FileHeart className="h-5 w-5" />
                    <span className="text-lg font-medium">TM Cleanup</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6">
                  <TMCleanup embedded={true} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4 text-sm text-muted-foreground">
            <span>Translation Memory Management</span>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
}

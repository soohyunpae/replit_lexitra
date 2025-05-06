import React, { useState } from "react";
import { useLocation, Link, Redirect } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Suspense } from "react";
import {
  Database,
  AlignLeft,
  FileText,
  Upload,
  FileHeart,
  Lock,
  Loader2,
  FileType,
  FilePlus2,
  FileOutput,
} from "lucide-react";

interface AdminLink {
  name: string;
  path: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface AdminModule {
  title: string;
  description: string;
  icon: React.ReactNode;
  links: AdminLink[];
}

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("translation-memory");

  // Show loading state
  if (isLoading) {
    return (
      <MainLayout title="Admin Dashboard">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </MainLayout>
    );
  }

  // Check if user is admin
  if (!user || user.role !== "admin") {
    return (
      <MainLayout title="Access Denied">
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-center">
                Admin Access Required
              </CardTitle>
              <CardDescription className="text-center">
                You don't have permission to access the admin dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/")} className="w-full">
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Import components for embedded mode
  const TMUpload = React.lazy(() => import("./tm/upload"));
  const TMAlignment = React.lazy(() => import("./tm/alignment"));
  const TMCleanup = React.lazy(() => import("./tm/cleanup"));
  const PDFProcessing = React.lazy(() => import("./file/pdf"));
  const FileConversion = React.lazy(() => import("./file/conversion"));

  // Define the module/category structure
  const adminModules: AdminModule[] = [
    {
      title: "TM Management",
      description:
        "Manage TM assets, align files, clean duplicates",
      icon: <Database className="h-6 w-6" />,
      links: [
        {
          name: "TM Upload",
          path: "tm-upload",
          icon: <Upload className="h-4 w-4" />,
        },
        {
          name: "Bilingual Alignment",
          path: "tm-alignment",
          icon: <AlignLeft className="h-4 w-4" />,
        },
        {
          name: "TM Cleanup",
          path: "tm-cleanup",
          icon: <FileHeart className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "File Processing",
      description:
        "Convert or prepare files (PDFs, DOCX, etc.) before translation",
      icon: <FileText className="h-6 w-6" />,
      links: [
        {
          name: "PDF Processing",
          path: "pdf-processing",
          icon: <FileType className="h-4 w-4" />,
        },
        {
          name: "File Format Conversion",
          path: "file-conversion",
          icon: <FileOutput className="h-4 w-4" />,
        },
      ],
    },
  ];

  // State for accordion sections
  const [tmActiveSection, setTmActiveSection] = useState<string>("");
  const [fileActiveSection, setFileActiveSection] = useState<string>("");

  return (
    <MainLayout title="Admin Tools">
      <div className="container max-w-screen-xl mx-auto p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl font-bold">Admin Tools</h1>
          <p className="text-muted-foreground">
            Manage TMs and preprocess files
          </p>
        </div>

        <div className="bg-background">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger
                  value="translation-memory"
                  className="flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  <span>TM Management</span>
                </TabsTrigger>
                <TabsTrigger
                  value="file-preprocessing"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>File Processing</span>
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <div className="py-6">
              {/* Translation Memory Tab Content */}
              <TabsContent value="translation-memory" className="m-0 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {adminModules[0].icon}
                    <h3 className="text-lg font-medium">
                      {adminModules[0].title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {adminModules[0].description}
                  </p>
                </div>

                <Accordion
                  type="single"
                  collapsible
                  className="w-full"
                  value={tmActiveSection}
                  onValueChange={setTmActiveSection}
                >
                  {/* TM Upload */}
                  <AccordionItem
                    value="tm-upload"
                    className="border rounded-md mb-4 px-4"
                  >
                    <AccordionTrigger className="py-4">
                      <div className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        <span className="text-lg font-medium">
                          TM Upload
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6">
                      <Suspense
                        fallback={
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        }
                      >
                        <TMUpload embedded={true} />
                      </Suspense>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Bilingual Alignment */}
                  <AccordionItem
                    value="tm-alignment"
                    className="border rounded-md mb-4 px-4"
                  >
                    <AccordionTrigger className="py-4">
                      <div className="flex items-center gap-2">
                        <AlignLeft className="h-5 w-5" />
                        <span className="text-lg font-medium">
                          Bilingual Alignment
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6">
                      <Suspense
                        fallback={
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        }
                      >
                        <TMAlignment embedded={true} />
                      </Suspense>
                    </AccordionContent>
                  </AccordionItem>

                  {/* TM Cleanup */}
                  <AccordionItem
                    value="tm-cleanup"
                    className="border rounded-md mb-4 px-4"
                  >
                    <AccordionTrigger className="py-4">
                      <div className="flex items-center gap-2">
                        <FileHeart className="h-5 w-5" />
                        <span className="text-lg font-medium">TM Cleanup</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6">
                      <Suspense
                        fallback={
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        }
                      >
                        <TMCleanup embedded={true} />
                      </Suspense>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              {/* File Processing Tab Content */}
              <TabsContent value="file-preprocessing" className="m-0 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {adminModules[1].icon}
                    <h3 className="text-lg font-medium">
                      {adminModules[1].title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {adminModules[1].description}
                  </p>
                </div>

                <Accordion
                  type="single"
                  collapsible
                  className="w-full"
                  value={fileActiveSection}
                  onValueChange={setFileActiveSection}
                >
                  {/* PDF Processing */}
                  <AccordionItem
                    value="pdf-processing"
                    className="border rounded-md mb-4 px-4"
                  >
                    <AccordionTrigger className="py-4">
                      <div className="flex items-center gap-2">
                        <FileType className="h-5 w-5" />
                        <span className="text-lg font-medium">
                          PDF Processing
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6">
                      <Suspense
                        fallback={
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        }
                      >
                        <PDFProcessing embedded={true} />
                      </Suspense>
                    </AccordionContent>
                  </AccordionItem>

                  {/* File Format Conversion */}
                  <AccordionItem
                    value="file-conversion"
                    className="border rounded-md mb-4 px-4"
                  >
                    <AccordionTrigger className="py-4">
                      <div className="flex items-center gap-2">
                        <FileOutput className="h-5 w-5" />
                        <span className="text-lg font-medium">
                          File Format Conversion
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6">
                      <Suspense
                        fallback={
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        }
                      >
                        <FileConversion embedded={true} />
                      </Suspense>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}

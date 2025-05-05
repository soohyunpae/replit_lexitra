import React, { useState } from "react";
import { useLocation, Link, Redirect } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, AlignLeft, FileText, Upload, FileHeart, Lock, Loader2, FileType, FilePlus2, FileOutput } from "lucide-react";

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
  if (!user || user.role !== 'admin') {
    return (
      <MainLayout title="Access Denied">
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-center">Admin Access Required</CardTitle>
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

  // Define the module/category structure
  const adminModules: AdminModule[] = [
    {
      title: "Translation Memory",
      description: "Manage translation memory resources",
      icon: <Database className="h-6 w-6" />,
      links: [
        { name: "TM Upload", path: "/admin/tm/upload", icon: <Upload className="h-4 w-4" /> },
        { name: "Bilingual Alignment", path: "/admin/tm/alignment", icon: <AlignLeft className="h-4 w-4" /> },
        { name: "TM Cleanup", path: "/admin/tm/cleanup", icon: <FileHeart className="h-4 w-4" /> },
      ],
    },
    {
      title: "File Processing",
      description: "Process and convert files for translation projects",
      icon: <FileText className="h-6 w-6" />,
      links: [
        { name: "File Processing Center", path: "/admin/file", icon: <FileText className="h-4 w-4" /> },
      ],
    },
  ];

  return (
    <MainLayout title="Admin Dashboard">
      <div className="container py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to the Lexitra admin dashboard. Here you can manage translation memory resources
            and process different types of files for translation projects.
          </p>
        </div>

        <Card className="overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-0">
              <CardTitle>Management Tools</CardTitle>
              <CardDescription>
                Control and manage translation memory and file processing tools
              </CardDescription>
              <TabsList className="mt-4 grid w-full grid-cols-2">
                <TabsTrigger value="translation-memory" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>Translation Memory</span>
                </TabsTrigger>
                <TabsTrigger value="file-preprocessing" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>File Processing</span>
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-6 pb-4">
              {adminModules.map((module, index) => (
                <TabsContent key={module.title} value={index === 0 ? "translation-memory" : "file-preprocessing"} className="m-0">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {module.icon}
                        <h3 className="text-lg font-medium">{module.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {module.links.map((link) => (
                        link.disabled ? (
                          <div key={link.path}>
                            <Button
                              variant="outline"
                              className="w-full justify-start h-auto py-3 opacity-60 cursor-not-allowed"
                              disabled
                            >
                              <div className="flex items-center gap-2">
                                {link.icon}
                                <span>{link.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">개발 중</span>
                              </div>
                            </Button>
                          </div>
                        ) : (
                          <Link key={link.path} href={link.path}>
                            <Button
                              variant="outline"
                              className="w-full justify-start h-auto py-3"
                            >
                              <div className="flex items-center gap-2">
                                {link.icon}
                                <span>{link.name}</span>
                              </div>
                            </Button>
                          </Link>
                        )
                      ))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </CardContent>

            <CardFooter className="border-t pt-4 text-sm text-muted-foreground">
              Access additional tools and features from the sidebar menu
            </CardFooter>
          </Tabs>
        </Card>
      </div>
    </MainLayout>
  );
}

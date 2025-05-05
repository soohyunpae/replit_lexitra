import React from "react";
import { useLocation, Link, Redirect } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, AlignLeft, BarChart3, Book, Settings, Upload, FileHeart, SearchCode, Lock, Loader2 } from "lucide-react";

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

  const adminModules: AdminModule[] = [
    {
      title: "TM Tools",
      description: "Manage translation memory resources",
      icon: <Database className="h-6 w-6" />,
      links: [
        { name: "TM Upload", path: "/admin/tm/upload", icon: <Upload className="h-4 w-4" /> },
        { name: "Bilingual Alignment", path: "/admin/tm/alignment", icon: <AlignLeft className="h-4 w-4" /> },
        { name: "TM Cleanup", path: "/admin/tm/cleanup", icon: <FileHeart className="h-4 w-4" /> },
      ],
    },
    {
      title: "TB Tools",
      description: "Manage terminology base resources",
      icon: <Book className="h-6 w-6" />,
      links: [
        { name: "Manage Terms", path: "/admin/tb/manage", icon: <SearchCode className="h-4 w-4" />, disabled: true },
      ],
    },
    {
      title: "System Settings",
      description: "Configure application settings",
      icon: <Settings className="h-6 w-6" />,
      links: [
        { name: "General Settings", path: "/admin/settings", icon: <Settings className="h-4 w-4" />, disabled: true },
      ],
    },
  ];

  return (
    <MainLayout title="Admin Dashboard">
      <div className="container py-6 space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Lexitra admin dashboard. Here you can manage translation memory resources,
          terminology bases, and system settings.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {adminModules.map((module) => (
            <Card key={module.title} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-2">
                  {module.icon}
                  <CardTitle>{module.title}</CardTitle>
                </div>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

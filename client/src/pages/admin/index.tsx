import React from "react";
import { useRoute, Link } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, AlignLeft, BarChart3, Book, Settings, Upload, FileHeart, SearchCode, Lock } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

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

  const adminModules = [
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
        { name: "Manage Terms", path: "/admin/tb/manage", icon: <SearchCode className="h-4 w-4" /> },
      ],
    },
    {
      title: "System Settings",
      description: "Configure application settings",
      icon: <Settings className="h-6 w-6" />,
      links: [
        { name: "General Settings", path: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
      ],
    },
    {
      title: "Analytics",
      description: "View usage statistics and reports",
      icon: <BarChart3 className="h-6 w-6" />,
      links: [
        { name: "Usage Reports", path: "/admin/analytics", icon: <BarChart3 className="h-4 w-4" /> },
      ],
    },
  ];

  return (
    <MainLayout title="Admin Dashboard">
      <div className="container py-6 space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Lexitra admin dashboard. Here you can manage translation memory,
          terminology bases, system settings, and view analytics.
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

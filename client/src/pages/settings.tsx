import React from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useThemeToggle } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Moon, Sun } from "lucide-react";

export default function SettingsPage() {
  // Get user information
  const { user } = useAuth();
  
  // Get theme toggle functionality
  const { isDarkMode, toggleTheme } = useThemeToggle();
  
  return (
    <MainLayout title="Settings">
      <div className="container max-w-screen-lg mx-auto p-6">
        <div className="flex items-center mb-6">
          <Settings className="h-6 w-6 mr-2" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
          
          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure general appearance and behavior preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Appearance</h3>
                    <p className="text-sm text-muted-foreground">Customize the look and feel of the application.</p>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">Switch between light and dark themes.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Sun className="h-4 w-4 text-muted-foreground" />
                      <Switch 
                        checked={isDarkMode}
                        onCheckedChange={toggleTheme}
                      />
                      <Moon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <Separator />

                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      API Keys and Language Settings have been moved to Admin Tools.
                      {user?.role === 'admin' ? (
                        <Link to="/admin" className="text-primary ml-1 hover:underline">
                          Go to Admin Tools
                        </Link>
                      ) : null}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

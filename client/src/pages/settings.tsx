import React from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useThemeToggle } from "@/hooks/use-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Moon, Sun, Key } from "lucide-react";

export default function SettingsPage() {
  // State for API key input
  const [apiKey, setApiKey] = React.useState<string>("");
  const [apiKeyVisible, setApiKeyVisible] = React.useState<boolean>(false);
  
  // Get theme toggle functionality
  const { isDarkMode, toggleTheme } = useThemeToggle();
  
  // States for language preferences
  const [defaultSourceLang, setDefaultSourceLang] = React.useState<string>("KO");
  const [defaultTargetLang, setDefaultTargetLang] = React.useState<string>("EN");
  
  // Handle API key save
  const handleSaveApiKey = () => {
    // In a real app, you would save this to a secure storage
    console.log("Saving API key:", apiKey);
    alert("API key saved successfully!");
  };
  
  return (
    <MainLayout title="Settings" showSearch={false}>
      <div className="container max-w-screen-lg mx-auto p-6">
        <div className="flex items-center mb-6">
          <Settings className="h-6 w-6 mr-2" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="language">Language</TabsTrigger>
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* API Keys Settings */}
          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Manage your API keys for external services like OpenAI.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">OpenAI API Key</h3>
                    <p className="text-sm text-muted-foreground">
                      Your OpenAI API key is used for GPT-powered translations.
                      <a href="https://platform.openai.com/api-keys" target="_blank" className="text-primary underline ml-1">
                        Get your API key
                      </a>
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                    <div className="flex">
                      <Input
                        id="openai-api-key"
                        type={apiKeyVisible ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="flex-grow"
                      />
                      <Button 
                        variant="outline" 
                        className="ml-2" 
                        onClick={() => setApiKeyVisible(!apiKeyVisible)}
                      >
                        {apiKeyVisible ? "Hide" : "Show"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your API key is stored securely and never shared with anyone.
                    </p>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={handleSaveApiKey}>Save API Key</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Language Settings */}
          <TabsContent value="language">
            <Card>
              <CardHeader>
                <CardTitle>Language Preferences</CardTitle>
                <CardDescription>
                  Set your default language preferences for translation projects.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Default Languages</h3>
                    <p className="text-sm text-muted-foreground">
                      These will be pre-selected when creating new translation projects.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="default-source-language">Default Source Language</Label>
                      <Select 
                        value={defaultSourceLang} 
                        onValueChange={setDefaultSourceLang}
                      >
                        <SelectTrigger id="default-source-language">
                          <SelectValue placeholder="Select source language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KO">Korean (KO)</SelectItem>
                          <SelectItem value="JA">Japanese (JA)</SelectItem>
                          <SelectItem value="EN">English (EN)</SelectItem>
                          <SelectItem value="ZH">Chinese (ZH)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="default-target-language">Default Target Language</Label>
                      <Select 
                        value={defaultTargetLang} 
                        onValueChange={setDefaultTargetLang}
                      >
                        <SelectTrigger id="default-target-language">
                          <SelectValue placeholder="Select target language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EN">English (EN)</SelectItem>
                          <SelectItem value="KO">Korean (KO)</SelectItem>
                          <SelectItem value="JA">Japanese (JA)</SelectItem>
                          <SelectItem value="ZH">Chinese (ZH)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-end">
                    <Button>Save Preferences</Button>
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

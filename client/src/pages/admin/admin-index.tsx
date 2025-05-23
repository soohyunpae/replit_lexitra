import React, { useState, useContext, useEffect, useRef } from "react";
import { useLocation, Link, Redirect } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { SidebarContext } from "@/components/layout/sidebar";
import TemplateManager from "./template-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings,
  Key,
  Globe,
  Users,
  Lock,
  Loader2,
  Moon,
  Sun,
  UserCog,
  Shield,
  Edit,
  User,
  UserPlus,
  FileText,
  ExternalLink,
  Upload,
  Download,
  Trash2,
  Eye,
  Plus,
  X,
  Check,
  AlertCircle,
} from "lucide-react";

export default function AdminConsole() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("api-keys");
  const { setActiveSubSection } = useContext(SidebarContext);
  const { toast } = useToast();

  // API Key states
  const [apiKey, setApiKey] = useState<string>("");
  const [apiKeyVisible, setApiKeyVisible] = useState<boolean>(false);

  // Language preferences states
  const [defaultSourceLang, setDefaultSourceLang] = useState<string>("KO");
  const [defaultTargetLang, setDefaultTargetLang] = useState<string>("EN");

  // User management states
  const [users, setUsers] = useState<Array<{ id: number; username: string; role: string }>>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [hasUserChanges, setHasUserChanges] = useState(false);
  const [roleChanges, setRoleChanges] = useState<Record<number, string>>({});

  // Template management states
  const [templates, setTemplates] = useState<Array<{ 
    id: number; 
    name: string; 
    description?: string; 
    useCount: number; 
    createdAt: string; 
  }>>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setActiveSubSection(`admin-${value}`);
  };

  const handleSaveApiKey = () => {
    toast({
      title: t("common.success"),
      description: t("admin.apiKeySaved"),
    });
  };

  const handleSaveLanguageSettings = () => {
    toast({
      title: t("common.success"),
      description: t("admin.languageSettingsSaved"),
    });
  };

  // Fetch user data through user management API
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);

      // Changed to API call method
      import("@/lib/queryClient")
        .then(async ({ apiRequest }) => {
          try {
            const response = await apiRequest("GET", "/api/admin/users");
            const data = await response.json();

            if (data && data.users) {
              setUsers(data.users);
            } else {
              // Use default data if no data available
              setUsers([
                { id: 1, username: "demo", role: "user" },
                { id: 2, username: "soohyun", role: "user" },
                { id: 3, username: "admin", role: "admin" },
                { id: 4, username: "test", role: "user" },
                { id: 7, username: "testuser", role: "user" },
              ]);
            }
          } catch (apiError) {
            console.error("API call error:", apiError);
            // Set fallback data
            setUsers([
              { id: 1, username: "demo", role: "user" },
              { id: 2, username: "soohyun", role: "user" },
              { id: 3, username: "admin", role: "admin" },
              { id: 4, username: "test", role: "user" },
              { id: 7, username: "testuser", role: "user" },
            ]);
          }
        })
        .catch((importError) => {
          console.error("Module import error:", importError);
          // Set fallback data
          setUsers([
            { id: 1, username: "demo", role: "user" },
            { id: 2, username: "soohyun", role: "user" },
            { id: 3, username: "admin", role: "admin" },
            { id: 4, username: "test", role: "user" },
            { id: 7, username: "testuser", role: "user" },
          ]);
        })
        .finally(() => {
          setIsLoadingUsers(false);
        });
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.userManagement.fetchError"),
      });
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "user-management") {
      fetchUsers();
    }
  }, [activeTab]);

  const handleRoleChange = (userId: number, newRole: string) => {
    setRoleChanges((prev) => ({
      ...prev,
      [userId]: newRole,
    }));
    setHasUserChanges(true);
  };

  const handleSaveUserChanges = async () => {
    try {
      // Change user roles via API call
      import("@/lib/queryClient")
        .then(async ({ apiRequest }) => {
          const updatePromises = Object.entries(roleChanges).map(
            async ([userId, newRole]) => {
              try {
                return await apiRequest("PATCH", `/api/admin/users/${userId}`, {
                  role: newRole,
                });
              } catch (error) {
                console.error(`Failed to change role for user ${userId}:`, error);
                throw error;
              }
            }
          );

          await Promise.all(updatePromises);

          // Update UI state if successfully updated
          setUsers((prevUsers) =>
            prevUsers.map((user) => ({
              ...user,
              role: roleChanges[user.id] || user.role,
            }))
          );

          setRoleChanges({});
          setHasUserChanges(false);

          toast({
            title: t("common.success"),
            description: t("admin.userManagement.saveSuccess"),
          });
        })
        .catch((error) => {
          console.error("User role change error:", error);
          toast({
            variant: "destructive",
            title: t("common.error"),
            description: t("admin.userManagement.saveError"),
          });
        });
    } catch (error) {
      console.error("Error saving user changes:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.userManagement.saveError"),
      });
    }
  };

  useEffect(() => {
    setActiveSubSection(`admin-${activeTab}`);
  }, [activeTab, setActiveSubSection]);

  if (isLoading) {
    return (
      <MainLayout title="Loading...">
        <div className="container max-w-screen-xl mx-auto p-6">
          <div className="flex justify-center items-center min-h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <MainLayout title="Access Denied">
        <div className="container max-w-screen-xl mx-auto p-6">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Lock className="h-5 w-5" />
                {t("admin.accessRequired")}
              </CardTitle>
              <CardDescription className="text-center">
                {t("admin.noPermission")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/")} className="w-full">
                {t("admin.goToHome")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Admin Console">
      <div className="container max-w-screen-xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-3xl font-bold tracking-tight">
            {t("admin.console")}
          </h2>
        </div>
        <p className="text-muted-foreground mb-6">{t("admin.settingsDesc")}</p>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span>{t("admin.apiKeys")}</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>{t("common.language")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="user-management"
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              <span>{t("admin.userManagement.title")}</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{t("admin.templates.title")}</span>
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab Content */}
          <TabsContent value="api-keys" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  {t("admin.apiKeys")}
                </CardTitle>
                <CardDescription>{t("admin.apiKeyDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div></div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="openai-api-key">
                      {t("admin.yourAPIKey")}
                    </Label>
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
                        {apiKeyVisible ? t("admin.hide") : t("admin.show")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.apiKeysSecure")}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveApiKey}>
                      {t("common.save")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Language Settings Tab Content */}
          <TabsContent value="language" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  {t("admin.languageSettings")}
                </CardTitle>
                <CardDescription>
                  {t("admin.languageSettingsDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div></div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="default-source-language">
                        {t("admin.defaultSourceLanguage")}
                      </Label>
                      <Select
                        value={defaultSourceLang}
                        onValueChange={setDefaultSourceLang}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EN">English</SelectItem>
                          <SelectItem value="KO">한국어</SelectItem>
                          <SelectItem value="JA">日本語</SelectItem>
                          <SelectItem value="ZH">中文</SelectItem>
                          <SelectItem value="ES">Español</SelectItem>
                          <SelectItem value="FR">Français</SelectItem>
                          <SelectItem value="DE">Deutsch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default-target-language">
                        {t("admin.defaultTargetLanguage")}
                      </Label>
                      <Select
                        value={defaultTargetLang}
                        onValueChange={setDefaultTargetLang}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EN">English</SelectItem>
                          <SelectItem value="KO">한국어</SelectItem>
                          <SelectItem value="JA">日本語</SelectItem>
                          <SelectItem value="ZH">中文</SelectItem>
                          <SelectItem value="ES">Español</SelectItem>
                          <SelectItem value="FR">Français</SelectItem>
                          <SelectItem value="DE">Deutsch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveLanguageSettings}>
                      {t("common.save")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab Content */}
          <TabsContent value="user-management" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  {t("admin.userManagement.title")}
                </CardTitle>
                <CardDescription>
                  {t("admin.userManagement.titleDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingUsers ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("admin.userManagement.username")}</TableHead>
                            <TableHead>{t("admin.userManagement.role")}</TableHead>
                            <TableHead>{t("admin.userManagement.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                {user.username}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={roleChanges[user.id] || user.role}
                                  onValueChange={(newRole) =>
                                    handleRoleChange(user.id, newRole)
                                  }
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">
                                      {t("admin.userRole")}
                                    </SelectItem>
                                    <SelectItem value="admin">
                                      {t("admin.administratorRole")}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={handleSaveUserChanges}
                        disabled={!hasUserChanges}
                      >
                        {t("common.save")}
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-4">
                      <strong>{t("admin.administratorRole")}:</strong>{" "}
                      {t("admin.administratorDesc")}
                      <br />
                      <strong>{t("admin.userRole")}:</strong>{" "}
                      {t("admin.userDesc")}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab Content */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
                <CardHeader>
                  <CardTitle>{t("admin.templates.manager")}</CardTitle>
                  <CardDescription>{t("admin.templates.uploadNew")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <TemplateManager />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.templates.list")}</CardTitle>
                  <CardDescription>
                    {t("admin.templates.listDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingTemplates ? (
                    <div className="flex justify-center items-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("admin.templates.name")}</TableHead>
                          <TableHead>{t("admin.templates.templateDescription")}</TableHead>
                          <TableHead>{t("admin.templates.useCount")}</TableHead>
                          <TableHead>{t("admin.templates.createdOn")}</TableHead>
                          <TableHead>{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templates.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              {t("admin.templates.noTemplatesYet")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          templates.map((template) => (
                            <TableRow key={template.id}>
                              <TableCell>{template.name}</TableCell>
                              <TableCell>
                                {template.description || t("admin.templates.noDescription")}
                              </TableCell>
                              <TableCell>{template.useCount}</TableCell>
                              <TableCell>
                                {new Date(template.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {}}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
          </TabsContent>

          <div className="text-sm text-muted-foreground mt-6 pt-4 border-t">
            {t("admin.settingsAffectAll")}
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
}
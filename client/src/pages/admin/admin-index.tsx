import React, { useState, useContext, useEffect, useRef } from "react";
import { useLocation, Link, Redirect } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { SidebarContext } from "@/components/layout/sidebar";
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

// Template 관련 타입 정의
interface Template {
  id: number;
  name: string;
  description: string;
  docxFilePath: string;
  useCount: number;
  createdAt: string;
  createdBy: number;
}

interface TemplateStructure {
  id: number;
  templateId: number;
  segmentType: string;
  tableIndex?: number;
  rowIndex?: number;
  cellIndex?: number;
  styleName?: string;
  isTranslationTarget: boolean;
}

export default function AdminConsole() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("api-keys");
  const { setActiveSubSection } = useContext(SidebarContext);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Key states
  const [apiKey, setApiKey] = useState<string>("");
  const [apiKeyVisible, setApiKeyVisible] = useState<boolean>(false);

  // Language preferences states
  const [defaultSourceLang, setDefaultSourceLang] = useState<string>("KO");
  const [defaultTargetLang, setDefaultTargetLang] = useState<string>("EN");

  // User management states
  const [users, setUsers] = useState<Array<{id: number, username: string, role: string}>>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [hasUserChanges, setHasUserChanges] = useState(false);
  const [roleChanges, setRoleChanges] = useState<Record<number, string>>({});

  // Fetch users data
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.userManagement.fetchError")
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'user-management') {
      fetchUsers();
    }
  }, [activeTab]);

  // Template management states
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [templateStructures, setTemplateStructures] = useState<
    TemplateStructure[]
  >([]);
  const [newTemplateName, setNewTemplateName] = useState<string>("");
  const [newTemplateDescription, setNewTemplateDescription] =
    useState<string>("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAddTemplateDialog, setShowAddTemplateDialog] =
    useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [templateError, setTemplateError] = useState<string>("");

  // 활성 탭 변경 시 SidebarContext 업데이트
  const [activeTabLabel, setActiveTabLabel] = useState<string>(
    t("admin.apiKeys"),
  );

  // 탭 변경 핸들러
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // 선택된 탭에 따라 적절한 라벨 설정
    if (value === "api-keys") {
      setActiveTabLabel(t("admin.apiKeys"));
    } else if (value === "language") {
      setActiveTabLabel(t("admin.languageSettings"));
    } else if (value === "user-management") {
      setActiveTabLabel(t("admin.userManagement"));
    } else if (value === "templates") {
      setActiveTabLabel(t("admin.templates.title"));
    }
  };

  // 활성화된 탭이 변경될 때마다 SidebarContext 업데이트
  useEffect(() => {
    setActiveSubSection(activeTabLabel);
  }, [activeTabLabel, setActiveSubSection]);

  // 템플릿 목록 불러오기
  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      setTemplateError("");

      const response = await fetch("/api/admin/templates", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status}`);
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      setTemplateError(t("admin.templates.errorFetchingList"));
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // 템플릿 상세 정보 불러오기
  const fetchTemplateDetails = async (templateId: number) => {
    try {
      setIsLoadingTemplates(true);
      setTemplateError("");

      const response = await fetch(`/api/admin/templates/${templateId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch template details: ${response.status}`);
      }

      const data = await response.json();
      setSelectedTemplate(data.template || null);
      setTemplateStructures(data.structures || []);
    } catch (error) {
      console.error("Error fetching template details:", error);
      setTemplateError(t("admin.templates.errorFetchingDetails"));
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.templates.error"),
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // 템플릿 삭제
  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm(t("admin.templates.confirmDelete"))) {
      return;
    }

    try {
      setIsLoadingTemplates(true);
      setTemplateError("");

      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete template: ${response.status}`);
      }

      toast({
        title: t("common.success"),
        description: t("admin.templates.deleteSuccess"),
      });

      // 템플릿 목록 다시 불러오기
      fetchTemplates();

      // 삭제한 템플릿이 현재 선택된 템플릿이라면 선택 해제
      if (selectedTemplate && selectedTemplate.id === templateId) {
        setSelectedTemplate(null);
        setTemplateStructures([]);
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      setTemplateError(t("admin.templates.errorDeleting"));
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.templates.errorDeleting"),
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // 파일 선택 핸들러
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setTemplateFile(event.target.files[0]);
      setSelectedFile(event.target.files[0]);
    }
  };

  // 템플릿 업로드
  const handleTemplateUpload = async () => {
    if (!selectedFile || !newTemplateName) {
      setTemplateError(t("admin.templates.requiredFields"));
      return;
    }

    try {
      setIsUploading(true);
      setTemplateError("");

      const formData = new FormData();
      formData.append("template", selectedFile);
      formData.append("name", newTemplateName);
      if (newTemplateDescription) {
        formData.append("description", newTemplateDescription);
      }

      const response = await fetch("/api/admin/templates", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      // 성공 시 상태 초기화
      setTemplateFile(null);
      setSelectedFile(null);
      setNewTemplateName("");
      setNewTemplateDescription("");
      setShowAddTemplateDialog(false);

      toast({
        title: t("common.success"),
        description: t("admin.templates.uploadSuccess"),
      });

      // 템플릿 목록 새로고침
      fetchTemplates();
    } catch (error) {
      console.error("Error uploading template:", error);
      setTemplateError(
        error instanceof Error
          ? error.message
          : t("admin.templates.errorUploading"),
      );
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.templates.errorUploading"),
      });
    } finally {
      setIsUploading(false);
    }
  };

  // templates 탭이 활성화될 때 자동으로 템플릿 목록 불러오기
  useEffect(() => {
    if (activeTab === "templates") {
      fetchTemplates();
    }
  }, [activeTab]);

  // Handle API key save
  const handleSaveApiKey = () => {
    // In a real app, you would save this to a secure storage
    console.log("Saving API key:", apiKey);
    alert(t("admin.apiKeySaved"));
  };

  // Handle language preferences save
  const handleSaveLanguagePreferences = () => {
    console.log("Saving language preferences:", {
      defaultSourceLang,
      defaultTargetLang,
    });
    alert(t("admin.languagePreferencesSaved"));
  };

  // Handle role change
  const handleRoleChange = (userId: number, newRole: string) => {
    setRoleChanges(prev => ({
      ...prev,
      [userId]: newRole
    }));
    setHasUserChanges(true);
  };

  // Save user role changes
  const handleSaveUserChanges = async () => {
    try {
      const response = await fetch('/api/admin/users/roles', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes: roleChanges })
      });

      if (!response.ok) {
        throw new Error('Failed to update user roles');
      }

      toast({
        title: t("common.success"),
        description: t("admin.userManagement.roleUpdateSuccess")
      });

      // Refresh user list
      fetchUsers();
      setRoleChanges({});
      setHasUserChanges(false);
    } catch (error) {
      console.error('Error updating user roles:', error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.userManagement.roleUpdateError")
      });
    }
  };

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
      <MainLayout title={t("admin.accessDenied")}>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-center">
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
              <span>{t("admin.userManagement")}</span>
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
                        <SelectTrigger id="default-source-language">
                          <SelectValue
                            placeholder={t("admin.selectSourceLanguage")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KO">
                            {t("languages.korean")} (KO)
                          </SelectItem>
                          <SelectItem value="JA">
                            {t("languages.japanese")} (JA)
                          </SelectItem>
                          <SelectItem value="EN">
                            {t("languages.english")} (EN)
                          </SelectItem>
                          <SelectItem value="ZH">
                            {t("languages.chinese")} (ZH)
                          </SelectItem>
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
                        <SelectTrigger id="default-target-language">
                          <SelectValue
                            placeholder={t("admin.selectTargetLanguage")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EN">
                            {t("languages.english")} (EN)
                          </SelectItem>
                          <SelectItem value="KO">
                            {t("languages.korean")} (KO)
                          </SelectItem>
                          <SelectItem value="JA">
                            {t("languages.japanese")} (JA)
                          </SelectItem>
                          <SelectItem value="ZH">
                            {t("languages.chinese")} (ZH)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button onClick={handleSaveLanguagePreferences}>
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
                  <UserCog className="h-5 w-5 mr-2" />
                  {t("admin.userManagement")}
                </CardTitle>
                <CardDescription>
                  {t("admin.userManagementDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("admin.username")}</TableHead>
                            <TableHead>{t("admin.role")}</TableHead>
                            <TableHead>{t("admin.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {user.username}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Shield
                                className={`h-4 w-4 ${user.role === "admin" ? "text-primary" : "text-muted-foreground"}`}
                              />
                              {user.role === "admin"
                                ? t("admin.administratorRole")
                                : t("admin.userRole")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(value) =>
                                handleRoleChange(user.id, value)
                              }
                              disabled={user.username === "admin"} // Don't allow changing the main admin
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue
                                  placeholder={t("admin.selectRole")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  {t("admin.administratorRole")}
                                </SelectItem>
                                <SelectItem value="user">
                                  {t("admin.userRole")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
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
                  <strong>{t("admin.userRole")}:</strong> {t("admin.userDesc")}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab Content */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  {t("admin.templates.title")}
                </CardTitle>
                <CardDescription>
                  {t("admin.templates.titleDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div></div>
                  <Dialog
                    open={showAddTemplateDialog}
                    onOpenChange={setShowAddTemplateDialog}
                  >
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {t("admin.templates.upload")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("admin.templates.upload")}</DialogTitle>
                        <DialogDescription>
                          {t("admin.templates.uploadDesc")}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="templateName">
                            {t("admin.templates.name")}
                          </Label>
                          <Input
                            id="templateName"
                            placeholder={t("admin.templates.namePlaceholder")}
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="templateDescription">
                            {t("admin.templates.templateDescription")}
                          </Label>
                          <Textarea
                            id="templateDescription"
                            placeholder={`${t("admin.templates.templateDescriptionPlaceholder")} (${t("common.optional")})`}
                            value={newTemplateDescription}
                            onChange={(e) =>
                              setNewTemplateDescription(e.target.value)
                            }
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="templateFile">
                            {t("admin.templates.templateFile")}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="templateFile"
                              type="file"
                              accept=".docx"
                              ref={fileInputRef}
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full flex items-center gap-2 justify-center"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="h-4 w-4" />
                              {selectedFile
                                ? selectedFile.name
                                : t("admin.templates.selectFile")}
                            </Button>
                            {selectedFile && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTemplateFile(null);
                                  setSelectedFile(null);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {templateError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t("common.error")}</AlertTitle>
                            <AlertDescription>{templateError}</AlertDescription>
                          </Alert>
                        )}
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddTemplateDialog(false)}
                          disabled={isUploading}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          onClick={handleTemplateUpload}
                          disabled={
                            isUploading || !templateFile || !newTemplateName
                          }
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t("common.uploading")}
                            </>
                          ) : (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              {t("common.upload")}
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <Separator />

                {templateError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t("common.error")}</AlertTitle>
                    <AlertDescription>{templateError}</AlertDescription>
                  </Alert>
                )}

                {isLoadingTemplates ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">
                      {t("admin.templates.noTemplatesYet")}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                      {t("admin.templates.noTemplatesDesc")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("admin.templates.name")}</TableHead>
                          <TableHead>
                            {t("admin.templates.templateDescription")}
                          </TableHead>
                          <TableHead>{t("admin.templates.useCount")}</TableHead>
                          <TableHead>
                            {t("admin.templates.createdOn")}
                          </TableHead>
                          <TableHead>{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium">
                              {template.name}
                            </TableCell>
                            <TableCell>{template.description || "-"}</TableCell>
                            <TableCell>{template.useCount}</TableCell>
                            <TableCell>
                              {new Date(
                                template.createdAt,
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    fetchTemplateDetails(template.id)
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteTemplate(template.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {selectedTemplate && (
                      <Card>
                        <CardHeader>
                          <CardTitle>{selectedTemplate.name}</CardTitle>
                          <CardDescription>
                            {selectedTemplate.description ||
                              t("admin.templates.noTemplatesDesc")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                {t("admin.templates.structure")}
                              </h4>

                              {templateStructures.length > 0 ? (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>
                                        {t("admin.templates.type")}
                                      </TableHead>
                                      <TableHead>
                                        {t("admin.templates.location")}
                                      </TableHead>
                                      <TableHead>
                                        {t(
                                          "admin.templates.isTranslationTarget",
                                        )}
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {templateStructures.map((structure) => (
                                      <TableRow key={structure.id}>
                                        <TableCell>
                                          {structure.segmentType}
                                        </TableCell>
                                        <TableCell>
                                          {structure.tableIndex !== undefined
                                            ? `Table ${structure.tableIndex} ${
                                                structure.rowIndex !== undefined
                                                  ? `Row ${structure.rowIndex} ${
                                                      structure.cellIndex !==
                                                      undefined
                                                        ? `Cell ${structure.cellIndex}`
                                                        : ""
                                                    }`
                                                  : ""
                                              }`
                                            : structure.styleName || "-"}
                                        </TableCell>
                                        <TableCell>
                                          {structure.isTranslationTarget ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                          ) : (
                                            <X className="h-4 w-4 text-red-500" />
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {t("admin.templates.noStructureElements")}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
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

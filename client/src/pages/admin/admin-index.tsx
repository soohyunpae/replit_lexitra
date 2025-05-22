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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [users, setUsers] = useState([
    { id: 1, username: "admin", role: "admin" },
    { id: 2, username: "translator1", role: "user" },
    { id: 3, username: "reviewer1", role: "user" },
  ]);
  
  // Template management states
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateStructures, setTemplateStructures] = useState<TemplateStructure[]>([]);
  const [newTemplateName, setNewTemplateName] = useState<string>("");
  const [newTemplateDescription, setNewTemplateDescription] = useState<string>("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [showAddTemplateDialog, setShowAddTemplateDialog] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [templateError, setTemplateError] = useState<string>("");
  
  // 활성 탭 변경 시 SidebarContext 업데이트
  const [activeTabLabel, setActiveTabLabel] = useState<string>(t('admin.apiKeys'));
  
  // 탭 변경 핸들러
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // 선택된 탭에 따라 적절한 라벨 설정
    if (value === "api-keys") {
      setActiveTabLabel(t('admin.apiKeys'));
    } else if (value === "language") {
      setActiveTabLabel(t('admin.languageSettings'));
    } else if (value === "user-management") {
      setActiveTabLabel(t('admin.userManagement'));
    } else if (value === "templates") {
      setActiveTabLabel(t('admin.templates') || "Templates");
    }
  };
  
  // 활성화된 탭이 변경될 때마다 SidebarContext 업데이트
  useEffect(() => {
    setActiveSubSection(activeTabLabel);
  }, [activeTabLabel, setActiveSubSection]);

  // Handle API key save
  const handleSaveApiKey = () => {
    // In a real app, you would save this to a secure storage
    console.log("Saving API key:", apiKey);
    alert(t('admin.apiKeySaved', 'API key saved successfully!'));
  };

  // Handle language preferences save
  const handleSaveLanguagePreferences = () => {
    console.log("Saving language preferences:", { defaultSourceLang, defaultTargetLang });
    alert(t('admin.languagePreferencesSaved', '언어 설정이 성공적으로 저장되었습니다!'));
  };

  // Handle role change
  const handleRoleChange = (userId: number, newRole: string) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, role: newRole } : user
    ));
  };
  
  // 템플릿 목록 조회
  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    setTemplateError("");
    
    try {
      const response = await fetch("/api/admin/templates");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status}`);
      }
      
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      setTemplateError("템플릿 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingTemplates(false);
    }
  };
  
  // 템플릿 상세 정보 조회
  const fetchTemplateDetails = async (templateId: number) => {
    try {
      const response = await fetch(`/api/admin/templates/${templateId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch template details: ${response.status}`);
      }
      
      const data = await response.json();
      setSelectedTemplate(data.template);
      setTemplateStructures(data.structures);
    } catch (error) {
      console.error("Error fetching template details:", error);
      toast({
        title: "오류",
        description: "템플릿 상세 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };
  
  // 템플릿 삭제 처리
  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm(t('admin.confirmDeleteTemplate', '이 템플릿을 삭제하시겠습니까?'))) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete template: ${response.status}`);
      }
      
      toast({
        title: "성공",
        description: "템플릿이 성공적으로 삭제되었습니다.",
      });
      
      // 템플릿 목록 새로고침
      fetchTemplates();
      
      // 선택된 템플릿이 삭제되었다면 선택 해제
      if (selectedTemplate && selectedTemplate.id === templateId) {
        setSelectedTemplate(null);
        setTemplateStructures([]);
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "오류",
        description: "템플릿 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };
  
  // 새 템플릿 업로드 처리
  const handleTemplateUpload = async () => {
    if (!templateFile || !newTemplateName) {
      setTemplateError("템플릿 이름과 파일을 선택해주세요.");
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setTemplateError("");
    
    const formData = new FormData();
    formData.append("name", newTemplateName);
    formData.append("description", newTemplateDescription);
    formData.append("file", templateFile);
    
    try {
      const response = await fetch("/api/admin/templates", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload template: ${response.status}`);
      }
      
      // 업로드 성공
      toast({
        title: "성공",
        description: "템플릿이 성공적으로 업로드되었습니다.",
      });
      
      // 상태 초기화
      setNewTemplateName("");
      setNewTemplateDescription("");
      setTemplateFile(null);
      setShowAddTemplateDialog(false);
      
      // 템플릿 목록 갱신
      fetchTemplates();
    } catch (error) {
      console.error("Error uploading template:", error);
      setTemplateError("템플릿 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };
  
  // 파일 선택 핸들러
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setTemplateFile(files[0]);
    }
  };
  
  // 탭이 templates로 변경될 때 템플릿 목록 로드
  useEffect(() => {
    if (activeTab === "templates") {
      fetchTemplates();
    }
  }, [activeTab]);

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
      <MainLayout title={t('admin.accessDenied')}>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-center">
                {t('admin.accessRequired')}
              </CardTitle>
              <CardDescription className="text-center">
                {t('admin.noPermission')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/")} className="w-full">
                {t('admin.goToHome')}
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
          <h2 className="text-3xl font-bold tracking-tight">{t('admin.console')}</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          {t('admin.settingsDesc')}
        </p>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger
              value="api-keys"
              className="flex items-center gap-2"
            >
              <Key className="h-4 w-4" />
              <span>{t('admin.apiKeys')}</span>
            </TabsTrigger>
            <TabsTrigger
              value="language"
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              <span>{t('common.language')}</span>
            </TabsTrigger>
            <TabsTrigger
              value="user-management"
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              <span>{t('admin.userManagement')}</span>
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              <span>{t('admin.templates') || "Templates"}</span>
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab Content */}
          <TabsContent value="api-keys" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  {t('admin.apiKeys')}
                </CardTitle>
                <CardDescription>
                  {t('admin.apiKeyDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">OpenAI API Key</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.openAIApiDesc')}
                      <a href="https://platform.openai.com/api-keys" target="_blank" className="text-primary underline ml-1">
                        {t('admin.getApiKey')}
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
                        {apiKeyVisible ? t('admin.hide') : t('admin.show')}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('admin.apiKeysSecure')}
                    </p>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={handleSaveApiKey}>{t('common.save')} {t('admin.apiKeys')}</Button>
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
                  {t('admin.languageSettings')}
                </CardTitle>
                <CardDescription>
                  {t('admin.languageSettingsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">{t('admin.defaultLanguages')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.defaultLanguagesDesc')}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="default-source-language">{t('admin.defaultSourceLanguage')}</Label>
                      <Select 
                        value={defaultSourceLang} 
                        onValueChange={setDefaultSourceLang}
                      >
                        <SelectTrigger id="default-source-language">
                          <SelectValue placeholder={t('admin.selectSourceLanguage')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KO">{t('languages.korean')} (KO)</SelectItem>
                          <SelectItem value="JA">{t('languages.japanese')} (JA)</SelectItem>
                          <SelectItem value="EN">{t('languages.english')} (EN)</SelectItem>
                          <SelectItem value="ZH">{t('languages.chinese')} (ZH)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="default-target-language">{t('admin.defaultTargetLanguage')}</Label>
                      <Select 
                        value={defaultTargetLang} 
                        onValueChange={setDefaultTargetLang}
                      >
                        <SelectTrigger id="default-target-language">
                          <SelectValue placeholder={t('admin.selectTargetLanguage')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EN">{t('languages.english')} (EN)</SelectItem>
                          <SelectItem value="KO">{t('languages.korean')} (KO)</SelectItem>
                          <SelectItem value="JA">{t('languages.japanese')} (JA)</SelectItem>
                          <SelectItem value="ZH">{t('languages.chinese')} (ZH)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-end">
                    <Button onClick={handleSaveLanguagePreferences}>{t('common.save')} {t('profile.preferences')}</Button>
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
                  {t('admin.userManagement')}
                </CardTitle>
                <CardDescription>
                  {t('admin.userManagementDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">{t('admin.users')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.manageUserAccess')}
                    </p>
                  </div>
                  <Button 
                    className="flex items-center gap-2"
                    onClick={() => {
                      /* Add user functionality can be implemented here */
                      alert(t('admin.userFunctionalityNotImplemented', '사용자 추가 기능이 아직 구현되지 않았습니다'));
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                    {t('admin.addUser')}
                  </Button>
                </div>
                
                <Separator />
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.username')}</TableHead>
                        <TableHead>{t('admin.role')}</TableHead>
                        <TableHead>{t('admin.actions')}</TableHead>
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
                              <Shield className={`h-4 w-4 ${user.role === 'admin' ? 'text-primary' : 'text-muted-foreground'}`} />
                              {user.role === 'admin' ? t('admin.administratorRole') : t('admin.userRole')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={user.role} 
                              onValueChange={(value) => handleRoleChange(user.id, value)}
                              disabled={user.username === 'admin'} // Don't allow changing the main admin
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder={t('admin.selectRole')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">{t('admin.administratorRole')}</SelectItem>
                                <SelectItem value="user">{t('admin.userRole')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <p className="text-xs text-muted-foreground mt-4">
                  <strong>{t('admin.administratorRole')}:</strong> {t('admin.administratorDesc')}<br />
                  <strong>{t('admin.userRole')}:</strong> {t('admin.userDesc')}
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
                  {t('admin.templates') || "Template Management"}
                </CardTitle>
                <CardDescription>
                  {t('admin.templatesDesc') || "Manage document templates for translation projects"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium">{t('admin.documentTemplates') || "Document Templates"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.templatesExplanation') || "Templates help streamline the translation process for documents with repeating layouts"}
                    </p>
                  </div>
                  <Dialog open={showAddTemplateDialog} onOpenChange={setShowAddTemplateDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        {t('admin.uploadTemplates') || "Upload Template"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('admin.uploadTemplates') || "Upload Template"}</DialogTitle>
                        <DialogDescription>
                          {t('admin.uploadTemplatesDesc') || "Upload DOCX templates and define which elements should be translated"}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="templateName">{t('admin.templateName') || "Template Name"}</Label>
                          <Input
                            id="templateName"
                            placeholder={t('admin.templateNamePlaceholder') || "Enter template name"}
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="templateDescription">{t('admin.templateDescription') || "Description (Optional)"}</Label>
                          <Textarea
                            id="templateDescription"
                            placeholder={t('admin.templateDescriptionPlaceholder') || "Enter template description"}
                            value={newTemplateDescription}
                            onChange={(e) => setNewTemplateDescription(e.target.value)}
                            rows={3}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="templateFile">{t('admin.templateFile') || "Template File (.docx)"}</Label>
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
                              {templateFile 
                                ? templateFile.name 
                                : t('admin.selectFile') || "Select DOCX File"}
                            </Button>
                            {templateFile && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setTemplateFile(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {templateError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                              {templateError}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowAddTemplateDialog(false)}
                          disabled={isUploading}
                        >
                          {t('common.cancel') || "Cancel"}
                        </Button>
                        <Button 
                          onClick={handleTemplateUpload}
                          disabled={isUploading || !templateFile || !newTemplateName}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('common.uploading') || "Uploading..."}
                            </>
                          ) : (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              {t('common.upload') || "Upload"}
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
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {templateError}
                    </AlertDescription>
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
                      {t('admin.noTemplatesYet') || "No Templates Yet"}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                      {t('admin.noTemplatesDesc') || "Start by uploading your first document template to streamline your translation process"}
                    </p>
                    <Button 
                      onClick={() => setShowAddTemplateDialog(true)}
                      className="flex items-center gap-2 mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      {t('admin.uploadFirstTemplate') || "Upload First Template"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('admin.templateName') || "Template Name"}</TableHead>
                          <TableHead>{t('admin.description') || "Description"}</TableHead>
                          <TableHead>{t('admin.useCount') || "Use Count"}</TableHead>
                          <TableHead>{t('admin.createdAt') || "Created"}</TableHead>
                          <TableHead>{t('admin.actions') || "Actions"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium">{template.name}</TableCell>
                            <TableCell>{template.description || "-"}</TableCell>
                            <TableCell>{template.useCount}</TableCell>
                            <TableCell>
                              {new Date(template.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => fetchTemplateDetails(template.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTemplate(template.id)}
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
                          <CardTitle>
                            {selectedTemplate.name}
                          </CardTitle>
                          <CardDescription>
                            {selectedTemplate.description || t('admin.noDescription') || "No description provided"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                {t('admin.templateStructure') || "Template Structure"}
                              </h4>
                              
                              {templateStructures.length > 0 ? (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>{t('admin.type') || "Type"}</TableHead>
                                      <TableHead>{t('admin.location') || "Location"}</TableHead>
                                      <TableHead>{t('admin.isTranslationTarget') || "Translation Target"}</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {templateStructures.map((structure) => (
                                      <TableRow key={structure.id}>
                                        <TableCell>{structure.segmentType}</TableCell>
                                        <TableCell>
                                          {structure.tableIndex !== undefined
                                            ? `Table ${structure.tableIndex} ${structure.rowIndex !== undefined
                                                ? `Row ${structure.rowIndex} ${structure.cellIndex !== undefined
                                                  ? `Cell ${structure.cellIndex}`
                                                  : ''
                                                }`
                                                : ''
                                              }`
                                            : structure.styleName || '-'
                                          }
                                        </TableCell>
                                        <TableCell>
                                          {structure.isTranslationTarget
                                            ? <Check className="h-4 w-4 text-green-500" />
                                            : <X className="h-4 w-4 text-red-500" />
                                          }
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {t('admin.noStructureElements') || "No structure elements defined for this template."}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        {t('admin.applyTemplates') || "Apply Templates"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('admin.applyTemplatesDesc') || "Apply templates to ongoing translation projects"}
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => navigate("/projects")}>
                        {t('admin.goToProjects') || "Go to Projects"}
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        {t('admin.templateDocumentation') || "Documentation"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('admin.templateDocumentationDesc') || "Learn how to create and apply document templates effectively"}
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => window.open("https://docs.lexitra.io/templates", "_blank")}>
                        {t('admin.viewDocs') || "View Documentation"}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="text-sm text-muted-foreground mt-6 pt-4 border-t">
            {t('admin.settingsAffectAll')}
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
}

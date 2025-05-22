import React, { useState, useContext, useEffect } from "react";
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
} from "lucide-react";

export default function AdminConsole() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("api-keys");
  const { setActiveSubSection } = useContext(SidebarContext);
  
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
                  <Button 
                    className="flex items-center gap-2"
                    onClick={() => navigate("/admin/templates")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t('admin.manageTemplates') || "Manage Templates"}
                  </Button>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        {t('admin.uploadTemplates') || "Upload Templates"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('admin.uploadTemplatesDesc') || "Upload DOCX templates and define which elements should be translated"}
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => navigate("/admin/templates")}>
                        {t('admin.goToTemplates') || "Go to Templates"}
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        {t('admin.applyTemplates') || "Apply Templates"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('admin.applyTemplatesDesc') || "Apply templates to uploaded documents to streamline translation"}
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
                      <Button variant="outline" className="w-full" onClick={() => navigate("/admin/templates")}>
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

import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ui/theme-provider";
import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Redirect } from "wouter";
import { Loader2, LogOut, Moon, Sun, Globe } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const { user, isLoading, logoutMutation } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [sourceLanguage, setSourceLanguage] = useState("KO");
  const [targetLanguage, setTargetLanguage] = useState("EN");

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoading) {
    return (
      <MainLayout title="My Account">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <MainLayout title={t('common.myAccount')}>
      <div className="max-w-3xl mx-auto py-10">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">{t('common.general') || 'General'}</TabsTrigger>
            <TabsTrigger value="preferences">{t('profile.preferences') || 'Preferences'}</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.accountInformation')}</CardTitle>
                <CardDescription>
                  {t('profile.personalInfo')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-xl">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {t('profile.username')}
                    </h3>
                    <p className="font-medium">{user.username}</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {t('profile.userId')}
                    </h3>
                    <p className="font-medium">{user.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.themeSettings')}</CardTitle>
                  <CardDescription>
                    {t('profile.chooseTheme')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <RadioGroup defaultValue={theme} onValueChange={setTheme}>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="light" id="theme-light" />
                          <Label htmlFor="theme-light">{t('common.lightMode')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="dark" id="theme-dark" />
                          <Label htmlFor="theme-dark">{t('common.darkMode')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="system" id="theme-system" />
                          <Label htmlFor="theme-system">System</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.language')}</CardTitle>
                  <CardDescription>
                    Set your default source and target languages for translation projects
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Source Language
                      </label>
                      <Select
                        value={sourceLanguage}
                        onValueChange={setSourceLanguage}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KO">Korean</SelectItem>
                          <SelectItem value="EN">English</SelectItem>
                          <SelectItem value="JA">Japanese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Target Language
                      </label>
                      <Select
                        value={targetLanguage}
                        onValueChange={setTargetLanguage}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EN">English</SelectItem>
                          <SelectItem value="KO">Korean</SelectItem>
                          <SelectItem value="JA">Japanese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="ml-auto">
                    {t('profile.savePreferences')}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.uiLanguage')}</CardTitle>
                  <CardDescription>
                    {t('profile.chooseUiLanguage')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <RadioGroup 
                      defaultValue={language} 
                      onValueChange={(value) => setLanguage(value as "en" | "ko")}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="en" id="lang-en" />
                          <Label htmlFor="lang-en">English</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="ko" id="lang-ko" />
                          <Label htmlFor="lang-ko">한국어</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Globe className="mr-2 h-4 w-4" />
                    {t('profile.currentUiLanguage')}: {language === "en" ? "English" : "한국어"}
                  </div>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </>
            )}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}

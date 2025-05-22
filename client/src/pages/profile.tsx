import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ui/theme-provider";
import { useLanguage } from "@/hooks/use-language";
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
import { useTranslation } from "react-i18next";

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
    <MainLayout title="My Account">
      <div className="max-w-3xl mx-auto py-10">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">{t('profile.personalInfo')}</TabsTrigger>
            <TabsTrigger value="preferences">{t('profile.preferences')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.title')}</CardTitle>
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
                      {t('profile.role')}
                    </h3>
                    <p className="font-medium">{t(`admin.${user.role}Role`)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <div className="space-y-6">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{t('profile.themeSettings')}</CardTitle>
                  <CardDescription>
                    {t('profile.themeDescription')}
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
                          <Label htmlFor="theme-system">{t('profile.systemTheme')}</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.languageSettings')}</CardTitle>
                  <CardDescription>
                    {t('profile.interfaceLanguage')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">{t('common.language')}</Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={language === 'en' ? "default" : "outline"}
                          size="sm"
                          className="px-3"
                          onClick={() => setLanguage('en')}
                        >
                          English
                        </Button>
                        <Button
                          variant={language === 'ko' ? "default" : "outline"}
                          size="sm"
                          className="px-3"
                          onClick={() => setLanguage('ko')}
                        >
                          한국어
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.languageSettings')}</CardTitle>
                  <CardDescription>
                    {t('admin.defaultSourceLanguage')} / {t('admin.defaultTargetLanguage')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t('projects.sourceLanguage')}
                      </label>
                      <Select
                        value={sourceLanguage}
                        onValueChange={setSourceLanguage}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('admin.selectSourceLanguage')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KO">{t('languages.korean')}</SelectItem>
                          <SelectItem value="EN">{t('languages.english')}</SelectItem>
                          <SelectItem value="JA">{t('languages.japanese')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t('projects.targetLanguage')}
                      </label>
                      <Select
                        value={targetLanguage}
                        onValueChange={setTargetLanguage}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('admin.selectTargetLanguage')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EN">{t('languages.english')}</SelectItem>
                          <SelectItem value="KO">{t('languages.korean')}</SelectItem>
                          <SelectItem value="JA">{t('languages.japanese')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="ml-auto">
                    {t('common.save')}
                  </Button>
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
                {t('auth.loggingOut')}
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                {t('common.logout')}
              </>
            )}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}

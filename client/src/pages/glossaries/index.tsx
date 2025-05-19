import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Book, FileText, Tag } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

// This page serves as a redirector to glossaries features
export default function GlossariesIndexPage() {
  // Navigate to entries by default
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    navigate("/glossaries/entries");
  }, [navigate]);

  return (
    <MainLayout title={t('glossaries.title')}>
      <div className="container max-w-screen-xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-2">
          <Book className="h-5 w-5" />
          <h2 className="text-3xl font-bold tracking-tight">{t('glossaries.title')}</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          {t('glossaries.manageGlossaryDesc')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5" />
              <h3 className="text-xl font-semibold">{t('glossaries.entries')}</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              {t('glossaries.manageEntries')}
            </p>
            <Link href="/glossaries/entries">
              <Button className="w-full">{t('glossaries.goToEntries')}</Button>
            </Link>
          </div>

          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-5 w-5" />
              <h3 className="text-xl font-semibold">{t('glossaries.list')}</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              {t('glossaries.manageList')}
            </p>
            <Link href="/glossaries/resources">
              <Button className="w-full">{t('glossaries.goToList')}</Button>
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <div className="text-sm text-muted-foreground">
            {t('glossaries.redirectingToEntries')}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

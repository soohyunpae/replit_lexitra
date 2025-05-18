import React, { useState } from "react";
import { Redirect } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FileText, FileType, Loader2 } from "lucide-react";
import PDFProcessing from "./pdf";
import FileConversion from "./conversion";
import { useTranslation } from "react-i18next";

export default function FileProcessingHub() {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<string>("pdf");

  // Loading state
  if (isLoading) {
    return (
      <MainLayout title={t('admin.fileProcessingCenter')}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </MainLayout>
    );
  }

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return (
    <MainLayout title={t('admin.fileProcessingCenter')}>
      <div className="container py-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{t('admin.fileProcessingCenter')}</h1>
          </div>
          <p className="text-muted-foreground">
            {t('admin.fileProcessingDesc')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.fileProcessingTools')}</CardTitle>
            <CardDescription>
              {t('admin.selectToolDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full" value={activeSection} onValueChange={setActiveSection}>
              <AccordionItem value="pdf" className="border rounded-md mb-4 px-4">
                <AccordionTrigger className="py-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <span className="text-lg font-medium">{t('admin.pdfProcessing')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6">
                  <PDFProcessing embedded={true} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="conversion" className="border rounded-md mb-4 px-4">
                <AccordionTrigger className="py-4">
                  <div className="flex items-center gap-2">
                    <FileType className="h-5 w-5" />
                    <span className="text-lg font-medium">{t('admin.fileFormatConversion')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6">
                  <FileConversion embedded={true} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4 text-sm text-muted-foreground">
            <span>{t('admin.supportedFileTypes')}</span>
            <span>{t('admin.maxFileSize')}</span>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
}

import React, { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Upload, Check, ArrowRight, X } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { formatFileSize } from "@/lib/utils";

export default function PdfProcessingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>, type: 'source' | 'target') => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      if (type === 'source') {
        setFile(droppedFile);
      } else {
        setTargetFile(droppedFile);
      }
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive"
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'source' | 'target') => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      if (type === 'source') {
        setFile(selectedFile);
      } else {
        setTargetFile(selectedFile);
      }
    } else if (selectedFile) {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive"
      });
    }
  };

  const processFileMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/admin/file/pdf/process", {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process PDF");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setPreview(data.sentences);
      toast({
        title: "PDF Processed",
        description: `Successfully extracted ${data.sentences.length} segments`,
        variant: "default"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const alignMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/admin/file/pdf/align", {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to align PDFs");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "PDF Alignment Complete",
        description: `Successfully created ${data.alignedPairs.length} aligned segment pairs`,
        variant: "default"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Process single PDF
  const handleProcessPdf = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    processFileMutation.mutate(formData);
  };

  // Process bilingual alignment
  const handleAlignPdfs = async () => {
    if (!file || !targetFile) return;

    const formData = new FormData();
    formData.append("sourceFile", file);
    formData.append("targetFile", targetFile);

    alignMutation.mutate(formData);
  };

  // Check if user is admin
  if (authLoading) {
    return (
      <MainLayout title="PDF Processing">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </MainLayout>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <MainLayout title="Access Denied">
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <X className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-center">Admin Access Required</CardTitle>
              <CardDescription className="text-center">
                You don't have permission to access this page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="PDF Processing">
      <div className="container py-6 space-y-8">
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl font-bold">PDF Processing</h1>
          <p className="text-muted-foreground">
            Extract text from PDF files for translation or create TM entries from aligned PDFs.
          </p>
        </div>

        <Tabs defaultValue="extract" className="space-y-4">
          <TabsList>
            <TabsTrigger value="extract">Extract Text</TabsTrigger>
            <TabsTrigger value="align">Bilingual Alignment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="extract" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Extract Text from PDF</span>
                </CardTitle>
                <CardDescription>
                  Upload a PDF file to extract text and create translation units. 
                  Only text-based PDFs are supported (not scanned documents).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File upload area */}
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" 
                  onDragOver={(e) => e.preventDefault()} 
                  onDrop={(e) => handleFileDrop(e, 'source')}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    accept="application/pdf"
                    onChange={(e) => handleFileChange(e, 'source')} 
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    {file ? (
                      <div className="flex flex-col items-center">
                        <p className="font-medium text-lg">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-lg">Click or drag & drop your PDF file</p>
                        <p className="text-sm text-muted-foreground">Support for text-based PDF files</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-4">
                  <Button 
                    onClick={handleProcessPdf} 
                    disabled={!file || processFileMutation.isPending} 
                    className="w-full sm:w-auto self-end"
                  >
                    {processFileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" /> 
                        Extract Text
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Processing progress */}
                {processFileMutation.isPending && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-center text-muted-foreground">
                      Processing PDF... This may take a few moments.
                    </p>
                  </div>
                )}

                {/* Preview */}
                {preview && preview.length > 0 && (
                  <div className="space-y-2 mt-6">
                    <h3 className="text-lg font-medium">Extracted Text Preview</h3>
                    <div className="border rounded-md h-60 overflow-y-auto p-4 bg-muted/30">
                      {preview.slice(0, 20).map((sentence, i) => (
                        <div key={i} className="py-1 border-b last:border-0 text-sm">
                          {sentence}
                        </div>
                      ))}
                      {preview.length > 20 && (
                        <div className="py-2 text-center text-sm text-muted-foreground">
                          {preview.length - 20} more segments...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Alert variant="default" className="bg-muted/50">
              <FileText className="h-4 w-4" />
              <AlertTitle>About PDF Processing</AlertTitle>
              <AlertDescription>
                <p className="mb-2">We support the following preprocessing operations:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Text extraction from PDF files</li>
                  <li>Sentence segmentation for translation</li>
                  <li>Automatic translation unit creation</li>
                  <li>Direct project integration</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="align" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-primary" />
                  <span>Bilingual PDF Alignment</span>
                </CardTitle>
                <CardDescription>
                  Upload source and target PDF files to automatically align their content 
                  and create translation memory entries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Source PDF upload */}
                  <div>
                    <Label className="block mb-2">Source PDF</Label>
                    <div 
                      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" 
                      onDragOver={(e) => e.preventDefault()} 
                      onDrop={(e) => handleFileDrop(e, 'source')}
                      onClick={() => document.getElementById('source-file-upload')?.click()}
                    >
                      <input 
                        type="file" 
                        id="source-file-upload" 
                        className="hidden" 
                        accept="application/pdf"
                        onChange={(e) => handleFileChange(e, 'source')} 
                      />
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        {file ? (
                          <div className="flex flex-col items-center">
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Upload source PDF</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Target PDF upload */}
                  <div>
                    <Label className="block mb-2">Target PDF</Label>
                    <div 
                      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" 
                      onDragOver={(e) => e.preventDefault()} 
                      onDrop={(e) => handleFileDrop(e, 'target')}
                      onClick={() => document.getElementById('target-file-upload')?.click()}
                    >
                      <input 
                        type="file" 
                        id="target-file-upload" 
                        className="hidden" 
                        accept="application/pdf"
                        onChange={(e) => handleFileChange(e, 'target')} 
                      />
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        {targetFile ? (
                          <div className="flex flex-col items-center">
                            <p className="font-medium">{targetFile.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(targetFile.size)}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Upload target PDF</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alignment options */}
                <div className="border rounded-md p-4 bg-muted/30 space-y-3">
                  <h3 className="text-sm font-medium">Alignment Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="source-lang" className="text-xs">Source Language</Label>
                      <Input id="source-lang" placeholder="e.g. Korean" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="target-lang" className="text-xs">Target Language</Label>
                      <Input id="target-lang" placeholder="e.g. English" className="mt-1" />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-4">
                  <Button 
                    onClick={handleAlignPdfs} 
                    disabled={!file || !targetFile || alignMutation.isPending} 
                    className="w-full sm:w-auto self-end"
                  >
                    {alignMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                        Aligning PDFs...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="mr-2 h-4 w-4" /> 
                        Align Documents
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Processing progress */}
                {alignMutation.isPending && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-center text-muted-foreground">
                      Aligning documents... This may take a few moments.
                    </p>
                  </div>
                )}

                {alignMutation.isSuccess && (
                  <Alert variant="default" className="bg-primary/10 border-primary/30">
                    <Check className="h-4 w-4 text-primary" />
                    <AlertTitle>Alignment Complete</AlertTitle>
                    <AlertDescription>
                      The aligned pairs have been successfully created and saved to the translation memory.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Alert variant="default" className="bg-muted/50">
              <FileText className="h-4 w-4" />
              <AlertTitle>About Bilingual Alignment</AlertTitle>
              <AlertDescription>
                <p className="mb-2">This feature helps you create translation memory entries from bilingual documents:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Automatically extracts text from both source and target PDFs</li>
                  <li>Aligns content by position (best for parallel documents)</li>
                  <li>Stores aligned pairs directly in the translation memory with 'Reviewed' status</li>
                  <li>Supports all language pairs</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

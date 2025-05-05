import React, { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud, FileText, AlertCircle, CheckCircle2, Download, ChevronRight, ChevronDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type ProcessResult = {
  message: string;
  extractedText?: string;
  pageCount?: number;
  segments?: string[];
  fileUrl?: string;
  fileName?: string;
};

export default function PDFProcessingPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const { toast } = useToast();

  const pdfProcessMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("No file selected");
      }

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await apiRequest("POST", "/api/admin/file/pdf/process", formData, {
        // Don't set content-type header for FormData
      });

      return await response.json();
    },
    onSuccess: (data) => {
      setResult(data);
      setActiveTab("results"); // Auto-switch to results tab on success
      toast({
        title: "Success",
        description: "PDF successfully processed",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error processing PDF",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file format",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      // Clear previous results when a new file is selected
      setResult(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to process",
        variant: "destructive",
      });
      return;
    }
    pdfProcessMutation.mutate();
  };
  
  const ProcessingStatusIndicator = () => {
    if (pdfProcessMutation.isPending) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing file...</span>
        </div>
      );
    }
    if (pdfProcessMutation.isError) {
      return (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Processing failed</span>
        </div>
      );
    }
    if (result) {
      return (
        <div className="flex items-center gap-2 text-green-500">
          <CheckCircle2 className="h-4 w-4" />
          <span>Processing complete</span>
        </div>
      );
    }
    return null;
  };

  return (
    <MainLayout title="PDF Processing">
      <div className="container py-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl font-bold">PDF Processing</h1>
          <p className="text-muted-foreground">
            Analyze PDF files to extract text and prepare content for translation. This tool helps
            you process PDF patent documents and extract text for translation projects.
          </p>
        </div>
        
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle>PDF Processing Workflow</CardTitle>
                <ProcessingStatusIndicator />
              </div>
              <CardDescription>
                Upload and process PDF files to extract text for translation
              </CardDescription>
              <TabsList className="mt-4 grid grid-cols-2">
                <TabsTrigger value="upload">1. Upload PDF</TabsTrigger>
                <TabsTrigger value="results" disabled={!result && !pdfProcessMutation.isPending}>2. View Results</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent className="pt-6">
              <TabsContent value="upload" className="mt-0">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="border rounded-md p-6 bg-muted/20">
                    <div className="grid w-full max-w-md mx-auto items-center gap-4">
                      <div>
                        <Label htmlFor="pdf-file" className="text-base mb-2 block">Select PDF File</Label>
                        <Input
                          id="pdf-file"
                          type="file"
                          accept="application/pdf"
                          onChange={handleFileChange}
                          className="cursor-pointer"
                        />
                      </div>
                      
                      {selectedFile && (
                        <div className="text-sm bg-muted/40 p-3 rounded-md">
                          <p className="font-medium">Selected file:</p>
                          <p>{selectedFile.name}</p>
                          <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button 
                      type="submit"
                      size="lg"
                      disabled={pdfProcessMutation.isPending || !selectedFile}
                      className="flex items-center gap-2"
                    >
                      {pdfProcessMutation.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FileText className="h-5 w-5" />
                          Process PDF
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="results" className="mt-0">
                {pdfProcessMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-12 w-12 animate-spin mb-4" />
                    <p className="text-lg">Processing PDF file...</p>
                    <p className="text-sm text-muted-foreground mt-2">This may take a moment depending on file size</p>
                  </div>
                ) : pdfProcessMutation.isError ? (
                  <Alert variant="destructive" className="my-6">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle>Processing Error</AlertTitle>
                    <AlertDescription>
                      {pdfProcessMutation.error?.message || "Failed to process PDF"}
                    </AlertDescription>
                  </Alert>
                ) : result ? (
                  <div className="space-y-6">
                    <Alert className="my-4">
                      <CheckCircle2 className="h-5 w-5" />
                      <AlertTitle>Processing Complete</AlertTitle>
                      <AlertDescription>{result.message}</AlertDescription>
                    </Alert>
                    
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        {result.pageCount && (
                          <div className="flex items-center gap-2 mb-4 text-sm bg-muted/30 p-3 rounded-md">
                            <FileText className="h-5 w-5" />
                            <span><strong>Pages:</strong> {result.pageCount}</span>
                          </div>
                        )}
                        
                        {result.fileUrl && (
                          <div className="flex flex-col gap-3 p-4 border rounded-md">
                            <p className="text-sm font-medium">Extracted content is ready for download</p>
                            <Button 
                              asChild 
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <a href={result.fileUrl} download={result.fileName || "extracted-text.txt"}>
                                <Download className="h-4 w-4" />
                                Download Extracted Text
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        {result.segments && result.segments.length > 0 && (
                          <Collapsible className="border rounded-md overflow-hidden">
                            <div className="bg-muted/30 p-3">
                              <CollapsibleTrigger className="flex w-full items-center justify-between">
                                <span className="font-medium">Segments ({result.segments.length})</span>
                                <ChevronDown className="h-4 w-4" />
                              </CollapsibleTrigger>
                            </div>
                            
                            <CollapsibleContent>
                              <div className="max-h-60 overflow-y-auto p-3">
                                <div className="space-y-1">
                                  {result.segments.slice(0, 10).map((segment, index) => (
                                    <div key={index} className="text-sm border-b pb-1 last:border-0">
                                      {segment}
                                    </div>
                                  ))}
                                  {result.segments.length > 10 && (
                                    <div className="text-sm text-muted-foreground italic pt-2">
                                      {result.segments.length - 10} more segments not shown
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    </div>
                    
                    {result.extractedText && (
                      <Collapsible className="border rounded-md overflow-hidden">
                        <div className="bg-muted/30 p-3">
                          <CollapsibleTrigger className="flex w-full items-center justify-between">
                            <span className="font-medium">Sample Extracted Text</span>
                            <ChevronDown className="h-4 w-4" />
                          </CollapsibleTrigger>
                        </div>
                        
                        <CollapsibleContent>
                          <div className="max-h-60 overflow-y-auto p-3">
                            <p className="text-sm whitespace-pre-line">
                              {result.extractedText.length > 500 
                                ? `${result.extractedText.substring(0, 500)}...` 
                                : result.extractedText}
                            </p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                    
                    <div className="flex justify-between pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab("upload")}
                      >
                        Process Another PDF
                      </Button>
                      
                      {result.fileUrl && (
                        <Button asChild>
                          <a href={result.fileUrl} download={result.fileName || "extracted-text.txt"}>
                            <Download className="h-4 w-4 mr-2" />
                            Download Results
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <UploadCloud className="h-12 w-12 mb-4" />
                    <p className="text-lg">No Results Yet</p>
                    <p className="text-sm mt-2">Upload and process a PDF file to see results</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("upload")}
                      className="mt-4"
                    >
                      Go to Upload
                    </Button>
                  </div>
                )}
              </TabsContent>
            </CardContent>
            
            <CardFooter className="flex justify-between border-t pt-4 pb-4">
              <div className="text-sm text-muted-foreground">
                Supported file type: PDF documents
              </div>
              <div className="text-sm text-muted-foreground">
                Max file size: 50MB
              </div>
            </CardFooter>
          </Tabs>
        </Card>
      </div>
    </MainLayout>
  );
}

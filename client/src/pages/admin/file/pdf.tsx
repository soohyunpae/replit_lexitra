import React, { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

type ProcessResult = {
  message: string;
  extractedText?: string;
  pageCount?: number;
  segments?: string[];
};

export default function PDFProcessingPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>
                Select a PDF file to process and extract text content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="pdf-file">PDF File</Label>
                  <Input
                    id="pdf-file"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                </div>
                
                {selectedFile && (
                  <div className="text-sm text-muted-foreground">
                    <p>Selected file: {selectedFile.name}</p>
                    <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}

                <Button 
                  type="submit"
                  disabled={pdfProcessMutation.isPending || !selectedFile}
                  className="flex items-center gap-2"
                >
                  {pdfProcessMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Process PDF
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                Processing results and extracted content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pdfProcessMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p>Processing PDF file...</p>
                </div>
              ) : pdfProcessMutation.isError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {pdfProcessMutation.error?.message || "Failed to process PDF"}
                  </AlertDescription>
                </Alert>
              ) : result ? (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                  
                  {result.pageCount && (
                    <p className="text-sm">Pages: {result.pageCount}</p>
                  )}

                  {result.segments && result.segments.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Extracted Segments ({result.segments.length}):</h3>
                      <div className="max-h-80 overflow-y-auto border rounded-md p-2">
                        <div className="space-y-1">
                          {result.segments.slice(0, 20).map((segment, index) => (
                            <div key={index} className="text-sm border-b pb-1 last:border-0">
                              {segment}
                            </div>
                          ))}
                          {result.segments.length > 20 && (
                            <div className="text-sm text-muted-foreground italic pt-2">
                              {result.segments.length - 20} more segments not shown
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {result.extractedText && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Sample Extracted Text:</h3>
                      <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                        <p className="text-sm whitespace-pre-line">
                          {result.extractedText.length > 500 
                            ? `${result.extractedText.substring(0, 500)}...` 
                            : result.extractedText}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <UploadCloud className="h-8 w-8 mb-2" />
                  <p>Upload and process a PDF file to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

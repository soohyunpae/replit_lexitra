import React, { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UploadCloud, FileText, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

type ConversionResult = {
  message: string;
  fileUrl?: string;
  originalName?: string;
  convertedName?: string;
};

const inputFormatOptions = [
  { value: "txt", label: "TXT - Plain Text" },
  { value: "docx", label: "DOCX - Word Document" },
  { value: "csv", label: "CSV - Comma Separated Values" },
  { value: "xliff", label: "XLIFF - XML Localization File" },
  { value: "pdf", label: "PDF - Portable Document Format" },
];

const getOutputFormatOptions = (inputFormat: string) => {
  const supportedConversions: Record<string, string[]> = {
    txt: ["txt", "csv", "xliff"],
    docx: ["docx", "csv", "xliff"],
    csv: ["csv", "txt"],
    xliff: ["xliff", "csv"],
    pdf: ["docx", "csv", "xliff"]
  };

  const formats = supportedConversions[inputFormat] || [];
  return formats.map(format => {
    const option = inputFormatOptions.find(opt => opt.value === format);
    return { value: format, label: option?.label || format.toUpperCase() };
  });
};

export default function FileConversionPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputFormat, setInputFormat] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<string>("");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const { toast } = useToast();

  const conversionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !inputFormat || !outputFormat) {
        throw new Error("Please select a file and specify input/output formats");
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("inputFormat", inputFormat);
      formData.append("outputFormat", outputFormat);

      const response = await apiRequest("POST", "/api/admin/file/convert", formData, {
        // Don't set content-type header for FormData
      });

      return await response.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Success",
        description: "File successfully converted",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error converting file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      // Try to determine input format from file extension
      const fileName = files[0].name.toLowerCase();
      if (fileName.endsWith(".txt")) setInputFormat("txt");
      else if (fileName.endsWith(".docx")) setInputFormat("docx");
      else if (fileName.endsWith(".csv")) setInputFormat("csv");
      else if (fileName.endsWith(".xliff") || fileName.endsWith(".xlf")) setInputFormat("xliff");
      else if (fileName.endsWith(".pdf")) setInputFormat("pdf");
      else setInputFormat("");
      
      // Clear previous results when a new file is selected
      setResult(null);
      setOutputFormat("");
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to convert",
        variant: "destructive",
      });
      return;
    }
    
    if (!inputFormat) {
      toast({
        title: "Input format not specified",
        description: "Please select the input format",
        variant: "destructive",
      });
      return;
    }
    
    if (!outputFormat) {
      toast({
        title: "Output format not specified",
        description: "Please select the output format",
        variant: "destructive",
      });
      return;
    }
    
    conversionMutation.mutate();
  };

  const outputFormatOptions = inputFormat ? getOutputFormatOptions(inputFormat) : [];

  return (
    <MainLayout title="File Format Conversion">
      <div className="container py-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl font-bold">File Format Conversion</h1>
          <p className="text-muted-foreground">
            Convert files between different formats for translation processing. This tool supports
            various file formats commonly used in patent translation workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>
                Select a file and specify the input/output formats for conversion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file">Select File</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      className="mt-1"
                    />
                  </div>
                  
                  {selectedFile && (
                    <div className="text-sm text-muted-foreground">
                      <p>Selected file: {selectedFile.name}</p>
                      <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="input-format">Input Format</Label>
                      <Select
                        value={inputFormat}
                        onValueChange={(value) => {
                          setInputFormat(value);
                          setOutputFormat(""); // Reset output format when input changes
                        }}
                      >
                        <SelectTrigger id="input-format">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          {inputFormatOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="output-format">Output Format</Label>
                      <Select
                        value={outputFormat}
                        onValueChange={setOutputFormat}
                        disabled={!inputFormat || outputFormatOptions.length === 0}
                      >
                        <SelectTrigger id="output-format">
                          <SelectValue placeholder={!inputFormat ? "Select input format first" : "Select format"} />
                        </SelectTrigger>
                        <SelectContent>
                          {outputFormatOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit"
                  disabled={conversionMutation.isPending || !selectedFile || !inputFormat || !outputFormat}
                  className="flex items-center gap-2 mt-2"
                >
                  {conversionMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Convert File
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversion Result</CardTitle>
              <CardDescription>
                Download the converted file
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conversionMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p>Converting file...</p>
                </div>
              ) : conversionMutation.isError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {conversionMutation.error?.message || "Failed to convert file"}
                  </AlertDescription>
                </Alert>
              ) : result ? (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                  
                  {result.fileUrl && (
                    <div className="flex flex-col items-center justify-center py-4 space-y-2">
                      <p className="text-sm text-center">
                        Your file has been converted. Click below to download.
                      </p>
                      <Button 
                        asChild 
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <a href={result.fileUrl} download={result.convertedName}>
                          <Download className="h-4 w-4" />
                          Download Converted File
                        </a>
                      </Button>
                      {result.originalName && result.convertedName && (
                        <div className="text-xs text-muted-foreground text-center">
                          <p>Original: {result.originalName}</p>
                          <p>Converted: {result.convertedName}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <UploadCloud className="h-8 w-8 mb-2" />
                  <p>Upload and convert a file to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

import React, { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UploadCloud, FileText, AlertCircle, CheckCircle2, Download, ChevronRight, ArrowRightLeft } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<string>("configure");
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
      setActiveTab("result"); // Auto-switch to results tab on success
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
  
  const ProcessingStatusIndicator = () => {
    if (conversionMutation.isPending) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Converting file...</span>
        </div>
      );
    }
    if (conversionMutation.isError) {
      return (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Conversion failed</span>
        </div>
      );
    }
    if (result) {
      return (
        <div className="flex items-center gap-2 text-green-500">
          <CheckCircle2 className="h-4 w-4" />
          <span>Conversion complete</span>
        </div>
      );
    }
    return null;
  };

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
        
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle>File Conversion Workflow</CardTitle>
                <ProcessingStatusIndicator />
              </div>
              <CardDescription>
                Convert files between different formats for translation processing
              </CardDescription>
              <TabsList className="mt-4 grid grid-cols-2">
                <TabsTrigger value="configure">1. Configure Conversion</TabsTrigger>
                <TabsTrigger value="result" disabled={!result && !conversionMutation.isPending}>2. Download Result</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent className="pt-6">
              <TabsContent value="configure" className="mt-0">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="border rounded-md p-6 bg-muted/20">
                    <div className="grid w-full max-w-xl mx-auto items-start gap-6">
                      <div>
                        <Label htmlFor="file" className="text-base mb-2 block">Select File</Label>
                        <Input
                          id="file"
                          type="file"
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
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="input-format" className="text-sm">Input Format</Label>
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
                        
                        <div className="space-y-2 flex flex-col">
                          <Label htmlFor="output-format" className="text-sm">Output Format</Label>
                          <div className="flex-1 flex items-center">
                            <div className="flex-1">
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
                            
                            {inputFormat && outputFormat && (
                              <div className="px-2 text-muted-foreground">
                                <ArrowRightLeft className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {inputFormat && outputFormat && (
                      <div className="mt-4 text-center text-sm text-muted-foreground">
                        <p>Converting from <span className="font-medium">{inputFormat.toUpperCase()}</span> to <span className="font-medium">{outputFormat.toUpperCase()}</span></p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-center">
                    <Button 
                      type="submit"
                      size="lg"
                      disabled={conversionMutation.isPending || !selectedFile || !inputFormat || !outputFormat}
                      className="flex items-center gap-2"
                    >
                      {conversionMutation.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Converting...
                        </>
                      ) : (
                        <>
                          <FileText className="h-5 w-5" />
                          Convert File
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="result" className="mt-0">
                {conversionMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-12 w-12 animate-spin mb-4" />
                    <p className="text-lg">Converting file...</p>
                    <p className="text-sm text-muted-foreground mt-2">This may take a moment depending on file size</p>
                  </div>
                ) : conversionMutation.isError ? (
                  <Alert variant="destructive" className="my-6">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle>Conversion Error</AlertTitle>
                    <AlertDescription>
                      {conversionMutation.error?.message || "Failed to convert file"}
                    </AlertDescription>
                  </Alert>
                ) : result ? (
                  <div className="space-y-6">
                    <Alert className="my-4">
                      <CheckCircle2 className="h-5 w-5" />
                      <AlertTitle>Conversion Complete</AlertTitle>
                      <AlertDescription>{result.message}</AlertDescription>
                    </Alert>
                    
                    {result.fileUrl && (
                      <div className="flex flex-col items-center justify-center py-8 space-y-4 border rounded-md">
                        <div className="flex items-center justify-center gap-2 p-3 bg-muted/30 rounded-md">
                          {result.originalName && result.convertedName && (
                            <div className="flex items-center gap-2">
                              <div className="text-center">
                                <div className="font-medium">{result.originalName}</div>
                                <div className="text-xs text-muted-foreground">{inputFormat?.toUpperCase()}</div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              <div className="text-center">
                                <div className="font-medium">{result.convertedName}</div>
                                <div className="text-xs text-muted-foreground">{outputFormat?.toUpperCase()}</div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-center max-w-md">
                          Your file has been successfully converted. Click the button below to download it.
                        </p>
                        
                        <Button 
                          asChild 
                          className="flex items-center gap-2"
                        >
                          <a href={result.fileUrl} download={result.convertedName}>
                            <Download className="h-4 w-4" />
                            Download Converted File
                          </a>
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex justify-between pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab("configure")}
                      >
                        Convert Another File
                      </Button>
                      
                      {result.fileUrl && (
                        <Button asChild variant="default">
                          <a href={result.fileUrl} download={result.convertedName}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <UploadCloud className="h-12 w-12 mb-4" />
                    <p className="text-lg">No Results Yet</p>
                    <p className="text-sm mt-2">Configure and convert a file to see results</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("configure")}
                      className="mt-4"
                    >
                      Go to Configuration
                    </Button>
                  </div>
                )}
              </TabsContent>
            </CardContent>
            
            <CardFooter className="flex justify-between border-t pt-4 pb-4">
              <div className="text-sm text-muted-foreground">
                Supported input formats: TXT, DOCX, CSV, XLIFF, PDF
              </div>
              <div className="text-sm text-muted-foreground">
                Conversion types vary by format
              </div>
            </CardFooter>
          </Tabs>
        </Card>
      </div>
    </MainLayout>
  );
}

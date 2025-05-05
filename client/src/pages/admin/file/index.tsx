import React, { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UploadCloud, FileText, AlertCircle, CheckCircle2, Download, ChevronRight, ArrowRightLeft, FileType, FilePlus2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

// Types for the results of different processing operations
type PdfExtractResult = {
  message: string;
  fileUrl?: string;
  extractedText?: string;
  fileName?: string;
  outputFileName?: string;
  segments?: string[];
  segmentCount?: number;
  pageCount?: number;
};

type ConversionResult = {
  message: string;
  fileUrl?: string;
  originalName?: string;
  convertedName?: string;
};

type FileProcessResult = PdfExtractResult | ConversionResult;

// Format options for file conversion
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

export default function FilePreprocessingPage() {
  // Common state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [workflowType, setWorkflowType] = useState<string>("pdf-extract");
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  
  // Format conversion state
  const [inputFormat, setInputFormat] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<string>("");
  const [addToTm, setAddToTm] = useState<boolean>(false);
  
  const { toast } = useToast();

  // Detect file type for workflow selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      // Try to determine input format from file extension
      const fileName = files[0].name.toLowerCase();
      if (fileName.endsWith(".txt")) {
        setInputFormat("txt");
        setWorkflowType("convert");
      }
      else if (fileName.endsWith(".docx")) {
        setInputFormat("docx"); 
        setWorkflowType("convert");
      }
      else if (fileName.endsWith(".csv")) {
        setInputFormat("csv");
        setWorkflowType("convert");
      }
      else if (fileName.endsWith(".xliff") || fileName.endsWith(".xlf")) {
        setInputFormat("xliff");
        setWorkflowType("convert");
      }
      else if (fileName.endsWith(".pdf")) {
        setInputFormat("pdf");
        // Default to PDF extraction for PDF files
        setWorkflowType("pdf-extract");
      }
      else {
        setInputFormat("");
      }
      
      // Clear previous results and output format
      setResult(null);
      setOutputFormat("");
    }
  };

  // PDF Processing mutation
  const pdfExtractMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("Please select a PDF file");
      }

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await apiRequest("POST", "/api/admin/file/pdf/process", formData);
      return await response.json();
    },
    onSuccess: (data: PdfExtractResult) => {
      setResult(data);
      setActiveTab("result");
      toast({
        title: "Success",
        description: "PDF text extraction completed",
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

  // File conversion mutation
  const conversionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !inputFormat || !outputFormat) {
        throw new Error("Please select a file and specify input/output formats");
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("inputFormat", inputFormat);
      formData.append("outputFormat", outputFormat);
      formData.append("addToTm", addToTm.toString());

      const response = await apiRequest("POST", "/api/admin/file/convert", formData);
      return await response.json();
    },
    onSuccess: (data: ConversionResult) => {
      setResult(data);
      setActiveTab("result");
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

  // Combined mutation based on workflow type
  const processMutation = useMemo(() => {
    return workflowType === "pdf-extract" ? pdfExtractMutation : conversionMutation;
  }, [workflowType, pdfExtractMutation, conversionMutation]);

  // Function to mutate based on workflow type
  const handleProcessMutation = () => {
    if (workflowType === "pdf-extract") {
      pdfExtractMutation.mutate();
    } else {
      conversionMutation.mutate();
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to process",
        variant: "destructive",
      });
      return;
    }
    
    // Additional validation for conversion workflow
    if (workflowType === "convert") {
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
    }
    
    handleProcessMutation();
  };

  const outputFormatOptions = inputFormat ? getOutputFormatOptions(inputFormat) : [];
  
  // Status indicator component
  const ProcessingStatusIndicator = () => {
    if (processMutation.isPending) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing file...</span>
        </div>
      );
    }
    if (processMutation.isError) {
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

  // File upload area
  const renderFileUpload = () => (
    <div className="space-y-6">
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
          
          {/* Workflow type selector */}
          {selectedFile?.name.toLowerCase().endsWith(".pdf") && (
            <div className="space-y-2">
              <Label htmlFor="workflow-type" className="text-sm">Processing Type</Label>
              <Select
                value={workflowType}
                onValueChange={setWorkflowType}
              >
                <SelectTrigger id="workflow-type">
                  <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf-extract">Extract Text from PDF</SelectItem>
                  <SelectItem value="convert">Convert PDF to Other Format</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Format conversion options */}
          {(workflowType === "convert" || !selectedFile?.name.toLowerCase().endsWith(".pdf")) && (
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
          )}

          {/* Add to TM option */}
          {workflowType === "convert" && inputFormat && outputFormat && (
            <div className="flex items-center space-x-2">
              <Switch 
                id="add-to-tm" 
                checked={addToTm} 
                onCheckedChange={setAddToTm} 
              />
              <Label htmlFor="add-to-tm">Add converted content to Translation Memory</Label>
            </div>
          )}
        </div>
        
        {inputFormat && outputFormat && workflowType === "convert" && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Converting from <span className="font-medium">{inputFormat.toUpperCase()}</span> to <span className="font-medium">{outputFormat.toUpperCase()}</span></p>
          </div>
        )}
      </div>
      
      <div className="flex justify-center">
        <Button 
          type="submit"
          size="lg"
          disabled={processMutation.isPending || 
            !selectedFile || 
            (workflowType === "convert" && (!inputFormat || !outputFormat))}
          className="flex items-center gap-2"
        >
          {processMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : workflowType === "pdf-extract" ? (
            <>
              <FileText className="h-5 w-5" />
              Extract Text
            </>
          ) : (
            <>
              <FileType className="h-5 w-5" />
              Convert File
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // Results area
  const renderResults = () => (
    <div>
      {processMutation.isPending ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin mb-4" />
          <p className="text-lg">Processing file...</p>
          <p className="text-sm text-muted-foreground mt-2">This may take a moment depending on file size</p>
        </div>
      ) : processMutation.isError ? (
        <Alert variant="destructive" className="my-6">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Processing Error</AlertTitle>
          <AlertDescription>
            {processMutation.error?.message || "Failed to process file"}
          </AlertDescription>
        </Alert>
      ) : result ? (
        <div className="space-y-6">
          <Alert className="my-4">
            <CheckCircle2 className="h-5 w-5" />
            <AlertTitle>{workflowType === "pdf-extract" ? "Text Extraction Complete" : "Conversion Complete"}</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
          
          {/* PDF extraction specific result data */}
          {'segments' in result && result.segments && (
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-medium mb-2">Extracted Text</h3>
              <div className="text-sm text-muted-foreground mb-3">
                <p>Extracted {result.segmentCount} segments from {result.fileName}</p>
                {result.pageCount && <p>Approximate page count: {result.pageCount}</p>}
              </div>
              
              {result.extractedText && (
                <div className="bg-muted/30 p-3 rounded-md max-h-[300px] overflow-y-auto text-sm font-mono">
                  {result.extractedText}
                </div>
              )}
            </div>
          )}
          
          {/* Conversion specific result data */}
          {'originalName' in result && result.originalName && result.convertedName && (
            <div className="flex flex-col items-center justify-center py-4 space-y-4 border rounded-md">
              <div className="flex items-center justify-center gap-2 p-3 bg-muted/30 rounded-md">
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
              </div>
            </div>
          )}
          
          {/* Download link */}
          {result.fileUrl && (
            <div className="flex justify-center">
              <Button 
                asChild 
                className="flex items-center gap-2"
              >
                <a 
                  href={result.fileUrl} 
                  download={'outputFileName' in result ? result.outputFileName : ('convertedName' in result ? result.convertedName : undefined)}
                >
                  <Download className="h-4 w-4" />
                  Download {workflowType === "pdf-extract" ? "Extracted Text" : "Converted File"}
                </a>
              </Button>
            </div>
          )}
          
          <div className="flex justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setActiveTab("upload");
                setSelectedFile(null);
                setResult(null);
              }}
            >
              Process Another File
            </Button>
            
            {result.fileUrl && (
              <Button asChild variant="default">
                <a 
                  href={result.fileUrl} 
                  download={'outputFileName' in result ? result.outputFileName : ('convertedName' in result ? result.convertedName : undefined)}
                >
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
          <p className="text-sm mt-2">Process a file to see results</p>
          <Button 
            variant="outline" 
            onClick={() => setActiveTab("upload")}
            className="mt-4"
          >
            Go to Upload
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <MainLayout title="File Preprocessing">
      <div className="container py-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl font-bold">File Preprocessing Hub</h1>
          <p className="text-muted-foreground">
            Unified workspace for processing and preparing files for translation.
            Extract text from PDFs, convert between formats, and prepare files for translation.
          </p>
        </div>
        
        <Card className="overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle>File Processing Workflow</CardTitle>
                <ProcessingStatusIndicator />
              </div>
              <CardDescription>
                Process files for translation - extract text, convert formats, and prepare for translation memory
              </CardDescription>
              <TabsList className="mt-4 grid grid-cols-2">
                <TabsTrigger value="upload">1. Upload & Configure</TabsTrigger>
                <TabsTrigger value="result" disabled={!result && !processMutation.isPending}>2. View Results</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit}>
                <TabsContent value="upload" className="mt-0">
                  {renderFileUpload()}
                </TabsContent>
                
                <TabsContent value="result" className="mt-0">
                  {renderResults()}
                </TabsContent>
              </form>
            </CardContent>
            
            <CardFooter className="flex justify-between border-t pt-4 pb-4">
              <div className="text-sm text-muted-foreground">
                Supported file types: PDF, TXT, DOCX, CSV, XLIFF
              </div>
              <div className="text-sm text-muted-foreground">
                Max file size: 100MB
              </div>
            </CardFooter>
          </Tabs>
        </Card>
      </div>
    </MainLayout>
  );
}
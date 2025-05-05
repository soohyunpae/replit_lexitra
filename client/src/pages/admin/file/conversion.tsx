import React, { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Upload, Check, FileUp, X, Copy } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { formatFileSize } from "@/lib/utils";

interface FileFormat {
  id: string;
  name: string;
  description: string;
  extensions: string[];
  icon: React.ReactNode;
}

const INPUT_FORMATS: FileFormat[] = [
  { 
    id: "txt", 
    name: "Text", 
    description: "Simple text files",
    extensions: [".txt"], 
    icon: <FileText className="h-4 w-4" />
  },
  { 
    id: "docx", 
    name: "Word", 
    description: "Microsoft Word documents",
    extensions: [".docx"], 
    icon: <FileText className="h-4 w-4" />
  },
  { 
    id: "csv", 
    name: "CSV", 
    description: "Comma-separated values",
    extensions: [".csv"], 
    icon: <FileText className="h-4 w-4" />
  },
  { 
    id: "xliff", 
    name: "XLIFF", 
    description: "XML Localization Interchange File Format",
    extensions: [".xliff", ".xlf"], 
    icon: <FileText className="h-4 w-4" />
  },
  {
    id: "pdf", 
    name: "PDF", 
    description: "PDF documents (text-based only)",
    extensions: [".pdf"], 
    icon: <FileText className="h-4 w-4" />
  }
];

const OUTPUT_FORMATS: FileFormat[] = [
  { 
    id: "txt", 
    name: "Text", 
    description: "Simple text export",
    extensions: [".txt"],
    icon: <FileText className="h-4 w-4" />
  },
  { 
    id: "docx", 
    name: "Word", 
    description: "Formatted Word document",
    extensions: [".docx"],
    icon: <FileText className="h-4 w-4" />
  },
  { 
    id: "csv", 
    name: "CSV", 
    description: "For TM/TU export",
    extensions: [".csv"],
    icon: <FileText className="h-4 w-4" />
  },
  { 
    id: "xliff", 
    name: "XLIFF", 
    description: "CAT tool exchange format",
    extensions: [".xliff"],
    icon: <FileText className="h-4 w-4" />
  }
];

export default function FormatConversionPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [inputFormat, setInputFormat] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<string>("");
  const [convertedFile, setConvertedFile] = useState<string | null>(null);

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      // Check if file extension is supported
      const extension = '.' + droppedFile.name.split('.').pop()?.toLowerCase();
      const format = INPUT_FORMATS.find(f => f.extensions.includes(extension));
      
      if (format) {
        setFile(droppedFile);
        setInputFormat(format.id);
      } else {
        toast({
          title: "Unsupported file format",
          description: "Please select a supported file type (TXT, DOCX, CSV, XLIFF, or PDF)",
          variant: "destructive"
        });
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Check if file extension is supported
      const extension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      const format = INPUT_FORMATS.find(f => f.extensions.includes(extension));
      
      if (format) {
        setFile(selectedFile);
        setInputFormat(format.id);
      } else {
        toast({
          title: "Unsupported file format",
          description: "Please select a supported file type (TXT, DOCX, CSV, XLIFF, or PDF)",
          variant: "destructive"
        });
      }
    }
  };

  const conversionMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/admin/file/convert", {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to convert file");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setConvertedFile(data.fileUrl);
      toast({
        title: "Conversion Complete",
        description: `File has been successfully converted to ${outputFormat.toUpperCase()} format`,
        variant: "default"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Conversion Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleConvert = () => {
    if (!file || !inputFormat || !outputFormat) return;
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("inputFormat", inputFormat);
    formData.append("outputFormat", outputFormat);
    
    conversionMutation.mutate(formData);
  };

  const getOutputOptions = () => {
    if (!inputFormat) return OUTPUT_FORMATS;
    
    // Based on our file format mapping from the specs
    const mapping: Record<string, string[]> = {
      txt: ["txt", "csv", "xliff"],
      docx: ["docx", "csv", "xliff"],
      csv: ["csv", "txt"],
      xliff: ["xliff", "csv"],
      pdf: ["docx", "csv", "xliff"]
    };
    
    const availableFormats = mapping[inputFormat] || [];
    return OUTPUT_FORMATS.filter(format => availableFormats.includes(format.id));
  };

  // Check if user is admin
  if (authLoading) {
    return (
      <MainLayout title="File Format Conversion">
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
    <MainLayout title="File Format Conversion">
      <div className="container py-6 space-y-8">
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl font-bold">File Format Conversion</h1>
          <p className="text-muted-foreground">
            Convert translation files between different formats for improved project interoperability.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-primary" />
                <span>Convert Translation Files</span>
              </CardTitle>
              <CardDescription>
                Upload a file and select the output format you need.
                Available output formats will depend on the input file type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File upload area */}
              <div 
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" 
                onDragOver={(e) => e.preventDefault()} 
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden"
                  onChange={handleFileChange} 
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  {file ? (
                    <div className="flex flex-col items-center">
                      <p className="font-medium text-lg">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} · {inputFormat.toUpperCase()}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-lg">Click or drag & drop your file</p>
                      <p className="text-sm text-muted-foreground">
                        Supported formats: TXT, DOCX, CSV, XLIFF, PDF
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Conversion options */}
              {file && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Input Format</Label>
                      <Select value={inputFormat} onValueChange={setInputFormat}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select input format" />
                        </SelectTrigger>
                        <SelectContent>
                          {INPUT_FORMATS.map((format) => (
                            <SelectItem key={format.id} value={format.id}>
                              <div className="flex items-center gap-2">
                                {format.icon}
                                <span>{format.name}</span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  {format.extensions.join(", ")}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Output Format</Label>
                      <Select 
                        value={outputFormat} 
                        onValueChange={setOutputFormat}
                        disabled={!inputFormat}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select output format" />
                        </SelectTrigger>
                        <SelectContent>
                          {getOutputOptions().map((format) => (
                            <SelectItem key={format.id} value={format.id}>
                              <div className="flex items-center gap-2">
                                {format.icon}
                                <span>{format.name}</span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  {format.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button 
                      onClick={handleConvert} 
                      disabled={!inputFormat || !outputFormat || conversionMutation.isPending} 
                      className="w-full sm:w-auto"
                    >
                      {conversionMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                          Converting...
                        </>
                      ) : (
                        <>
                          <FileUp className="mr-2 h-4 w-4" /> 
                          Convert File
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Result */}
              {convertedFile && (
                <div className="mt-8 border rounded-md p-4 bg-primary/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        Conversion Complete
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your file has been successfully converted. You can download it below.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={convertedFile} download>
                        <FileText className="mr-2 h-4 w-4" /> Download
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Format Support Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5 text-primary" />
                <span>Format Mapping</span>
              </CardTitle>
              <CardDescription>
                Available conversion options between different file formats.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 text-sm font-medium">Uploaded As</th>
                      <th className="text-left p-2 text-sm font-medium">Export Options Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">.txt</td>
                      <td className="p-2 text-sm">.txt, .csv, .xliff</td>
                    </tr>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">.docx</td>
                      <td className="p-2 text-sm">.docx, .csv, .xliff</td>
                    </tr>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">.xliff</td>
                      <td className="p-2 text-sm">.xliff, .csv</td>
                    </tr>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">.pdf</td>
                      <td className="p-2 text-sm">.docx, .csv, .xliff (after preprocessing)</td>
                    </tr>
                    <tr className="hover:bg-muted/50">
                      <td className="p-2 text-sm">.csv</td>
                      <td className="p-2 text-sm">.csv, .txt (converted content)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

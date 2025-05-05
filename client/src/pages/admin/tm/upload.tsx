import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileUp, Loader2, TableProperties, Upload as UploadIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Schema for TM upload form
const tmUploadSchema = z.object({
  sourceLanguage: z.string().min(1, "Source language is required"),
  targetLanguage: z.string().min(1, "Target language is required"),
  file: z.any().refine((file) => file?.length > 0, "File is required"),
  description: z.string().optional(),
  format: z.enum(["csv", "tmx", "xlsx"]),
});

type TMUploadFormValues = z.infer<typeof tmUploadSchema>;

interface TMUploadProps {
  embedded?: boolean;
}

export default function TMUpload({ embedded = false }: TMUploadProps) {
  const { user, isLoading } = useAuth();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Form definition
  const form = useForm<TMUploadFormValues>({
    resolver: zodResolver(tmUploadSchema),
    defaultValues: {
      sourceLanguage: "",
      targetLanguage: "",
      description: "",
      format: "csv",
    },
  });

  // Mutation for file upload
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      setUploadProgress(0);
      const response = await apiRequest("POST", "/api/admin/tm/upload", data, {
        onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload successful",
        description: "The translation memory file has been uploaded and processed.",
      });
      form.reset();
      setUploadProgress(null);
      queryClient.invalidateQueries({ queryKey: ["/api/tm"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(null);
    },
  });

  // Form submission handler
  const onSubmit = (values: TMUploadFormValues) => {
    const formData = new FormData();
    formData.append("sourceLanguage", values.sourceLanguage);
    formData.append("targetLanguage", values.targetLanguage);
    formData.append("description", values.description || "");
    formData.append("format", values.format);
    
    if (values.file?.[0]) {
      formData.append("file", values.file[0]);
    }
    
    uploadMutation.mutate(formData);
  };

  // Render upload form content
  const renderFormContent = () => (
    <div>
      {!embedded && (
        <div className="flex items-center mb-6">
          <UploadIcon className="mr-2 h-6 w-6" />
          <h1 className="text-2xl font-bold">Translation Memory Upload</h1>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardDescription>
            Upload a file containing translation memory data. Supported formats: CSV, TMX, Excel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sourceLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Language</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EN">English</SelectItem>
                          <SelectItem value="KO">Korean</SelectItem>
                          <SelectItem value="JA">Japanese</SelectItem>
                          <SelectItem value="ZH">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Language</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EN">English</SelectItem>
                          <SelectItem value="KO">Korean</SelectItem>
                          <SelectItem value="JA">Japanese</SelectItem>
                          <SelectItem value="ZH">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Format</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select file format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="tmx">TMX</SelectItem>
                        <SelectItem value="xlsx">Excel</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Format of the translation memory file.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter a description for this TM file"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description to help identify this translation memory.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="file"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Upload File</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept=".csv,.tmx,.xlsx,.xls"
                          onChange={(e) => {
                            onChange(e.target.files);
                          }}
                          {...fieldProps}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select a translation memory file to upload.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {uploadProgress !== null && (
                <div className="w-full bg-secondary rounded-full h-2.5 mb-4">
                  <div 
                    className="bg-primary h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Uploading: {uploadProgress}%
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={uploadMutation.isPending}
                  className="w-full md:w-auto"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FileUp className="mr-2 h-4 w-4" />
                      Upload TM File
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <MainLayout title="TM Upload">
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

  // If embedded in another component, render without main layout
  if (embedded) {
    return renderFormContent();
  }

  // Otherwise, render with main layout
  return (
    <MainLayout title="TM Upload">
      <div className="container py-6">
        {renderFormContent()}
      </div>
    </MainLayout>
  );
}

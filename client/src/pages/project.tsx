import React, { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Upload, FileText, FileIcon, Plus } from "lucide-react";

const fileFormSchema = z.object({
  name: z.string().min(1, "File name is required"),
  content: z.string().min(1, "File content is required"),
  uploadType: z.enum(["paste", "upload"]).default("paste")
});

type FileFormValues = z.infer<typeof fileFormSchema>;

// Helper function to read file contents
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

export default function Project() {
  const [isMatch, params] = useRoute("/projects/:id");
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Get project ID from URL params
  const projectId = isMatch && params ? parseInt(params.id) : null;
  
  const { data: project, isLoading } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });
  
  const form = useForm<FileFormValues>({
    resolver: zodResolver(fileFormSchema),
    defaultValues: {
      name: "",
      content: "",
    },
  });
  
  const createFile = useMutation({
    mutationFn: async (data: FileFormValues & { projectId: number }) => {
      const response = await apiRequest("POST", "/api/files", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      setIsDialogOpen(false);
      form.reset();
      navigate(`/translation/${data.id}`);
    },
  });
  
  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setSelectedFile(file);
      const fileName = file.name;
      const fileContent = await readFileAsText(file);
      
      form.setValue("name", fileName);
      form.setValue("content", fileContent);
      form.setValue("uploadType", "upload");
    } catch (error) {
      console.error("Error reading file:", error);
    }
  };
  
  // Click handler for file upload button
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Form submit handler
  function onSubmit(data: FileFormValues) {
    if (!projectId) return;
    
    createFile.mutate({
      ...data,
      projectId
    });
  }
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex flex-1 h-full">
          <Sidebar />
          <div className="flex-1 p-8 flex items-center justify-center">
            <div className="animate-pulse space-y-4 w-full max-w-2xl">
              <div className="h-8 bg-accent rounded w-1/3"></div>
              <div className="h-4 bg-accent rounded w-1/2"></div>
              <div className="h-40 bg-accent rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex flex-1 h-full">
          <Sidebar />
          <div className="flex-1 p-8 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">Project not found</h2>
              <p className="text-muted-foreground mb-4">
                The project you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => navigate("/")}>Go back to projects</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header title={project.name} />
      <div className="flex flex-1 h-full">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <p className="text-muted-foreground">
                  {project.sourceLanguage} → {project.targetLanguage}
                </p>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <FileIcon className="mr-2 h-4 w-4" />
                    Add File
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Translation File</DialogTitle>
                    <DialogDescription>
                      Upload or paste the content you want to translate.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="uploadType"
                        render={({ field }) => (
                          <FormItem className="pb-3">
                            <div className="flex items-center space-x-4 mb-2">
                              <Button
                                type="button"
                                className={`flex-1 ${field.value === 'paste' ? 'bg-primary' : 'bg-accent text-muted-foreground'}`}
                                onClick={() => form.setValue("uploadType", "paste")}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Paste Text
                              </Button>

                              <Button
                                type="button"
                                className={`flex-1 ${field.value === 'upload' ? 'bg-primary' : 'bg-accent text-muted-foreground'}`}
                                onClick={handleUploadClick}
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                Upload File
                              </Button>

                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                                accept=".txt,.docx,.pdf"
                              />
                            </div>
                            {selectedFile && (
                              <div className="text-sm text-muted-foreground">
                                Selected file: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>File Name</FormLabel>
                            <FormControl>
                              <Input placeholder="patent_2023.txt" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Paste text content here or upload a file. Each line will be treated as a separate segment for translation."
                                className="min-h-[200px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={createFile.isPending}
                        >
                          {createFile.isPending ? "Creating..." : "Create File"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            <Separator className="mb-6" />
            
            {project.files && project.files.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.files.map((file: any) => (
                  <div 
                    key={file.id} 
                    className="border border-border rounded-lg p-4 hover:border-primary/60 transition-colors cursor-pointer"
                    onClick={() => navigate(`/translation/${file.id}`)}
                  >
                    <div className="flex items-center mb-2">
                      <FileText className="mr-2 h-5 w-5 text-primary" />
                      <h3 className="font-medium truncate">{file.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Created {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent the click from propagating to parent
                        navigate(`/translation/${file.id}`);
                      }}
                    >
                      Open Translation
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <div className="mx-auto h-12 w-12 rounded-full bg-accent flex items-center justify-center mb-4">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No files yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Add your first file to start translating. You can paste text directly or upload a file.
                </p>
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="flex items-center"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add New File
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

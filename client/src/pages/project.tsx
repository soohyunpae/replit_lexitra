import React, { useState, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
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
import { formatDate } from "@/lib/utils";
import { TranslationUnit } from "@/types";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  FileIcon, 
  Plus, 
  ArrowRight, 
  Calendar, 
  Download, 
  ChevronLeft,
  Book,
  Database,
  Clock,
  FolderOpen
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


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
  
  // Get all TM entries to count TM matches
  const { data: tmEntries } = useQuery<any>({
    queryKey: ["/api/tm/all"],
  });
  
  // Get all glossary terms
  const { data: glossaryTerms } = useQuery<any>({
    queryKey: ["/api/glossary/all"],
  });
  
  // Get all segments for all files in this project
  const getFileSegments = async (fileId: number) => {
    const response = await apiRequest("GET", `/api/segments/${fileId}`);
    return response.json();
  };
  
  // Fetch segments for each file
  const { data: allSegmentsData, isLoading: segmentsLoading } = useQuery<{[key: number]: TranslationUnit[]}>({ 
    queryKey: [`/api/projects/${projectId}/segments`],
    queryFn: async () => {
      if (!project?.files || project.files.length === 0) return {};
      
      const segmentsByFile: {[key: number]: TranslationUnit[]} = {};
      
      for (const file of project.files) {
        const segments = await getFileSegments(file.id);
        segmentsByFile[file.id] = segments;
      }
      
      return segmentsByFile;
    },
    enabled: !!project?.files && project.files.length > 0,
  });
  
  // Calculate statistics for the entire project
  const projectStats = useMemo(() => {
    if (!allSegmentsData) return null;
    
    // Flatten all segments from all files
    const allSegments = Object.values(allSegmentsData).flat();
    const totalSegments = allSegments.length;
    const completedSegments = allSegments.filter(seg => seg.target && seg.target.trim() !== '').length;
    const completionPercentage = totalSegments > 0 ? Math.round((completedSegments / totalSegments) * 100) : 0;
    
    // Count segments by status
    const statusCounts = {
      "MT": 0,
      "Fuzzy": 0,
      "100%": 0,
      "Reviewed": 0
    };
    
    allSegments.forEach(segment => {
      if (segment.status in statusCounts) {
        statusCounts[segment.status as keyof typeof statusCounts]++;
      }
    });
    
    // Count glossary matches
    let glossaryMatchCount = 0;
    if (glossaryTerms?.length > 0) {
      allSegments.forEach(segment => {
        const source = segment.source.toLowerCase();
        glossaryTerms.forEach((term: any) => {
          if (source.includes(term.source.toLowerCase())) {
            glossaryMatchCount++;
          }
        });
      });
    }
    
    return {
      totalSegments,
      completedSegments,
      completionPercentage,
      statusCounts,
      glossaryMatchCount
    };
  }, [allSegmentsData, glossaryTerms]);
  
  // Calculate statistics for each file
  const fileStats = useMemo(() => {
    if (!allSegmentsData || !project?.files) return {};
    
    const stats: {[key: number]: {total: number, completed: number, percentage: number}} = {};
    
    project.files.forEach((file: any) => {
      const segments = allSegmentsData[file.id] || [];
      const total = segments.length;
      const completed = segments.filter(seg => seg.target && seg.target.trim() !== '').length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      stats[file.id] = {
        total,
        completed,
        percentage
      };
    });
    
    return stats;
  }, [allSegmentsData, project?.files]);

  
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
      <MainLayout title="Loading Project...">
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="animate-pulse space-y-4 w-full max-w-2xl">
            <div className="h-8 bg-accent rounded w-1/3"></div>
            <div className="h-4 bg-accent rounded w-1/2"></div>
            <div className="h-40 bg-accent rounded"></div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (!project) {
    return (
      <MainLayout title="Project Not Found">
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-medium mb-2">Project not found</h2>
            <p className="text-muted-foreground mb-4">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate("/")}>Go back to projects</Button>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout title={project.name}>
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground">
                {project.sourceLanguage} → {project.targetLanguage}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/")}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              
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
          </div>
          
          <Separator className="mb-6" />
          
          {/* Project information and summary - 2 column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Project Info Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  Project Info
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex flex-col space-y-3">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">Project Name:</div>
                    <div className="font-medium">{project.name}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">Language Pair:</div>
                    <div className="font-medium flex items-center">
                      <span className="px-2 py-0.5 bg-primary/10 rounded-md text-xs">{project.sourceLanguage}</span>
                      <span className="mx-1">→</span>
                      <span className="px-2 py-0.5 bg-primary/10 rounded-md text-xs">{project.targetLanguage}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">Created:</div>
                    <div className="font-medium">
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">Last Updated:</div>
                    <div className="font-medium">
                      <span>{formatDate(project.updatedAt || project.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">Deadline:</div>
                    <div className="font-medium">
                      <span>{project.deadline ? formatDate(project.deadline) : 'Not set'}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">Glossary:</div>
                    <div className="font-medium">
                      <span>Default Glossary</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">TM Used:</div>
                    <div className="font-medium">
                      <span>Default TM</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Translation Summary Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  Translation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3 pt-1">
                {projectStats ? (
                  <>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-muted-foreground">Completion:</div>
                          <div className="font-medium">
                            {projectStats.completedSegments} / {projectStats.totalSegments} segments
                            <span className="ml-1 text-primary">
                              ({projectStats.completionPercentage}%)
                            </span>
                          </div>
                        </div>
                        <Progress value={projectStats.completionPercentage} className="h-2" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="text-muted-foreground">TM Match Breakdown:</div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span>100% Match:</span>
                          <span className="font-medium ml-auto">{projectStats.statusCounts["100%"]}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <span>Fuzzy Match:</span>
                          <span className="font-medium ml-auto">{projectStats.statusCounts["Fuzzy"]}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span>MT:</span>
                          <span className="font-medium ml-auto">{projectStats.statusCounts["MT"]}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          <span>Reviewed:</span>
                          <span className="font-medium ml-auto">{projectStats.statusCounts["Reviewed"]}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      <div className="text-muted-foreground">Glossary Usage:</div>
                      <div className="font-medium">
                        {projectStats.glossaryMatchCount} term matches
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="animate-pulse space-y-2 py-2">
                    <div className="h-4 bg-accent rounded w-full"></div>
                    <div className="h-4 bg-accent rounded w-3/4"></div>
                    <div className="h-4 bg-accent rounded w-1/2"></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Action Buttons row */}
          <div className="flex gap-2 mb-6 justify-end">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download All
            </Button>
            <Button
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add File
            </Button>
          </div>
          
          {/* File list */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                Files
              </CardTitle>
              <CardDescription>
                All uploaded files for translation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.files && project.files.length > 0 ? (
                <div className="space-y-2">
                  {project.files.map((file: any) => {
                    const stats = fileStats[file.id] || { total: 0, completed: 0, percentage: 0 };
                    return (
                      <div 
                        key={file.id} 
                        className="border border-border rounded-lg p-4 hover:border-primary/60 transition-colors"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                          <div className="md:col-span-2">
                            <div className="mb-2">
                              <h3 className="font-medium truncate">{file.name}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={stats.percentage} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {stats.completed}/{stats.total} ({stats.percentage}%)
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            {formatDate(file.updatedAt || file.createdAt)}
                          </div>
                          
                          <div className="flex justify-end">
                            <Button
                              onClick={() => navigate(`/translation/${file.id}`)}
                            >
                              Open Editor
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
            </CardContent>
          </Card>
        </div>
      </main>
    </MainLayout>
  );
}

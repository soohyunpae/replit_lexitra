import React, { useState } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Calendar, 
  FileText, 
  Plus, 
  ArrowRight, 
  Trash2, 
  ExternalLink,
  Clock
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

const projectFormSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
  sourceLanguage: z.string().min(1, "Source language is required"),
  targetLanguage: z.string().min(1, "Target language is required"),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function Home() {
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  type Project = { id: number; name: string; description?: string; sourceLanguage: string; targetLanguage: string; files?: any[]; createdAt: string; };
  
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/projects");
      return res.json();
    },
  });
  
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      sourceLanguage: "KO",
      targetLanguage: "EN",
    },
  });
  
  const createProject = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsDialogOpen(false);
      form.reset();
      navigate(`/projects/${data.id}`);
    },
  });
  
  function onSubmit(data: ProjectFormValues) {
    createProject.mutate(data);
  }
  
  return (
    <MainLayout title="Projects">
      <main className="flex-1 container max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to Lexitra</h1>
            <p className="text-muted-foreground mt-1">Specialized translation tool for patent documents</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Translation Project</DialogTitle>
                <DialogDescription>
                  Set up a new translation project with source and target languages.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Patent Translation 2023" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the project"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
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
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="KO">Korean (KO)</SelectItem>
                              <SelectItem value="JA">Japanese (JA)</SelectItem>
                              <SelectItem value="EN">English (EN)</SelectItem>
                              <SelectItem value="ZH">Chinese (ZH)</SelectItem>
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
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="EN">English (EN)</SelectItem>
                              <SelectItem value="KO">Korean (KO)</SelectItem>
                              <SelectItem value="JA">Japanese (JA)</SelectItem>
                              <SelectItem value="ZH">Chinese (ZH)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={createProject.isPending}
                    >
                      {createProject.isPending ? "Creating..." : "Create Project"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-5 w-2/3 bg-accent rounded"></div>
                  <div className="h-4 w-full bg-accent rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-full bg-accent rounded mb-2"></div>
                  <div className="h-4 w-3/4 bg-accent rounded"></div>
                </CardContent>
                <CardFooter>
                  <div className="h-9 w-1/3 bg-accent rounded"></div>
                </CardFooter>
              </Card>
            ))
          ) : projects && projects.length > 0 ? (
            projects.map((project: Project) => (
              <Card 
                key={project.id} 
                className="overflow-hidden group hover:shadow-md transition-all duration-200 border-border hover:border-primary/30"
              >
                {/* 프로젝트 랭귀지 컬러 바 추가 */}
                <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary/70"></div>
                <CardHeader className="pb-2 pt-4">
                  <div className="flex justify-between items-start mb-1">
                    <CardTitle className="truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs font-normal">
                      {project.files?.length || 0} {project.files?.length === 1 ? 'file' : 'files'}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1 mt-1.5">
                    <div className="flex items-center gap-1 bg-accent/50 px-2 py-0.5 rounded-full text-xs">
                      <span className="font-medium">{project.sourceLanguage}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium">{project.targetLanguage}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description || "No description provided."}
                  </p>
                </CardContent>
                <CardFooter className="pt-2 flex items-center justify-between border-t border-border/30">
                  <div className="text-xs text-muted-foreground flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="icon" 
                      variant="ghost"
                      className="h-8 w-8 opacity-70 hover:opacity-100"
                      onClick={() => window.confirm('Delete this project?') && console.log('Delete project:', project.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm"
                      className="gap-1 font-medium"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-3 flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-accent p-6 mb-4">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Create your first translation project to get started. You can upload
                patent documents and translate them with GPT and Translation Memory.
              </p>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="flex items-center"
              >
                <Plus className="mr-1 h-4 w-4" />
                Create Project
              </Button>
            </div>
          )}
        </div>
      </main>
    </MainLayout>
  );
}

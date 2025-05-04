import React, { useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
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
import { FileText, Calendar, Clock, Plus } from "lucide-react";

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
  
  const { data: projects, isLoading } = useQuery({
    queryKey: ['/api/projects'],
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
    <div className="flex flex-col min-h-screen">
      <Header showSidebarTrigger={false} />
      
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
          ) : projects?.length > 0 ? (
            projects.map((project: any) => (
              <Card key={project.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="truncate">{project.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{project.files?.length || 0} files</span>
                    </div>
                    <span className="mx-1">•</span>
                    <div className="flex items-center gap-1">
                      <span>{project.sourceLanguage}</span>
                      <span className="mx-0.5">→</span>
                      <span>{project.targetLanguage}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description || "No description provided."}
                  </p>
                </CardContent>
                <CardFooter className="pt-2 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    Open
                  </Button>
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
    </div>
  );
}

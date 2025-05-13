import React, { useState } from "react";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/utils";
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
  CardTitle,
} from "@/components/ui/card";
import {
  Calendar,
  FileText,
  Plus,
  ArrowRight,
  Trash2,
  ExternalLink,
  Clock,
  Book,
  Database,
  ChevronRight,
  FolderOpen,
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

  type Project = {
    id: number;
    name: string;
    description?: string;
    sourceLanguage: string;
    targetLanguage: string;
    files?: any[];
    createdAt: string;
    updatedAt?: string;
  };
  type GlossaryTerm = {
    id: number;
    source: string;
    target: string;
    sourceLanguage: string;
    targetLanguage: string;
    createdAt: string;
  };
  type TMEntry = {
    id: number;
    source: string;
    target: string;
    sourceLanguage: string;
    targetLanguage: string;
    status: string;
    createdAt: string;
  };

  // Fetch recent projects
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/projects");
      return res.json();
    },
  });

  // Fetch recent TM entries
  const { data: tmEntries, isLoading: tmLoading } = useQuery({
    queryKey: ["/api/tm/all"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tm/all");
      return res.json();
    },
  });

  // Fetch recent glossary terms
  const { data: glossaryTerms, isLoading: glossaryLoading } = useQuery({
    queryKey: ["/api/glossary/all"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/glossary/all");
      return res.json();
    },
  });

  // Helper to get limited entries for display
  const getRecentProjects = () => {
    if (!projects) return [];
    return [...projects]
      .sort((a, b) => {
        const dateA = a.updatedAt
          ? new Date(a.updatedAt)
          : new Date(a.createdAt);
        const dateB = b.updatedAt
          ? new Date(b.updatedAt)
          : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 3);
  };

  const getRecentTMEntries = () => {
    if (!tmEntries) return [];
    return [...tmEntries]
      .sort((a, b) => {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
      .slice(0, 3);
  };

  const getRecentGlossaryTerms = () => {
    if (!glossaryTerms) return [];
    return [...glossaryTerms]
      .sort((a, b) => {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
      .slice(0, 3);
  };

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
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsDialogOpen(false);
      form.reset();
      navigate(`/projects/${data.id}`);
    },
  });

  function onSubmit(data: ProjectFormValues) {
    createProject.mutate(data);
  }

  return (
    <MainLayout title="Dashboard">
      <div className="container max-w-screen-xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to Lexitra
            </h1>
            <p className="text-muted-foreground mt-1">
              Your translation workspace dashboard
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Translation Project</DialogTitle>
                <DialogDescription>
                  Set up a new translation project with source and target
                  languages.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Patent Translation 2023"
                            {...field}
                          />
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
                    <Button type="submit" disabled={createProject.isPending}>
                      {createProject.isPending
                        ? "Creating..."
                        : "Create Project"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects Section */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl">Recent Projects</CardTitle>
                  <CardDescription>
                    Your latest translation projects
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-sm"
                  onClick={() => navigate("/projects")}
                >
                  All Projects
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-accent animate-pulse rounded-md"
                    />
                  ))}
                </div>
              ) : getRecentProjects().length > 0 ? (
                <div className="space-y-2">
                  {getRecentProjects().map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-md border border-border hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-md flex items-center justify-center">
                          <FolderOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-xs flex items-center gap-1 text-muted-foreground">
                            <div className="flex items-center gap-1 bg-accent/50 px-2 py-0.5 rounded-full">
                              <span>{project.sourceLanguage}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>{project.targetLanguage}</span>
                            </div>
                            <span className="px-2 py-0.5">
                              {project.files?.length || 0}{" "}
                              {project.files?.length === 1 ? "file" : "files"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        {formatDate(project.updatedAt || project.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FolderOpen className="h-10 w-10 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium mb-1">No projects yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first translation project
                  </p>
                  <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Create Project
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              {getRecentProjects().length > 0}
            </CardFooter>
          </Card>

          {/* Activity Section */}
          <div className="space-y-6">
            {/* Translation Memory Activity */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center gap-1">
                    <Database className="h-4 w-4" />
                    <span>Translation Memory</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => navigate("/tm")}
                  >
                    View
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tmLoading ? (
                  <div className="space-y-2 py-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-[70px] bg-accent animate-pulse rounded-md"
                      />
                    ))}
                  </div>
                ) : getRecentTMEntries().length > 0 ? (
                  <div className="space-y-2.5 py-1">
                    {getRecentTMEntries().map((entry: TMEntry) => (
                      <div
                        key={entry.id}
                        className="border border-border rounded-md p-2 text-sm hover:border-primary/50 transition-colors"
                      >
                        <div className="flex justify-between mb-1">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="font-medium">
                              {entry.sourceLanguage}
                            </span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="font-medium">
                              {entry.targetLanguage}
                            </span>
                          </div>
                          <div
                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium 
                              ${entry.status === "100%" ? "status-badge-100" : ""}
                              ${entry.status === "Fuzzy" ? "status-badge-fuzzy" : ""}
                              ${entry.status === "MT" ? "status-badge-mt" : ""}
                              ${entry.status === "Reviewed" ? "status-badge-reviewed" : ""}
                            `}
                          >
                            {entry.status}
                          </div>
                        </div>
                        <div className="line-clamp-1 mb-1">{entry.source}</div>
                        <div className="line-clamp-1 text-muted-foreground">
                          {entry.target}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-muted-foreground text-sm">
                    No translation memory entries yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Glossary Activity */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center gap-1">
                    <Book className="h-4 w-4" />
                    <span>Glossary</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => navigate("/glossary")}
                  >
                    View
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {glossaryLoading ? (
                  <div className="space-y-2 py-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-12 bg-accent animate-pulse rounded-md"
                      />
                    ))}
                  </div>
                ) : getRecentGlossaryTerms().length > 0 ? (
                  <div className="space-y-2 py-1">
                    {getRecentGlossaryTerms().map((term: GlossaryTerm) => (
                      <div
                        key={term.id}
                        className="border border-border rounded-md p-2 text-sm hover:border-primary/50 transition-colors"
                      >
                        <div className="flex justify-between mb-1">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="font-medium">
                              {term.sourceLanguage}
                            </span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="font-medium">
                              {term.targetLanguage}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <div className="font-medium">{term.source}</div>
                          <div>{term.target}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-muted-foreground text-sm">
                    No terminology entries yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

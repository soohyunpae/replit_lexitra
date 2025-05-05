import React, { useState, useMemo, useEffect } from "react";
import { useLocation, Link } from "wouter";
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
  Clock,
  Search,
  List,
  LayoutGrid,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  CheckSquare,
  Filter
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
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { CombinedProgress } from "@/components/ui/combined-progress";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

// Define a type for sorting direction
type SortDirection = 'asc' | 'desc' | null;

const projectFormSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
  sourceLanguage: z.string().min(1, "Source language is required"),
  targetLanguage: z.string().min(1, "Target language is required"),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function ProjectsPage() {
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list'); // Default to list view
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // Added status filter
  const { user } = useAuth();

  type Project = {
    id: number;
    name: string;
    description?: string;
    sourceLanguage: string;
    targetLanguage: string;
    status: 'Unclaimed' | 'Claimed' | 'Completed';
    claimedBy?: number;
    claimedAt?: string;
    completedAt?: string;
    files?: any[];
    createdAt: string;
    updatedAt?: string;
    deadline?: string;
    claimer?: {
      id: number;
      username: string;
    };
  };

  // Project statistics state for progress info
  const [projectStats, setProjectStats] = useState<{
    [key: number]: {
      reviewedPercentage: number;
      translatedPercentage: number;
    }
  }>({});

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/projects");
      return res.json();
    },
  });

  // Generate demo statistics for projects
  useEffect(() => {
    if (projects) {
      const stats: typeof projectStats = {};
      projects.forEach(project => {
        // In a real application, these would be fetched from the API
        const translatedPercentage = Math.floor(Math.random() * 100);
        const reviewedPercentage = Math.floor(Math.random() * (translatedPercentage + 1));
        stats[project.id] = {
          translatedPercentage,
          reviewedPercentage,
        };
      });
      setProjectStats(stats);
    }
  }, [projects]);

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null -> asc
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField('');
      } else {
        setSortDirection("asc");
        setSortField(field);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // 프로젝트 상태가 사용자에 따라 다르게 표시되는 함수
  const getDisplayStatus = (project: Project) => {
    // 사용자가 해당 프로젝트를 클레임했는지 확인
    const isClaimedByCurrentUser = user && project.claimedBy === user.id;
    
    if (project.status === 'Claimed') {
      if (isClaimedByCurrentUser) {
        return 'In Progress'; // 내가 클레임한 프로젝트
      } else {
        return 'Claimed';      // 다른 사용자가 클레임한 프로젝트
      }
    }
    // 나머지 상태는 그대로 유지
    return project.status;
  };

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    if (!projects) return [];

    // First apply search filter
    let filtered = projects;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = projects.filter(project =>
        project.name.toLowerCase().includes(lowerQuery) ||
        (project.description && project.description.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => {
        // 사용자에게 보이는 상태가 필터와 일치하는지 확인
        const displayStatus = getDisplayStatus(project);
        return displayStatus === statusFilter;
      });
    }

    // Then sort
    if (sortField && sortDirection) {
      return [...filtered].sort((a, b) => {
        let aValue: any = a[sortField as keyof Project];
        let bValue: any = b[sortField as keyof Project];

        // Handle dates
        if (sortField === 'createdAt' || sortField === 'updatedAt' || sortField === 'deadline') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        // Handle progress - special case
        if (sortField === 'progress') {
          aValue = projectStats[a.id]?.translatedPercentage || 0;
          bValue = projectStats[b.id]?.translatedPercentage || 0;
        }

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    return filtered;
  }, [projects, searchQuery, sortField, sortDirection, projectStats, statusFilter]);

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

  // 프로젝트 클레임 mutation
  const claimProject = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/claim`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
  
  // 프로젝트 클레임 해제 mutation
  const releaseProject = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/release`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
  
  // 프로젝트 완료 mutation
  const completeProject = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/complete`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
  
  // 프로젝트 재오픈 mutation
  const reopenProject = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/reopen`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
  
  // 프로젝트 삭제 mutation
  const deleteProject = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest("DELETE", `/api/projects/${projectId}`);
      return response.status === 204 ? {} : response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  function onSubmit(data: ProjectFormValues) {
    createProject.mutate(data);
  }

  // Function to render the sort button for column headers
  const renderSortButton = (field: string, label: string) => {
    const isActive = sortField === field;
    const direction = isActive ? sortDirection : null;

    return (
      <Button
        variant="ghost"
        className="font-medium px-2 hover:bg-transparent"
        onClick={() => handleSort(field)}
      >
        {label}
        <span className="ml-1">
          {direction === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : direction === 'desc' ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-50" />
          )}
        </span>
      </Button>
    );
  };

  // Function to render the empty state
  const renderEmptyState = () => (
    <div className="col-span-full flex flex-col items-center justify-center py-12">
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
  );

  return (
    <MainLayout title="Projects">
      <main className="flex-1 container max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage your translation projects</p>
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

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row justify-between items-center mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">View:</span>
              <div className="border rounded-md overflow-hidden flex">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none px-3 h-8"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none px-3 h-8"
                  onClick={() => setViewMode('card')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="Unclaimed">Unclaimed</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Claimed">Claimed</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          viewMode === 'card' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(3).fill(0).map((_, i) => (
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
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="p-4 animate-pulse space-y-4">
                <div className="h-5 bg-accent rounded w-1/3"></div>
                <div className="h-4 bg-accent rounded w-full"></div>
                <div className="h-4 bg-accent rounded w-3/4"></div>
              </div>
            </div>
          )
        )}

        {/* Empty State */}
        {!isLoading && filteredAndSortedProjects.length === 0 && renderEmptyState()}

        {/* Card View */}
        {!isLoading && filteredAndSortedProjects.length > 0 && viewMode === 'card' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedProjects.map((project) => {
              // 사용자에게 보여질 상태 가져오기
              const displayStatus = getDisplayStatus(project);
              
              // Status badge color and text
              let statusBadgeVariant: "default" | "outline" | "secondary" | "destructive" | null = "default";
              let statusColor = "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
              
              switch (displayStatus) {
                case "Unclaimed":
                  statusBadgeVariant = "outline";
                  statusColor = "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300";
                  break;
                case "In Progress":
                  statusBadgeVariant = "secondary";
                  statusColor = "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
                  break;
                case "Claimed":
                  statusBadgeVariant = "secondary";
                  statusColor = "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400";
                  break;
                case "Completed":
                  statusBadgeVariant = "default";
                  statusColor = "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
                  break;
              }

              // Determine if current user can claim this project
              const canClaim = user && project.status === "Unclaimed";
              const isClaimedByUser = user && project.status === "Claimed" && project.claimedBy === user.id;

              return (
                <Card
                  key={project.id}
                  className="overflow-hidden group hover:shadow-md transition-all duration-200 border-border hover:border-primary/30 relative"
                >
                  <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary/70"></div>
                  <div className="absolute top-2 right-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor}`}>
                      {displayStatus}
                    </span>
                  </div>
                  <Link to={`/projects/${project.id}`} className="cursor-pointer">
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1.5 line-clamp-2">
                        <div className="flex items-center gap-1 bg-accent/50 px-2 py-0.5 rounded-full text-xs">
                          <span className="font-medium">{project.sourceLanguage}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium">{project.targetLanguage}</span>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div>
                        <CombinedProgress
                          reviewedPercentage={projectStats[project.id]?.reviewedPercentage || 0}
                          translatedPercentage={projectStats[project.id]?.translatedPercentage || 0}
                          height="h-2"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center justify-between mt-2">
                        <span>Translated: {projectStats[project.id]?.translatedPercentage || 0}%</span>
                        <span>Reviewed: {projectStats[project.id]?.reviewedPercentage || 0}%</span>
                      </div>
                    </CardContent>
                  </Link>
                  <CardFooter className="pt-2 flex items-center justify-between border-t border-border/30">
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {project.deadline ? new Date(project.deadline).toLocaleString() : 'No deadline set'}
                    </div>
                    <div className="flex gap-2">
                      {/* 프로젝트 상세 페이지 뷰 버튼만 제공 */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${project.id}`);
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* List View */}
        {!isLoading && filteredAndSortedProjects.length > 0 && viewMode === 'list' && (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">{renderSortButton('id', 'Project ID')}</TableHead>
                  <TableHead className="w-[220px]">{renderSortButton('name', 'Project Name')}</TableHead>
                  <TableHead className="w-[120px]">Language Pair</TableHead>
                  <TableHead className="w-[120px]">{renderSortButton('status', 'Status')}</TableHead>
                  <TableHead className="w-[220px]">{renderSortButton('progress', 'Progress')}</TableHead>
                  <TableHead className="w-[120px]">{renderSortButton('createdAt', 'Created')}</TableHead>
                  <TableHead className="w-[120px]">{renderSortButton('updatedAt', 'Last Updated')}</TableHead>
                  <TableHead className="w-[120px]">{renderSortButton('deadline', 'Deadline')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedProjects.map((project) => {
                  const stats = projectStats[project.id] || { translatedPercentage: 0, reviewedPercentage: 0 };

                  // 사용자에게 보여질 상태 가져오기
                  const displayStatus = getDisplayStatus(project);
                  
                  // Status badge color and text
                  let statusBadgeVariant: "default" | "outline" | "secondary" | "destructive" | null = "default";
                  let statusColor = "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
                  
                  switch (displayStatus) {
                    case "Unclaimed":
                      statusBadgeVariant = "outline";
                      statusColor = "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300";
                      break;
                    case "In Progress":
                      statusBadgeVariant = "secondary";
                      statusColor = "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
                      break;
                    case "Claimed":
                      statusBadgeVariant = "secondary";
                      statusColor = "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400";
                      break;
                    case "Completed":
                      statusBadgeVariant = "default";
                      statusColor = "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
                      break;
                  }

                  // Determine if current user can claim this project
                  const canClaim = user && project.status === "Unclaimed";
                  const isClaimedByUser = user && project.status === "Claimed" && project.claimedBy === user.id;

                  return (
                    <TableRow
                      key={project.id}
                      className="group hover:bg-muted/40 cursor-pointer"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <TableCell className="font-medium">{project.id}</TableCell>
                      <TableCell className="font-medium text-primary hover:underline">{project.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 bg-accent/50 px-2 py-0.5 rounded-full text-xs w-fit">
                          <span className="font-medium">{project.sourceLanguage}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium">{project.targetLanguage}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor}`}>
                          {getDisplayStatus(project)}
                        </span>
                      </TableCell>
                      <TableCell onClick={() => navigate(`/projects/${project.id}`)}>
                        <div className="flex flex-col gap-1.5">
                          <CombinedProgress
                            reviewedPercentage={stats.reviewedPercentage}
                            translatedPercentage={stats.translatedPercentage}
                            height="h-2.5"
                          />
                          <div className="text-xs text-muted-foreground flex items-center justify-between">
                            <span>Translated: {stats.translatedPercentage}%</span>
                            <span>Reviewed: {stats.reviewedPercentage}%</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => navigate(`/projects/${project.id}`)}>
                        <span className="text-sm">{new Date(project.createdAt).toLocaleString()}</span>
                      </TableCell>
                      <TableCell onClick={() => navigate(`/projects/${project.id}`)}>
                        <span className="text-sm">{project.updatedAt ? new Date(project.updatedAt).toLocaleString() : '-'}</span>
                      </TableCell>
                      <TableCell onClick={() => navigate(`/projects/${project.id}`)}>
                        <span className="text-sm">{project.deadline ? new Date(project.deadline).toLocaleString() : 'Not set'}</span>
                      </TableCell>

                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </MainLayout>
  );
}
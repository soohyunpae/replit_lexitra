import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  Archive,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CheckCircle,
  CheckSquare,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  FolderClosed,
  LayoutGrid,
  List,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  TextCursorInput,
  Trash2,
  Unlock,
  Upload,
  X,
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
  FormDescription,
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
import { useToast } from "@/hooks/use-toast";
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
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate, formatFileSize } from "@/lib/utils";

// Hook to fetch live project stats (wordCount, etc) for a project
const useProjectStats = (projectId: number) =>
  useQuery({
    queryKey: ["/api/projects", projectId, "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load project stats");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });

// Define a type for sorting direction
type SortDirection = "asc" | "desc" | null;

const projectFormSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
  sourceLanguage: z.string().min(1, "Source language is required"),
  targetLanguage: z.string().min(1, "Target language is required"),
  files: z
    .instanceof(FileList)
    .or(z.array(z.instanceof(File)))
    .optional(), // 파일은 필수가 아님
  references: z
    .instanceof(FileList)
    .or(z.array(z.instanceof(File)))
    .optional(),
  notes: z.string().optional(),
  deadline: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function ProjectsPage() {
  const [location, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("list"); // Default to list view
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // Added status filter
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  // 프로젝트의 단어 수 계산 - project.tsx의 계산 방식과 동일
  const calculateProjectWordCount = (project: any): number => {
    if (!project.files || project.files.length === 0) return 0;

    return project.files
      .filter((file: any) => file.type === "work" || !file.type)
      .reduce((total: number, file: any) => {
        const words = (file.segments || []).flatMap(
          (segment: any) =>
            segment.source
              ?.split(/\s+/)
              .filter((word: string) => word.length > 0) || [],
        );
        return total + words.length;
      }, 0);
  };

  type Project = {
    id: number;
    name: string;
    description?: string;
    sourceLanguage: string;
    targetLanguage: string;
    status: "Unclaimed" | "Claimed" | "Completed";
    claimedBy?: number;
    claimedAt?: string;
    completedAt?: string;
    files?: any[];
    createdAt: string;
    updatedAt?: string;
    deadline?: string;
    wordCount?: number;
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
      totalSegments: number;
      wordCount: number;
      statusCounts: {
        Reviewed: number;
        "100%": number;
        Fuzzy: number;
        MT: number;
        Edited: number;
        Rejected: number;
      };
    };
  }>({});

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/projects");
      return res.json();
    },
  });

  // 프로젝트 통계 데이터 가져오기
  useEffect(() => {
    if (projects) {
      const fetchProjectStats = async () => {
        const stats: typeof projectStats = {};

        // 각 프로젝트의 통계 데이터를 병렬로 가져오기
        const maxRetries = 2; // 최대 재시도 횟수

        // 실제 서버 데이터 가져오는 함수
        const fetchStatsFromServer = async (
          project: Project,
          retryCount = 0,
        ): Promise<boolean> => {
          const defaultStats = {
            translatedPercentage: 0,
            reviewedPercentage: 0,
            totalSegments: 0,
            wordCount: 0,
            statusCounts: {
              Reviewed: 0,
              "100%": 0,
              Fuzzy: 0,
              MT: 0,
              Edited: 0,
              Rejected: 0,
            },
          };
          try {
            // Minimal placeholder, defer population until API response
            let dummyStats = { ...defaultStats };

            // 올바른 인증 토큰 가져오기 (auth_token 사용)
            const authToken = localStorage.getItem("auth_token");

            // 서버에 실제 API 요청
            const response = await fetch(`/api/projects/${project.id}/stats`, {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            });

            if (response.ok) {
              // 서버 응답 성공시 실제 데이터 사용하고 비율 계산
              const data = await response.json();

              const totalSegs = data.totalSegments || 0;
              const reviewedCount = data.statusCounts?.["Reviewed"] || 0;
              const reviewedPercentage =
                totalSegs > 0 ? (reviewedCount / totalSegs) * 100 : 0;

              stats[project.id] = {
                translatedPercentage:
                  totalSegs > 0
                    ? ((data.statusCounts?.["100%"] || 0) / totalSegs) * 100
                    : 0,
                reviewedPercentage,
                totalSegments: totalSegs,
                wordCount: data.wordCount || 0,
                statusCounts: data.statusCounts || defaultStats.statusCounts,
              };
              return true; // 성공
            } else if (response.status === 404 && retryCount < maxRetries) {
              // 서버 엔드포인트가 아직 로드되지 않았거io 존재하지 않을 수 있으므로   시도
              await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 대기
              return fetchStatsFromServer(project, retryCount + 1); // 재귀적으로 재시도
            } else {
              // API 호출 실패 시 최소 placeholder만 사용
              stats[project.id] = dummyStats;
              return true;
            }
          } catch (error) {
            // 에러 케이스에서도 최소 placeholder만 사용
            stats[project.id] = { ...defaultStats };
            return false;
          }
        };

        const promises = projects.map(async (project) => {
          return fetchStatsFromServer(project, 0);
        });

        // 모든 요청이 완료될 때까지 기다림
        await Promise.all(promises);

        // 상태 업데이트
        setProjectStats(stats);
      };

      fetchProjectStats();
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
        setSortField("");
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

    if (project.status === "Claimed") {
      if (isClaimedByCurrentUser) {
        return "In Progress"; // 내가 클레임한 프로젝트
      } else {
        return "Claimed"; // 다른 사용자가 클레임한 프로젝트
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
      filtered = projects.filter(
        (project) =>
          project.name.toLowerCase().includes(lowerQuery) ||
          (project.description &&
            project.description.toLowerCase().includes(lowerQuery)),
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((project) => {
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
        if (
          sortField === "createdAt" ||
          sortField === "updatedAt" ||
          sortField === "deadline"
        ) {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        // Handle progress - special case
        if (sortField === "progress") {
          aValue = projectStats[a.id]?.translatedPercentage || 0;
          bValue = projectStats[b.id]?.translatedPercentage || 0;
        }

        if (sortDirection === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    return filtered;
  }, [
    projects,
    searchQuery,
    sortField,
    sortDirection,
    projectStats,
    statusFilter,
  ]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      sourceLanguage: "KO",
      targetLanguage: "EN",
      files: [] as File[],
      references: [] as File[],
      notes: "",
      deadline: "",
    },
  });

  const createProject = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      // 폼 데이터를 FormData로 변환하여 파일 업로드 처리
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("sourceLanguage", data.sourceLanguage);
      formData.append("targetLanguage", data.targetLanguage);

      if (data.description) {
        formData.append("description", data.description);
      }

      if (data.notes) {
        formData.append("notes", data.notes);
      }

      if (data.deadline) {
        formData.append("deadline", data.deadline);
      }

      // 파일 추가
      if (data.files && data.files.length > 0) {
        // FileList를 배열로 변환
        const filesArray =
          data.files instanceof FileList ? Array.from(data.files) : data.files;

        filesArray.forEach((file: File) => {
          formData.append(`files`, file);
        });
      }

      // 참조 파일 추가
      if (data.references && data.references.length > 0) {
        // FileList를 배열로 변환
        const referencesArray =
          data.references instanceof FileList
            ? Array.from(data.references)
            : data.references;

        referencesArray.forEach((file: File) => {
          formData.append(`references`, file);
        });
      }

      const response = await apiRequest("POST", "/api/projects", formData, {
        headers: {
          // FormData를 사용할 때는 Content-Type 헤더를 설정하지 않음 (브라우저가 자동으로 설정)
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Project created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsDialogOpen(false);
      form.reset();

      // 응답에 유효한 ID가 있는지 확인 후 이동
      if (data && data.id) {
        // 진행 중이던 업로드 작업이 완료되도록 짧은 지연 추가
        setTimeout(() => {
          navigate(`/projects/${data.id}`);
        }, 500);
      } else {
        console.error("Project created but no ID returned:", data);
        toast({
          title: "프로젝트 생성됨",
          description:
            "프로젝트가 생성되었지만 상세 페이지로 이동할 수 없습니다.",
        });
      }
    },
  });

  // 프로젝트 클레임 mutation
  const claimProject = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/claim`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  // 프로젝트 클레임 해제 mutation
  const releaseProject = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/release`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  // 프로젝트 완료 mutation
  const completeProject = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/complete`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  // 프로젝트 재오픈 mutation
  const reopenProject = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/reopen`,
      );
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
      setSelectedProjects([]);
    },
  });

  // 프로젝트 아카이브 mutation (여기서는 삭제와 동일하게 구현)
  const archiveProject = useMutation({
    mutationFn: async (projectId: number) => {
      // 실제 아카이브 엔드포인트 구현 필요 (현재는 삭제와 동일하게 처리)
      const response = await apiRequest("DELETE", `/api/projects/${projectId}`);
      return response.status === 204 ? {} : response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setSelectedProjects([]);
    },
  });

  // 선택된 프로젝트 일괄 삭제
  const bulkDeleteProjects = async () => {
    if (selectedProjects.length === 0) return;

    // 확인 대화상자
    if (
      !window.confirm(
        t("projects.bulkConfirmDelete", { count: selectedProjects.length }),
      )
    ) {
      return;
    }

    try {
      for (const projectId of selectedProjects) {
        await deleteProject.mutateAsync(projectId);
      }
      toast({
        title: "Success",
        description: `${selectedProjects.length} project(s) deleted successfully.`,
      });
      setSelectedProjects([]);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete projects: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  // 선택된 프로젝트 일괄 클레임
  const bulkClaimProjects = async () => {
    if (selectedProjects.length === 0) return;

    // 확인 대화상자
    if (
      !window.confirm(
        t("projects.bulkConfirmClaim", { count: selectedProjects.length }),
      )
    ) {
      return;
    }

    try {
      for (const projectId of selectedProjects) {
        await claimProject.mutateAsync(projectId);
      }
      toast({
        title: "Success",
        description: `${selectedProjects.length} project(s) claimed successfully.`,
      });
      setSelectedProjects([]);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to claim projects: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  // 선택된 프로젝트 일괄 완료 처리
  const bulkCompleteProjects = async () => {
    if (selectedProjects.length === 0) return;

    // 확인 대화상자
    if (
      !window.confirm(
        t("projects.confirmComplete", { count: selectedProjects.length }),
      )
    ) {
      return;
    }

    try {
      for (const projectId of selectedProjects) {
        await completeProject.mutateAsync(projectId);
      }
      toast({
        title: t("common.success"),
        description: t("projects.bulkCompleteSuccess", {
          count: selectedProjects.length,
        }),
      });
      setSelectedProjects([]);
    } catch (error) {
      toast({
        title: t("common.error"),
        description: `${t("projects.bulkCompleteError")}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  // 선택된 프로젝트 일괄 아카이브
  const bulkArchiveProjects = async () => {
    if (selectedProjects.length === 0) return;

    // 확인 대화상자
    if (
      !window.confirm(
        t("projects.bulkConfirmArchive", { count: selectedProjects.length }),
      )
    ) {
      return;
    }

    try {
      for (const projectId of selectedProjects) {
        await archiveProject.mutateAsync(projectId);
      }
      toast({
        title: "Success",
        description: `${selectedProjects.length} project(s) archived successfully.`,
      });
      setSelectedProjects([]);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to archive projects: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  // 선택된 프로젝트 일괄 해제(Release)
  const bulkReleaseProjects = async () => {
    if (selectedProjects.length === 0) return;

    // 확인 대화상자
    if (
      !window.confirm(
        t("projects.bulkConfirmRelease", { count: selectedProjects.length }),
      )
    ) {
      return;
    }

    try {
      for (const projectId of selectedProjects) {
        await releaseProject.mutateAsync(projectId);
      }
      toast({
        title: "Success",
        description: `${selectedProjects.length} project(s) released successfully.`,
      });
      setSelectedProjects([]);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to release projects: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  // 선택된 프로젝트 일괄 재오픈(Reopen)
  const bulkReopenProjects = async () => {
    if (selectedProjects.length === 0) return;

    // 확인 대화상자
    if (
      !window.confirm(
        t("projects.bulkConfirmReopen", { count: selectedProjects.length }),
      )
    ) {
      return;
    }

    try {
      for (const projectId of selectedProjects) {
        await reopenProject.mutateAsync(projectId);
      }
      toast({
        title: "Success",
        description: `${selectedProjects.length} project(s) reopened successfully.`,
      });
      setSelectedProjects([]);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to reopen projects: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

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
          {direction === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : direction === "desc" ? (
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
      <h3 className="text-xl font-medium mb-2">
        {t("projects.noProjectsYet")}
      </h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        {t("projects.noProjectsDescription")}
      </p>
      <Button
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center"
      >
        <Plus className="mr-1 h-4 w-4" />
        {t("projects.createProject")}
      </Button>
    </div>
  );

  return (
    <MainLayout title="Projects">
      <div className="container max-w-screen-xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 mb-2">
            <FolderClosed className="h-5 w-5" />
            <h2 className="text-3xl font-bold tracking-tight">
              {t("projects.title")}
            </h2>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" />
                {t("projects.createProject")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("projects.createProject")}</DialogTitle>
                <DialogDescription>
                  {t("projects.newProjectDescription")}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("projects.projectName")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("projects.projectName")}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="sourceLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("projects.sourceLanguage")}
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("projects.sourceLanguage")}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="KO">Korean (KO)</SelectItem>
                                <SelectItem value="JA">
                                  Japanese (JA)
                                </SelectItem>
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
                            <FormLabel>
                              {t("projects.targetLanguage")}
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("projects.targetLanguage")}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="EN">English (EN)</SelectItem>
                                <SelectItem value="KO">Korean (KO)</SelectItem>
                                <SelectItem value="JA">
                                  Japanese (JA)
                                </SelectItem>
                                <SelectItem value="ZH">Chinese (ZH)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Deadline Field */}
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("projects.deadline")} ({t("common.optional")})
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          {t("projects.deadlineDescription")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* File Upload Section */}
                  <FormField
                    control={form.control}
                    name="files"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="block">
                          {t("projects.uploadFiles")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormDescription>
                          {t("projects.fileUploadDescription")}
                        </FormDescription>

                        <FormControl>
                          <div
                            className="border border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/60 transition-colors"
                            onClick={() =>
                              document.getElementById("file-upload")?.click()
                            }
                          >
                            <div className="text-center py-4">
                              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm font-medium mb-1">
                                {t("projects.dropFilesHere")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("projects.dropFilesDescription")}
                              </p>
                            </div>
                            <input
                              id="file-upload"
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                // 널 체크 후 파일 배열로 변환
                                if (
                                  e.target.files &&
                                  e.target.files.length > 0
                                ) {
                                  const files = Array.from(e.target.files);
                                  field.onChange(files);
                                }
                              }}
                            />
                          </div>
                        </FormControl>

                        {/* Display selected files */}
                        {field.value && field.value.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <p className="text-sm font-medium">
                              Selected Files:
                            </p>
                            <div className="space-y-1.5">
                              {field.value &&
                                Array.from(field.value as File[]).map(
                                  (file: File, index: number) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between py-2 px-3 border border-border rounded-md"
                                    >
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                          {file.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                          {formatFileSize(file.size)}
                                        </span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newFiles = Array.from(
                                            field.value as File[],
                                          ).filter((_, i) => i !== index);
                                          field.onChange(newFiles);
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ),
                                )}
                            </div>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* References Section */}
                  <FormField
                    control={form.control}
                    name="references"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="block">
                          {t("projects.referenceFiles")} ({t("common.optional")}
                          )
                        </FormLabel>
                        <FormDescription>
                          {t("projects.referenceFilesDescription")}
                        </FormDescription>

                        <FormControl>
                          <div
                            className="border border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/60 transition-colors"
                            onClick={() =>
                              document
                                .getElementById("reference-upload")
                                ?.click()
                            }
                          >
                            <div className="text-center py-4">
                              <Paperclip className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm font-medium mb-1">
                                Click to upload reference files
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("projects.uploadReferenceDesc")}
                              </p>
                            </div>
                            <input
                              id="reference-upload"
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                // 널 체크 후 파일 배열로 변환
                                if (
                                  e.target.files &&
                                  e.target.files.length > 0
                                ) {
                                  const files = Array.from(e.target.files);
                                  // 현재 값이 있는지 확인하고 적절히 배열로 변환
                                  const currentFiles = field.value
                                    ? Array.isArray(field.value)
                                      ? field.value
                                      : field.value instanceof FileList
                                        ? Array.from(field.value)
                                        : []
                                    : [];
                                  // 배열 합치기
                                  field.onChange([...currentFiles, ...files]);
                                }
                              }}
                            />
                          </div>
                        </FormControl>

                        {/* Display selected reference files */}
                        {field.value && field.value.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <p className="text-sm font-medium">
                              Selected References:
                            </p>
                            <div className="space-y-1.5">
                              {field.value &&
                                Array.from(field.value as File[]).map(
                                  (file: File, index: number) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between py-2 px-3 border border-border rounded-md"
                                    >
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                          {file.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                          {formatFileSize(file.size)}
                                        </span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newFiles = Array.from(
                                            field.value as File[],
                                          ).filter((_, i) => i !== index);
                                          field.onChange(newFiles);
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ),
                                )}
                            </div>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes Section */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("projects.projectNotes")} ({t("common.optional")}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("projects.notesPlaceholder")}
                            className="resize-none min-h-24"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 파일 업로드 진행 상태 표시 */}
                  {createProject.isPending && (
                    <div className="bg-accent/20 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        <p className="text-sm font-medium">
                          {t("projects.uploadingFiles")}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {t("projects.uploadingFilesDesc")}
                      </p>
                    </div>
                  )}

                  <DialogFooter>
                    <Button type="submit" disabled={createProject.isPending}>
                      {createProject.isPending
                        ? t("common.creating")
                        : t("common.create")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* 파일 업로드 진행 상황 표시 제거 */}

        {/* Admin Selection Info */}
        {isAdmin && selectedProjects.length > 0 && (
          <div className="mb-4 p-3 border rounded-md bg-muted/30 flex items-center justify-between">
            <div className="flex items-center">
              <span className="font-medium mr-2">
                {t("projects.selectedCount", {
                  count: selectedProjects.length,
                })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProjects([])}
                className="text-muted-foreground h-7 px-2"
              >
                <X className="h-4 w-4 mr-1" />
                {t("common.clear")}
              </Button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row justify-between items-center mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("projects.searchProjects")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="border rounded-md overflow-hidden flex">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none px-3 h-8"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none px-3 h-8"
                  onClick={() => setViewMode("card")}
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
                <SelectItem value="all">{t("projects.allProjects")}</SelectItem>
                <SelectItem value="Unclaimed">
                  {t("projects.statusUnclaimed")}
                </SelectItem>
                <SelectItem value="In Progress">
                  {t("projects.statusInProgress")}
                </SelectItem>
                <SelectItem value="Claimed">
                  {t("projects.statusClaimed")}
                </SelectItem>
                <SelectItem value="Completed">
                  {t("projects.statusCompleted")}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Admin Bulk Actions Dropdown */}
            {isAdmin && selectedProjects.length > 0 && (
              <Select
                onValueChange={(action) => {
                  switch (action) {
                    case "claim":
                      bulkClaimProjects();
                      break;
                    case "release":
                      bulkReleaseProjects();
                      break;
                    case "complete":
                      bulkCompleteProjects();
                      break;
                    case "reopen":
                      bulkReopenProjects();
                      break;
                    case "archive":
                      bulkArchiveProjects();
                      break;
                    case "delete":
                      bulkDeleteProjects();
                      break;
                  }
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("projects.bulkActions")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claim">
                    <div className="flex items-center">
                      <CheckSquare className="h-4 w-4 mr-2" />
                      <span>{t("projects.claimProjects")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="release">
                    <div className="flex items-center">
                      <Unlock className="h-4 w-4 mr-2" />
                      <span>{t("projects.releaseProjects")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="complete">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span>{t("projects.completeProjects")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="reopen">
                    <div className="flex items-center">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      <span>{t("projects.reopenProjects")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="archive">
                    <div className="flex items-center">
                      <Archive className="h-4 w-4 mr-2" />
                      <span>{t("projects.archiveProjects")}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="delete" className="text-destructive">
                    <div className="flex items-center">
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span>{t("projects.deleteProjects")}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading &&
          (viewMode === "card" ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(3)
                .fill(0)
                .map((_, i) => (
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
          ))}

        {/* Empty State */}
        {!isLoading &&
          filteredAndSortedProjects.length === 0 &&
          renderEmptyState()}

        {/* Card View */}
        {!isLoading &&
          filteredAndSortedProjects.length > 0 &&
          viewMode === "card" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedProjects.map((project) => {
                // 사용자에게 보여질 상태 가져오기
                const displayStatus = getDisplayStatus(project);
                // 이미 캐시된 프로젝트 통계 사용
                const stats = projectStats[project.id];

                // Status badge color and text
                let statusBadgeVariant:
                  | "default"
                  | "outline"
                  | "secondary"
                  | "destructive"
                  | null = "default";
                let statusColor =
                  "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";

                switch (displayStatus) {
                  case "Unclaimed":
                    statusBadgeVariant = "outline";
                    statusColor =
                      "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300";
                    break;
                  case "In Progress":
                    statusBadgeVariant = "secondary";
                    statusColor =
                      "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
                    break;
                  case "Claimed":
                    statusBadgeVariant = "secondary";
                    statusColor =
                      "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400";
                    break;
                  case "Completed":
                    statusBadgeVariant = "default";
                    statusColor =
                      "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
                    break;
                }

                // Determine if current user can claim this project
                const canClaim = user && project.status === "Unclaimed";
                const isClaimedByUser =
                  user &&
                  project.status === "Claimed" &&
                  project.claimedBy === user.id;

                return (
                  <Card
                    key={project.id}
                    className="overflow-hidden group hover:shadow-md transition-all duration-200 border-border hover:border-primary/30 relative"
                  >
                    <div className="absolute top-2 right-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor}`}
                      >
                        {displayStatus}
                      </span>
                    </div>
                    <div
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="cursor-pointer"
                    >
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="truncate group-hover:text-primary transition-colors text-base">
                          {project.id}: {project.name}
                        </CardTitle>
                        {/* File processing indicators */}
                        {project.files &&
                          project.files.some(
                            (file) => file.processingStatus === "processing",
                          ) && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-blue-600 dark:text-blue-400">
                              <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></div>
                              <span>{t("projects.filesProcessing")}</span>
                            </div>
                          )}
                        {project.files &&
                          project.files.some(
                            (file) => file.processingStatus === "error",
                          ) && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-red-600 dark:text-red-400">
                              <AlertCircle className="h-3 w-3" />
                              <span>{t("projects.filesProcessingErrors")}</span>
                            </div>
                          )}
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div>
                          {(() => {
                            // 현재 프로젝트의 통계 데이터 (안전하게 기본값 처리)
                            const stats = projectStats[project.id] || {
                              translatedPercentage: 0,
                              reviewedPercentage: 0,
                              totalSegments: 0,
                              wordCount: project.wordCount || 0,
                              statusCounts: {
                                Reviewed: 0,
                                "100%": 0,
                                Fuzzy: 0,
                                MT: 0,
                                Edited: 0,
                                Rejected: 0,
                              },
                            };

                            // reviewedPercentage 계산
                            const reviewedCount =
                              stats.statusCounts?.Reviewed || 0;
                            const totalSegs = stats.totalSegments || 1; // 0으로 나누기 방지
                            const reviewedPercentage = Math.round(
                              (reviewedCount / totalSegs) * 100,
                            );

                            return (
                              <>
                                <div className="flex justify-between items-center mb-1">
                                  <div className="text-muted-foreground text-xs">
                                    {t("projects.wordCount")}:
                                  </div>
                                  <div className="text-xs font-medium">
                                    {stats.wordCount || project.wordCount || 0}{" "}
                                  </div>
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                  <div className="text-muted-foreground text-xs">
                                    {t("projects.numberOfFiles")}:
                                  </div>
                                  <div className="text-xs font-medium">
                                    {project.files?.length || 0}
                                  </div>
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                  <div className="text-muted-foreground text-xs">
                                    {t("projects.reviewedRate")}:
                                  </div>
                                  <div className="text-xs font-medium">
                                    {stats.statusCounts.Reviewed} /{" "}
                                    {stats.totalSegments}{" "}
                                    <span className="ml-1 text-primary">
                                      ({Math.round(stats.reviewedPercentage)}%)
                                    </span>
                                  </div>
                                </div>

                                <CombinedProgress
                                  translatedPercentage={
                                    stats.translatedPercentage
                                  }
                                  reviewedPercentage={stats.reviewedPercentage}
                                  statusCounts={stats.statusCounts}
                                  totalSegments={stats.totalSegments}
                                  height="h-2"
                                  showPercentage={false}
                                />
                              </>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </div>
                    <CardFooter className="pt-2 flex items-center justify-between border-t border-border/30">
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        {project.deadline
                          ? new Date(project.deadline).toLocaleDateString(
                              "en-US",
                            )
                          : t("projects.noDueDate")}
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
                          {t("common.view")}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

        {/* List View */}
        {!isLoading &&
          filteredAndSortedProjects.length > 0 &&
          viewMode === "list" && (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            selectedProjects.length ===
                              filteredAndSortedProjects.length &&
                            filteredAndSortedProjects.length > 0
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProjects(
                                filteredAndSortedProjects.map((p) => p.id),
                              );
                            } else {
                              setSelectedProjects([]);
                            }
                          }}
                        />
                      </TableHead>
                    )}
                    <TableHead className="w-[80px]">
                      {renderSortButton("id", t("projects.projectId"))}
                    </TableHead>
                    <TableHead className="w-[220px]">
                      {renderSortButton("name", t("projects.projectName"))}
                    </TableHead>
                    <TableHead className="w-[120px]">
                      {t("languages.languagePair")}
                    </TableHead>
                    <TableHead className="w-[80px]">
                      {t("projects.numberOfFiles")}
                    </TableHead>
                    <TableHead className="w-[100px]">
                      {t("projects.wordCount")}
                    </TableHead>
                    <TableHead className="w-[120px]">
                      {renderSortButton("status", t("projects.status"))}
                    </TableHead>
                    <TableHead className="w-[220px]">
                      {renderSortButton("progress", t("projects.progress"))}
                    </TableHead>
                    <TableHead className="w-[120px]">
                      {renderSortButton("createdAt", t("projects.created"))}
                    </TableHead>
                    <TableHead className="w-[120px]">
                      {renderSortButton("updatedAt", t("projects.lastUpdated"))}
                    </TableHead>
                    <TableHead className="w-[120px]">
                      {renderSortButton("deadline", t("projects.deadline"))}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedProjects.map((project) => {
                    const stats = projectStats[project.id] || {
                      translatedPercentage: 0,
                      reviewedPercentage: 0,
                    };
                    // Use cached stats instead of live query per row
                    const liveStats = projectStats[project.id] || {
                      wordCount: 0,
                    };

                    // 사용자에게 보여질 상태 가져오기
                    const displayStatus = getDisplayStatus(project);

                    // Status badge color and text
                    let statusBadgeVariant:
                      | "default"
                      | "outline"
                      | "secondary"
                      | "destructive"
                      | null = "default";
                    let statusColor =
                      "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";

                    switch (displayStatus) {
                      case "Unclaimed":
                        statusBadgeVariant = "outline";
                        statusColor =
                          "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300";
                        break;
                      case "In Progress":
                        statusBadgeVariant = "secondary";
                        statusColor =
                          "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
                        break;
                      case "Claimed":
                        statusBadgeVariant = "secondary";
                        statusColor =
                          "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400";
                        break;
                      case "Completed":
                        statusBadgeVariant = "default";
                        statusColor =
                          "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
                        break;
                    }

                    // Determine if current user can claim this project
                    const canClaim = user && project.status === "Unclaimed";
                    const isClaimedByUser =
                      user &&
                      project.status === "Claimed" &&
                      project.claimedBy === user.id;

                    return (
                      <TableRow key={project.id}>
                        {isAdmin && (
                          <TableCell>
                            <Checkbox
                              checked={selectedProjects.includes(project.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProjects([
                                    ...selectedProjects,
                                    project.id,
                                  ]);
                                } else {
                                  setSelectedProjects(
                                    selectedProjects.filter(
                                      (id) => id !== project.id,
                                    ),
                                  );
                                }
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell>{project.id}</TableCell>
                        <TableCell>
                          <div>
                            <Link
                              to={`/projects/${project.id}`}
                              className="hover:text-primary transition-colors font-medium truncate max-w-[180px] block"
                            >
                              {project.name}
                            </Link>
                            {/* File processing indicators */}
                            {project.files &&
                              project.files.some(
                                (file) =>
                                  file.processingStatus === "processing",
                              ) && (
                                <div className="flex items-center gap-2 mt-1 text-xs text-blue-600 dark:text-blue-400">
                                  <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></div>
                                  <span>{t("projects.filesProcessing")}</span>
                                </div>
                              )}
                            {project.files &&
                              project.files.some(
                                (file) => file.processingStatus === "error",
                              ) && (
                                <div className="flex items-center gap-2 mt-1 text-xs text-red-600 dark:text-red-400">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>
                                    {t("projects.filesProcessingErrors")}
                                  </span>
                                </div>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 bg-accent/50 px-2 py-0.5 rounded-full text-xs">
                            <span className="font-medium">
                              {project.sourceLanguage}
                            </span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="font-medium">
                              {project.targetLanguage}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{project.files?.length || 0}</TableCell>
                        <TableCell>{liveStats.wordCount || 0}</TableCell>
                        <TableCell>
                          <div
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
                          >
                            {t(`projects.status${displayStatus}`)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <CombinedProgress
                            translatedPercentage={
                              stats?.translatedPercentage || 0
                            }
                            reviewedPercentage={stats?.reviewedPercentage || 0}
                            statusCounts={stats?.statusCounts || {}}
                            totalSegments={stats?.totalSegments || 0}
                            height="h-2.5"
                            showPercentage={true}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(project.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {project.updatedAt
                            ? new Date(project.updatedAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {project.deadline
                            ? new Date(project.deadline).toLocaleDateString(
                                "en-US",
                              )
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
      </div>
    </MainLayout>
  );
}

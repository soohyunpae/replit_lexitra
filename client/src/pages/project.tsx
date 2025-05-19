The code replaces the translation key for the edit button in the project info card to ensure proper translation in Korean.
```
```replit_final_file
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { formatDate, formatFileSize } from "@/lib/utils";
import { downloadFile } from "@/lib/api";
import { TranslationUnit } from "@/types";
import { File as FileType } from "@shared/schema";
import {
  ArrowRight,
  FileText,
  X,
  Plus,
  Paperclip,
  Upload,
  Download as FileDownIcon,
  PlusCircle,
  File,
  Pencil,
  TextCursorInput,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { CombinedProgress } from "@/components/ui/combined-progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Project() {
  const [isMatch, params] = useRoute("/projects/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // 관리자 권한 체크
  const isAdmin = useMemo(() => user?.role === "admin", [user?.role]);

  // 다이얼로그 상태 관리
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);

  // 참조 파일 타입 정의
  interface SavedReference {
    name: string;
    size: number;
    type: string;
    addedAt: string;
  }

  // References & Notes 상태 관리
  const [note, setNote] = useState("");
  const [isNotesEditing, setIsNotesEditing] = useState(false);
  const [references, setReferences] = useState<File[]>([]);
  const [savedReferences, setSavedReferences] = useState<SavedReference[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");
  const [glossaryInput, setGlossaryInput] = useState("default");
  const [tmInput, setTmInput] = useState("default");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get project ID from URL params
  const projectId = isMatch && params ? parseInt(params.id) : null;

  // Get project data
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

  // 프로젝트 로드 후 노트와 참조파일 가져오기
  // Separate work files from reference files
  const workFiles = useMemo(() => {
    if (!project?.files) return [];
    return project.files.filter(
      (file: FileType) => !file.type || file.type === "work",
    );
  }, [project?.files]);

  const referenceFiles = useMemo(() => {
    if (!project?.files) return [];
    return project.files.filter((file: FileType) => file.type === "reference");
  }, [project?.files]);

  useEffect(() => {
    if (project) {
      // 노트 가져오기
      if (project.notes) {
        setNote(project.notes);
      }

      // Form fields 초기화
      if (project.deadline) {
        setDeadlineInput(
          new Date(project.deadline).toISOString().split("T")[0],
        );
      }
      if (project.glossaryId) {
        setGlossaryInput(project.glossaryId);
      }
      if (project.tmId) {
        setTmInput(project.tmId);
      }

      // 참조파일 가져오기 (기존 JSON 참조 방식)
      if (project.references) {
        try {
          const parsedReferences = JSON.parse(project.references);
          if (Array.isArray(parsedReferences)) {
            setSavedReferences(parsedReferences);
          }
        } catch (error) {
          console.error("Failed to parse references:", error);
          setSavedReferences([]);
        }
      } else {
        setSavedReferences([]);
      }
    }
  }, [project]);

  // Notes 저장 mutation
  const saveNotes = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/notes`,
        { notes: note },
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Notes saved",
        description: "Project notes have been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save notes. Please try again.",
        variant: "destructive",
      });
    },
  });

  // 참조 파일 삭제 mutation
  const deleteReferenceFile = useMutation({
    mutationFn: async (fileIndex: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/projects/${projectId}/references/${fileIndex}`,
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reference file deleted",
        description: "The reference file has been removed successfully.",
      });

      // 프로젝트 데이터 새로고침
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete reference file. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reference 파일 업로드 mutation
  const uploadReferences = useMutation({
    mutationFn: async (files: File[]) => {
      try {
        // Create FormData to send actual files
        const formData = new FormData();

        // Add each file to FormData
        files.forEach((file) => {
          console.log(`Adding file to upload: ${file.name} (${file.size} bytes, type: ${file.type})`);
          formData.append("files", file);
        });

        console.log("Uploading files to:", `/api/projects/${projectId}/references/upload`);
        console.log("Files count:", files.length);

        // Debug the token issue
        console.log("Current auth token:", localStorage.getItem("auth_token") ? "Found token" : "No token found");

        // Create a custom FormData request with the right authentication
        const response = await fetch(
          `/api/projects/${projectId}/references/upload`,
          {
            method: "POST",
            headers: {
              // Use the correct token key from localStorage
              Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`
            },
            credentials: 'include', // Include cookies for session auth as fallback
            body: formData
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Upload error response:", errorText);
          throw new Error(`Failed to upload files: ${response.status} ${errorText}`);
        }

        return response.json();
      } catch (error) {
        console.error("Error in uploadReferences mutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("File upload successful, received data:", data);
      toast({
        title: "Reference files added",
        description: `${references.length} file(s) added successfully.`,
      });
      // 업로드 후 references 상태 초기화 (DB에서 관리하므로)
      setReferences([]);

      // 업로드 후 즉시 프로젝트 데이터와 파일 목록을 새로고침합니다
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });

      // 새로운 참조 파일 즉시 표시 - 서버에서 받은 데이터로 UI 업데이트
      if (data && Array.isArray(data)) {
        console.log("Adding new files to savedReferences:", data);
        setSavedReferences((prev) => {
          const updated = [...prev, ...data];
          console.log("Updated savedReferences:", updated);
          return updated;
        });
      } else {
        console.log("Data is not an array:", data);
      }
    },
    onError: (error) => {
      console.error("File upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Get all segments for all files in this project
  const getFileSegments = async (fileId: number) => {
    const response = await apiRequest("GET", `/api/segments/${fileId}`);
    return response.json();
  };

  // Fetch segments for each file
  const { data: allSegmentsData, isLoading: segmentsLoading } = useQuery<{
    [key: number]: TranslationUnit[];
  }>({
    queryKey: [`/api/projects/${projectId}/segments`],
    queryFn: async () => {
      if (!project?.files || project.files.length === 0) return {};

      const segmentsByFile: { [key: number]: TranslationUnit[] } = {};

      for (const file of project.files) {
        const segments = await getFileSegments(file.id);
        segmentsByFile[file.id] = segments;
      }

      return segmentsByFile;
    },
    enabled: !!project?.files && project.files.length > 0,
  });

  // Get status count for a specific file and status
  const getStatusCount = (fileId: number, status: string): number => {
    if (!fileSegmentStatusCounts[fileId]) return 0;
    return (
      fileSegmentStatusCounts[fileId][
        status as keyof (typeof fileSegmentStatusCounts)[number]
      ] || 0
    );
  };

  // Get total segments for a file
  const getTotalSegments = (fileId: number): number => {
    if (!fileSegmentStatusCounts[fileId]) return 0;
    return fileSegmentStatusCounts[fileId].total || 0;
  };

  // Calculate statistics for the entire project
  const projectStats = useMemo(() => {
    if (!allSegmentsData) return null;

    // Flatten all segments from all files
    const allSegments = Object.values(allSegmentsData).flat();
    const totalSegments = allSegments.length;
    const completedSegments = allSegments.filter(
      (seg) => seg.status === "Reviewed",
    ).length;
    const completionPercentage =
      totalSegments > 0
        ? Math.round((completedSegments / totalSegments) * 100)
        : 0;

    // Count segments by status
    const statusCounts = {
      MT: 0,
      Fuzzy: 0,
      "100%": 0,
      Reviewed: 0,
      Edited: 0,
      Rejected: 0,
    };

    allSegments.forEach((segment) => {
      if (segment.status in statusCounts) {
        statusCounts[segment.status as keyof typeof statusCounts]++;
      }
    });

    // Count glossary matches
    let glossaryMatchCount = 0;
    if (glossaryTerms?.length > 0) {
      allSegments.forEach((segment) => {
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
      glossaryMatchCount,
    };
  }, [allSegmentsData, glossaryTerms]);

  // 세그먼트 상태 타입 정의
  type SegmentStatus =
    | "Reviewed"
    | "100%"
    | "Fuzzy"
    | "MT"
    | "Edited"
    | "Rejected";

  // 파일별 상태 카운트 타입 정의
  type FileStatusCounts = {
    [fileId: number]: {
      Reviewed: number;
      "100%": number;
      Fuzzy: number;
      MT: number;
      Edited: number;
      Rejected: number;
      total: number;
    };
  };

  // 파일별 세그먼트 상태 카운트 계산 함수
  const fileSegmentStatusCounts = useMemo<FileStatusCounts>(() => {
    if (!allSegmentsData || !project?.files) return {} as FileStatusCounts;

    const counts: FileStatusCounts = {};

    project.files.forEach((file: any) => {
      const segments = allSegmentsData[file.id] || [];

      counts[file.id] = {
        Reviewed: 0,
        "100%": 0,
        Fuzzy: 0,
        MT: 0,
        Edited: 0,
        Rejected: 0,
        total: segments.length,
      };

      segments.forEach((segment) => {
        // 상태가 없으면 기본값으로 MT 사용
        const status = segment.status || "MT";

        // 유효한 상태인지 확인
        if (status in counts[file.id] && status !== "total") {
          counts[file.id][status as SegmentStatus]++;
        }
      });
    });

    return counts;
  }, [allSegmentsData, project?.files]);

  // 파일별 상태 퍼센트 계산 함수
  const getStatusPercentage = (
    fileId: number,
    status: SegmentStatus,
  ): number => {
    if (!fileSegmentStatusCounts[fileId]) return 0;

    const counts = fileSegmentStatusCounts[fileId];
    const total = counts.total || 1; // 0으로 나누기 방지

    return (counts[status] / total) * 100;
  };

  // 파일별 단어 수 계산 - 실제로는 세그먼트의 길이를 기반으로 계산
  const getFileWordCount = (fileId: number): number => {
    // 개발 단계에서는 일관된 더미 데이터 사용
    if (!allSegmentsData || !allSegmentsData[fileId]) {
      // 파일 ID를 시드로 사용해서 항상 동일한 값 생성
      return 500 + ((fileId * 123) % 3000);
    }

    // 실제 구현: 모든 세그먼트의 소스 텍스트 단어 수 합계
    return allSegmentsData[fileId].reduce((total, segment) => {
      if (!segment.source) return total;
      // 단어 수 계산: 공백으로 나누고 빈 항목 필터링
      const words = segment.source
        .split(/\s+/)
        .filter((word) => word.length > 0);
      return total + words.length;
    }, 0);
  };

  // 전체 프로젝트 단어 수 계산
  const calculateTotalWordCount = (): number => {
    if (!project || !project.files) return 0;

    // 모든 파일의 단어 수 합계 계산
    return project.files
      .filter((file: any) => file.type === "work" || !file.type)
      .reduce(
        (total: number, file: any) => total + getFileWordCount(file.id),
        0,
      );
  };

  // Calculate statistics for each file
  const fileStats = useMemo(() => {
    if (!allSegmentsData || !project?.files) return {};

    const stats: {
      [key: number]: { total: number; completed: number; percentage: number };
    } = {};

    project.files.forEach((file: any) => {
      const segments = allSegmentsData[file.id] || [];
      const total = segments.length;
      const completed = segments.filter(
        (seg) => seg.target && seg.target.trim() !== "",
      ).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      stats[file.id] = {
        total,
        completed,
        percentage,
      };
    });

    return stats;
  }, [allSegmentsData, project?.files]);

  // Project workflow mutations
  const claimProject = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/claim`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
    },
  });

  const releaseProject = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/release`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
    },
  });

  const completeProject = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/complete`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
    },
  });

  const reopenProject = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/reopen`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
    },
  });

  // Project Info update mutation
  const saveProjectInfo = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "PATCH",
        `/api/projects/${projectId}`,
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project info saved",
        description: "Project information has been updated successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/projects/${projectId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      navigate("/");
    },
  });

  if (isLoading) {
    return (
      <MainLayout title="Loading Project...">
        <div className="flex-1 p-6 flex items-center justify-center">
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
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-medium mb-2">Project not found</h2>
            <p className="text-muted-foreground mb-4">
              The project you're looking for doesn't exist or you don't have
              access to it.
            </p>
            <Button onClick={() => navigate("/")}>Go back to projects</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Project Detail">
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold mb-1 flex items-center">
                <span>
                  [ID {project.id}] {project.name}
                </span>
                <span
                  className={`ml-3 text-sm font-medium rounded-md px-2 py-0.5 ${
                    project.status === "Unclaimed"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                      : project.status === "Claimed"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : project.status === "Completed"
                          ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  }`}
                >
                  {project.status}
                </span>
              </h1>
            </div>

            {/* Workflow actions based on project status */}
            <div className="flex gap-2">
              {project.status === "Unclaimed" && (
                <Button
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => claimProject.mutate()}
                  disabled={claimProject.isPending}
                >
                  {claimProject.isPending ? "Claiming..." : "Claim"}
                </Button>
              )}

              {project.status === "Claimed" &&
                project.claimedBy === user?.id && (
                  <>
                    <Button
                      variant="outline"
                      className="border-yellow-500 text-yellow-500 hover:bg-yellow-50"
                      onClick={() => setShowReleaseDialog(true)}
                      disabled={releaseProject.isPending}
                    >
                      {releaseProject.isPending ? "Releasing..." : "Release"}
                    </Button>
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setShowCompleteDialog(true)}
                      disabled={completeProject.isPending}
                    >
                      {completeProject.isPending ? "Completing..." : "Complete"}
                    </Button>
                  </>
                )}

              {project.status === "Completed" &&
                (project.claimedBy === user?.id || user?.role === "admin") && (
                  <Button
                    variant="outline"
                    className="border-blue-500 text-blue-500 hover:bg-blue-50"
                    onClick={() => setShowReopenDialog(true)}
                    disabled={reopenProject.isPending}
                  >
                    {reopenProject.isPending ? "Reopening..." : "Reopen"}
                  </Button>
                )}

              {/* Release confirmation dialog */}
              <Dialog
                open={showReleaseDialog}
                onOpenChange={setShowReleaseDialog}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Release</DialogTitle>
                    <DialogDescription>
                      Releasing the project will allow other users to claim it.
                      Are you sure you want to release this project?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowReleaseDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      className="border-yellow-500 bg-yellow-500 hover:bg-yellow-600"
                      onClick={() => {
                        setShowReleaseDialog(false);
                        releaseProject.mutate();
                      }}
                    >
                      Release
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Complete confirmation dialog */}
              <Dialog
                open={showCompleteDialog}
                onOpenChange={setShowCompleteDialog}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Complete</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to mark this project as completed?
                      Completed projects cannot be edited further.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowCompleteDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setShowCompleteDialog(false);
                        completeProject.mutate();
                      }}
                    >
                      Complete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Reopen confirmation dialog */}
              <Dialog
                open={showReopenDialog}
                onOpenChange={setShowReopenDialog}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Reopen</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to reopen this completed project and
                      change its status back to in progress?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowReopenDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setShowReopenDialog(false);
                        reopenProject.mutate();
                      }}
                    >
                      Reopen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {user?.role === "admin" && project.status === "Completed" && (
                <Button
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-50"
                  onClick={() => deleteProject.mutate()}
                  disabled={deleteProject.isPending}
                >
                  {deleteProject.isPending ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Project information and settings - 2 column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Project Info Card (with Edit Toggle) */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center">
                    <span>📋 {t('projects.projectInfo')}</span>
                  </CardTitle>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? t('common.cancel') : t('projects.edit')}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex flex-col space-y-3">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">{t('projects.projectName')}:</div>
                    <div className="font-medium">{project.name}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">{t('projects.languagePair')}:</div>
                    <div className="font-medium flex items-center">
                      <span className="px-2 py-0.5 bg-primary/10 rounded-md text-xs">
                        {project.sourceLanguage}
                      </span>
                      <span className="mx-1">→</span>
                      <span className="px-2 py-0.5 bg-primary/10 rounded-md text-xs">
                        {project.targetLanguage}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">{t('projects.created')}:</div>
                    <div className="font-medium">
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">{t('projects.lastUpdated')}:</div>
                    <div className="font-medium">
                      <span>
                        {formatDate(project.updatedAt || project.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 items-center">
                    <div className="text-muted-foreground">{t('projects.deadline')}:</div>
                    {isEditing ? (
                      <div>
                        <Input
                          type="date"
                          value={deadlineInput}
                          onChange={(e) => setDeadlineInput(e.target.value)}
                          className="h-8"
                        />
                      </div>
                    ) : (
                      <div className="font-medium">
                        {project.deadline
                          ? formatDate(project.deadline)
                          : "Not set"}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1 items-center">
                    <div className="text-muted-foreground">TB:</div>
                    {isEditing ? (
                      <div>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                          value={glossaryInput}
                          onChange={(e) => setGlossaryInput(e.target.value)}
                        >
                          <option value="default">Default Glossary</option>
                          <option value="patents">Patents Glossary</option>
                          <option value="technical">Technical Glossary</option>
                        </select>
                      </div>
                    ) : (
                      <div className="font-medium">
                        {project.glossaryId === "patents"
                          ? "Patents Glossary"
                          : project.glossaryId === "technical"
                            ? "Technical Glossary"
                            : "Default Glossary"}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1 items-center">
                    <div className="text-muted-foreground">TM:</div>
                    {isEditing ? (
                      <div>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                          value={tmInput}
                          onChange={(e) => setTmInput(e.target.value)}
                        >
                          <option value="default">Default TM</option>
                          <option value="patents">Patents TM</option>
                          <option value="technical">Technical TM</option>
                        </select>
                      </div>
                    ) : (
                      <div className="font-medium">
                        {project.tmId === "patents"
                          ? "Patents TM"
                          : project.tmId === "technical"
                            ? "Technical TM"
                            : "Default TM"}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground"># of Files:</div>
                    <div className="font-medium">
                      <span>{workFiles?.length || 0} file(s)</span>
                    </div>
                  </div>
                </div>
                {isEditing && (
                  <div className="pt-4 border-t border-border/50 mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center gap-1"
                      onClick={() => {
                        // 날짜 형식 처리
                        let formattedDeadline = null;
                        if (deadlineInput) {
                          try {
                            // ISO 날짜 형식으로 변환
                            const deadlineDate = new Date(deadlineInput);
                            formattedDeadline = deadlineDate.toISOString();
                          } catch (e) {
                            console.
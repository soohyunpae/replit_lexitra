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
  const [isMatch1, params1] = useRoute("/projects/:id");
  const [isMatch2, params2] = useRoute("/project/:id");
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

  // Get project ID from URL params (support both routes)
  const isMatch = isMatch1 || isMatch2;
  const params = params1 || params2;
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
        title: "notifications.saveSuccess",
        description: "notifications.notesSavedSuccess",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
    },
    onError: () => {
      toast({
        title: "notifications.saveFailed",
        description: "notifications.notesFailedToSave",
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
        title: t("notifications.fileDeleted"),
        description: t("notifications.referenceFileRemoved"),
      });

      // 프로젝트 데이터 새로고침
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
    },
    onError: () => {
      toast({
        title: t("notifications.deleteFailed"),
        description: t("notifications.referenceFileDeleteFailed"),
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
          console.log(
            `Adding file to upload: ${file.name} (${file.size} bytes, type: ${file.type})`,
          );
          formData.append("files", file);
        });

        console.log(
          "Uploading files to:",
          `/api/projects/${projectId}/references/upload`,
        );
        console.log("Files count:", files.length);

        // Debug the token issue
        console.log(
          "Current auth token:",
          localStorage.getItem("auth_token") ? "Found token" : "No token found",
        );

        // Create a custom FormData request with the right authentication
        const response = await fetch(
          `/api/projects/${projectId}/references/upload`,
          {
            method: "POST",
            headers: {
              // Use the correct token key from localStorage
              Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
            },
            credentials: "include", // Include cookies for session auth as fallback
            body: formData,
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Upload error response:", errorText);
          throw new Error(
            `Failed to upload files: ${response.status} ${errorText}`,
          );
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
        title: t("notifications.referenceFilesAdded"),
        description: t("notifications.filesAdded", {
          count: references.length,
        }),
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
        title: t("notifications.uploadFailed"),
        description: t("notifications.fileUploadError"),
        variant: "destructive",
      });
    },
  });

  // Template-based DOCX download mutation
  const downloadTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/download-template`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token") || ""}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "템플릿 다운로드에 실패했습니다.");
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}_translated_${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "다운로드 완료",
        description: "번역된 DOCX 파일이 다운로드되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Template download error:", error);
      toast({
        title: "다운로드 실패",
        description: error instanceof Error ? error.message : "템플릿 다운로드 중 오류가 발생했습니다.",
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
        title: t("notifications.projectInfoSaved"),
        description: t("notifications.projectInfoSavedDesc"),
      });
      setIsEditing(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
    },
    onError: () => {
      toast({
        title: t("notifications.error"),
        description: t("notifications.updateFailed"),
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
    <MainLayout title={t("projects.projectDetail")}>
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
                  {t(`projects.status${project.status}`)}
                </span>
              </h1>
            </div>

            {/* Workflow actions based on project status */}
            <div className="flex gap-2">
              {/* Template Download Button */}
              {project.templateId && (
                <Button
                  variant="outline"
                  className="border-purple-500 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950"
                  onClick={() => downloadTemplateMutation.mutate()}
                  disabled={downloadTemplateMutation.isPending}
                >
                  {downloadTemplateMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      생성중...
                    </>
                  ) : (
                    <>
                      <FileDownIcon className="h-4 w-4 mr-2" />
                      템플릿 다운로드
                    </>
                  )}
                </Button>
              )}

              {project.status === "Unclaimed" && (
                <Button
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => claimProject.mutate()}
                  disabled={claimProject.isPending}
                >
                  {claimProject.isPending
                    ? t("projects.claiming")
                    : t("projects.claim")}
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
                      {releaseProject.isPending
                        ? t("projects.releasing")
                        : t("projects.release")}
                    </Button>
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setShowCompleteDialog(true)}
                      disabled={completeProject.isPending}
                    >
                      {completeProject.isPending
                        ? t("projects.completing")
                        : t("projects.complete")}
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
                    {reopenProject.isPending
                      ? t("projects.reopening")
                      : t("projects.reopen")}
                  </Button>
                )}

              {/* Release confirmation dialog */}
              <Dialog
                open={showReleaseDialog}
                onOpenChange={setShowReleaseDialog}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("projects.confirmRelease")}</DialogTitle>
                    <DialogDescription>
                      {t("projects.releaseDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowReleaseDialog(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      variant="default"
                      className="border-yellow-500 bg-yellow-500 hover:bg-yellow-600"
                      onClick={() => {
                        setShowReleaseDialog(false);
                        releaseProject.mutate();
                      }}
                    >
                      {t("projects.release")}
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
                    <DialogTitle>{t("projects.confirmComplete")}</DialogTitle>
                    <DialogDescription>
                      {t("projects.completeDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowCompleteDialog(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setShowCompleteDialog(false);
                        completeProject.mutate();
                      }}
                    >
                      {t("projects.complete")}
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
                    <DialogTitle>{t("projects.confirmReopen")}</DialogTitle>
                    <DialogDescription>
                      {t("projects.reopenDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowReopenDialog(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      variant="default"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setShowReopenDialog(false);
                        reopenProject.mutate();
                      }}
                    >
                      {t("projects.reopen")}
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
                  {deleteProject.isPending
                    ? t("projects.deleting")
                    : t("common.delete")}
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
                    <span>📋 {t("projects.projectInfo")}</span>
                  </CardTitle>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? t("common.cancel") : t("common.edit")}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex flex-col space-y-3">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">
                      {t("projects.projectName")}:
                    </div>
                    <div className="font-medium">{project.name}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">
                      {t("projects.languagePair")}:
                    </div>
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
                    <div className="text-muted-foreground">
                      {t("projects.created")}:
                    </div>
                    <div className="font-medium">
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">
                      {t("projects.lastUpdated")}:
                    </div>
                    <div className="font-medium">
                      <span>
                        {formatDate(project.updatedAt || project.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Template Information */}
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">
                      템플릿:
                    </div>
                    <div className="font-medium flex items-center">
                      {project.templateId ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-green-600 dark:text-green-400">
                            템플릿 적용됨
                          </span>
                          {project.templateMatchScore && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({JSON.parse(project.templateMatchScore).templateName})
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-orange-500 mr-1" />
                          <span className="text-orange-600 dark:text-orange-400">
                            템플릿 미적용
                          </span>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-2 h-6 px-2 text-xs"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/projects/${projectId}/match-template`, {
                                    method: 'POST',
                                    headers: {
                                      'Authorization': `Bearer ${localStorage.getItem("auth_token") || ""}`,
                                      'Content-Type': 'application/json',
                                    },
                                    credentials: 'include',
                                  });
                                  
                                  const result = await response.json();
                                  
                                  if (response.ok) {
                                    if (result.matched) {
                                      toast({
                                        title: "템플릿 매칭 성공",
                                        description: `템플릿 "${result.templateName}"이 적용되었습니다. (매칭률: ${Math.round(result.matchScore * 100)}%)`,
                                      });
                                    } else {
                                      toast({
                                        title: "템플릿 매칭 실패",
                                        description: result.message || "매칭되는 템플릿을 찾을 수 없습니다.",
                                        variant: "destructive",
                                      });
                                    }
                                    
                                    // 프로젝트 정보 새로고침
                                    queryClient.invalidateQueries({
                                      queryKey: [`/api/projects/${projectId}`],
                                    });
                                  } else {
                                    toast({
                                      title: "템플릿 매칭 오류",
                                      description: result.message || "템플릿 매칭 중 서버 오류가 발생했습니다.",
                                      variant: "destructive",
                                    });
                                  }
                                } catch (error) {
                                  console.error("템플릿 매칭 요청 오류:", error);
                                  toast({
                                    title: "템플릿 매칭 실패",
                                    description: "네트워크 오류가 발생했습니다.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              매칭 시도
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 items-center">
                    <div className="text-muted-foreground">
                      {t("projects.deadline")}:
                    </div>
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
                          : t("projects.notSet")}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1 items-center">
                    <div className="text-muted-foreground">
                      {t("glossaries.title")}:
                    </div>
                    {isEditing ? (
                      <div>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                          value={glossaryInput}
                          onChange={(e) => setGlossaryInput(e.target.value)}
                        >
                          <option value="default">
                            {t("projects.defaultGlossary")}
                          </option>
                          <option value="patents">
                            {t("projects.patentsGlossary")}
                          </option>
                          <option value="technical">
                            {t("projects.technicalGlossary")}
                          </option>
                        </select>
                      </div>
                    ) : (
                      <div className="font-medium">
                        {project.glossaryId === "patents"
                          ? t("projects.patentsGlossary")
                          : project.glossaryId === "technical"
                            ? t("projects.technicalGlossary")
                            : t("projects.defaultGlossary")}
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
                          <option value="default">
                            {t("projects.defaultTM")}
                          </option>
                          <option value="patents">
                            {t("projects.patentsTM")}
                          </option>
                          <option value="technical">
                            {t("projects.technicalTM")}
                          </option>
                        </select>
                      </div>
                    ) : (
                      <div className="font-medium">
                        {project.tmId === "patents"
                          ? t("projects.patentsTM")
                          : project.tmId === "technical"
                            ? t("projects.technicalTM")
                            : t("projects.defaultTM")}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">
                      {t("projects.numberOfFiles")}:
                    </div>
                    <div className="font-medium">
                      <span>{workFiles?.length || 0}</span>
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
                            console.error("날짜 형식 변환 오류:", e);
                          }
                        }

                        saveProjectInfo.mutate({
                          deadline: formattedDeadline,
                          glossaryId: glossaryInput,
                          tmId: tmInput,
                        });
                      }}
                      disabled={saveProjectInfo.isPending}
                    >
                      <span>
                        {saveProjectInfo.isPending
                          ? t("common.saving")
                          : t("projects.saveProjectInfo")}
                      </span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Translation Summary Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <span>📊 {t("projects.translationSummary")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                {projectStats ? (
                  <>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-muted-foreground flex items-center gap-1.5">
                            <TextCursorInput className="h-35 w-3.5" />
                            <span>{t("projects.wordCount")}:</span>
                          </div>
                          <div className="font-medium">
                            {project.wordCount || calculateTotalWordCount()}{" "}
                            {t("projects.words")}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-muted-foreground">
                            {t("projects.reviewed")}:
                          </div>
                          <div className="font-medium">
                            {projectStats.completedSegments} /{" "}
                            {projectStats.totalSegments}{" "}
                            {t("projects.segments")}
                            <span className="ml-1 text-primary">
                              (
                              {Math.round(
                                (projectStats.statusCounts.Reviewed /
                                  projectStats.totalSegments) *
                                  100,
                              )}
                              %)
                            </span>
                          </div>
                        </div>
                        <Progress
                          value={projectStats.completionPercentage}
                          className="h-2"
                          style={
                            {
                              "--reviewed-percent": `${((projectStats.statusCounts.Reviewed || 0) / projectStats.totalSegments) * 100}%`,
                              "--match-100-percent": `${((projectStats.statusCounts["100%"] || 0) / projectStats.totalSegments) * 100}%`,
                              "--fuzzy-percent": `${((projectStats.statusCounts.Fuzzy || 0) / projectStats.totalSegments) * 100}%`,
                              "--mt-percent": `${((projectStats.statusCounts.MT || 0) / projectStats.totalSegments) * 100}%`,
                              "--edited-percent": `${((projectStats.statusCounts.Edited || 0) / projectStats.totalSegments) * 100}%`,
                              "--rejected-percent": `${((projectStats.statusCounts.Rejected || 0) / projectStats.totalSegments) * 100}%`,
                            } as React.CSSProperties
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="text-muted-foreground">
                        {t("projects.statusBreakdown")}:
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 rounded-full bg-green-300"></div>
                          <span>{t("projects.reviewed")}:</span>
                          <span className="font-medium ml-auto">
                            {projectStats.statusCounts["Reviewed"]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                          <span>{t("projects.match100")}:</span>
                          <span className="font-medium ml-auto">
                            {projectStats.statusCounts["100%"]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-300"></div>
                          <span>{t("projects.fuzzyMatch")}:</span>
                          <span className="font-medium ml-auto">
                            {projectStats.statusCounts["Fuzzy"]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                          <span>{t("projects.mt")}:</span>
                          <span className="font-medium ml-auto">
                            {projectStats.statusCounts["MT"]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 rounded-full bg-purple-300"></div>
                          <span>{t("projects.edited")}:</span>
                          <span className="font-medium ml-auto">
                            {projectStats.statusCounts.Edited || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-300"></div>
                          <span>{t("projects.rejected")}:</span>
                          <span className="font-medium ml-auto">
                            {projectStats.statusCounts.Rejected || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 mt-2">
                      <div className="text-muted-foreground">
                        {t("projects.glossaryUsage")}:
                      </div>
                      <div className="font-medium">
                        {t("projects.termMatches", {
                          count: projectStats.glossaryMatchCount,
                        })}
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

          {/* Work Files Section */}
          {/* File list */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t("projects.files")}</CardTitle>
              <CardDescription />
            </CardHeader>
            <CardContent>
              {workFiles && workFiles.length > 0 ? (
                <div className="space-y-2">
                  {workFiles.map((file: FileType) => {
                    const stats = fileStats[file.id] || {
                      total: 0,
                      completed: 0,
                      percentage: 0,
                    };
                    return (
                      <div
                        key={file.id}
                        className="border border-border rounded-lg p-4 hover:border-primary/60 transition-colors"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                          <div className="md:col-span-2">
                            <div className="mb-2 flex items-center">
                              <h3 className="font-medium truncate">
                                {file.name}
                              </h3>
                              {file.processingStatus && (
                                <div className="ml-2">
                                  {file.processingStatus === "processing" && (
                                    <div className="flex items-center">
                                      <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full mr-1"></div>
                                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                        {t("projects.processing")}
                                      </span>
                                    </div>
                                  )}
                                  {file.processingStatus === "error" && (
                                    <span
                                      className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded"
                                      title={
                                        file.errorMessage ||
                                        t("projects.processingError")
                                      }
                                    >
                                      {t("projects.processingError")}
                                    </span>
                                  )}
                                  {file.processingStatus === "ready" && (
                                    <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                                      {t("projects.ready")}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {file.processingStatus === "processing" ? (
                                <Progress
                                  value={30}
                                  className="h-2 flex-1 animate-pulse"
                                />
                              ) : file.processingStatus === "error" ? (
                                <Progress
                                  value={100}
                                  className="h-2 flex-1 bg-red-200 dark:bg-red-900"
                                />
                              ) : (
                                <Progress
                                  value={stats.percentage}
                                  className="h-2 flex-1"
                                  style={
                                    {
                                      "--reviewed-percent": `${getStatusPercentage(file.id, "Reviewed")}%`,
                                      "--match-100-percent": `${getStatusPercentage(file.id, "100%")}%`,
                                      "--fuzzy-percent": `${getStatusPercentage(file.id, "Fuzzy")}%`,
                                      "--mt-percent": `${getStatusPercentage(file.id, "MT")}%`,
                                      "--edited-percent": `${getStatusPercentage(file.id, "Edited")}%`,
                                      "--rejected-percent": `${getStatusPercentage(file.id, "Rejected")}%`,
                                    } as React.CSSProperties
                                  }
                                />
                              )}
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {file.processingStatus === "ready"
                                  ? `${getStatusCount(file.id, "Reviewed")}/${getTotalSegments(file.id)} (${Math.round(getStatusPercentage(file.id, "Reviewed"))}%)`
                                  : file.processingStatus === "processing"
                                    ? t("projects.preparing")
                                    : t("projects.unavailable")}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <div className="text-sm text-muted-foreground">
                              {formatDate(file.updatedAt || file.createdAt)}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <TextCursorInput className="h-3.5 w-3.5" />
                              <span>
                                {file.processingStatus === "ready"
                                  ? `${(file as any).wordCount || getFileWordCount(file.id)} ${t("projects.words")}`
                                  : t("projects.calculatingWords")}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              onClick={() =>
                                navigate(`/translation/${file.id}`)
                              }
                              disabled={
                                project.status === "Unclaimed" ||
                                (project.status === "Claimed" &&
                                  project.claimedBy !== user?.id &&
                                  user?.role !== "admin") ||
                                file.processingStatus === "processing" ||
                                file.processingStatus === "error"
                              }
                              variant={
                                project.status === "Unclaimed" ||
                                (project.status === "Claimed" &&
                                  project.claimedBy !== user?.id &&
                                  user?.role !== "admin") ||
                                file.processingStatus === "processing" ||
                                file.processingStatus === "error"
                                  ? "outline"
                                  : "default"
                              }
                            >
                              {file.processingStatus === "processing"
                                ? t("projects.fileProcessing")
                                : file.processingStatus === "error"
                                  ? t("projects.fileProcessingError")
                                  : project.status === "Unclaimed"
                                    ? t("projects.claimProjectFirst")
                                    : project.status === "Claimed" &&
                                        project.claimedBy !== user?.id
                                      ? t("projects.claimedByAnotherUser")
                                      : t("projects.openEditor")}
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
                  <h3 className="text-lg font-medium mb-2">
                    {t("projects.noFilesYet")}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    {t("projects.fileManagementPolicy")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reference Files Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <span>📂 {t("projects.referenceFiles")}</span>
                </CardTitle>
                <CardDescription />
              </CardHeader>
              <CardContent>
                {/* Reference files list */}
                {savedReferences.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {savedReferences.map((file, index) => (
                      <div
                        key={`file-ref-${index}`}
                        className="flex items-center justify-between border border-border/70 rounded-md p-3 hover:border-primary/60 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate mr-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="truncate">
                            <div className="text-sm text-primary truncate">
                              {file.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Added {formatDate(file.addedAt)}
                              {file.size && ` • ${formatFileSize(file.size)}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              // 새로 만든 API 헬퍼 함수를 이용해 다운로드 처리
                              downloadFile(
                                `/api/projects/${projectId}/references/${index}/download`,
                                file.name || `reference-${index}.file`,
                              ).catch((err) => {
                                console.error("Download error:", err);
                                toast({
                                  title: t("notifications.downloadFailed"),
                                  description: t(
                                    "notifications.fileDownloadError",
                                  ),
                                  variant: "destructive",
                                });
                              });
                            }}
                            title={t("projects.downloadFile")}
                          >
                            <FileDownIcon className="h-3 w-3" />
                          </Button>

                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => deleteReferenceFile.mutate(index)}
                              disabled={deleteReferenceFile.isPending}
                              title={t("projects.deleteFile")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Drag and drop area for adding more files (admin only) */}
                    {isAdmin && (
                      <div
                        className="border-2 border-dashed border-border/50 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.classList.add("border-primary");
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.classList.remove("border-primary");
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.classList.remove("border-primary");

                          if (
                            e.dataTransfer.files &&
                            e.dataTransfer.files.length > 0
                          ) {
                            const newFiles = Array.from(e.dataTransfer.files);
                            setReferences([...references, ...newFiles]);
                            // Upload the files
                            uploadReferences.mutate(newFiles);
                          }
                        }}
                      >
                        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                        <p className="text-xs text-muted-foreground">
                          {t("projects.dropFilesHere")}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {isAdmin ? (
                      <>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          multiple
                          accept="*/*"
                          onChange={(e) => {
                            console.log("File input change event triggered");
                            if (e.target.files && e.target.files.length > 0) {
                              console.log(
                                `Files selected: ${e.target.files.length}`,
                              );
                              const newFiles = Array.from(e.target.files);
                              console.log(
                                "Files selected via dialog:",
                                newFiles.map((f) => f.name),
                              );
                              setReferences((prev) => [...prev, ...newFiles]);

                              // Create a new FormData directly here
                              const formData = new FormData();
                              newFiles.forEach((file) => {
                                formData.append("files", file);
                                console.log(
                                  `Added file to FormData: ${file.name}`,
                                );
                              });

                              // Use the mutation
                              uploadReferences.mutate(newFiles);

                              // Reset the input value to allow selecting the same file again
                              e.target.value = "";
                            } else {
                              console.log("No files selected in file dialog");
                            }
                          }}
                        />
                        <div
                          className="text-center py-8 border-2 border-dashed border-border/50 rounded-lg mb-4 hover:border-primary/50 transition-colors cursor-pointer"
                          onClick={() => {
                            console.log(
                              "Reference area clicked, opening file dialog",
                            );
                            fileInputRef.current?.click();
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.classList.add("border-primary");
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.classList.remove("border-primary");
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.classList.remove("border-primary");
                            console.log("Files dropped on reference area");

                            if (
                              e.dataTransfer.files &&
                              e.dataTransfer.files.length > 0
                            ) {
                              const newFiles = Array.from(e.dataTransfer.files);
                              console.log(
                                "Files dropped:",
                                newFiles.map((f) => f.name),
                              );
                              setReferences([...references, ...newFiles]);
                              // Upload the files
                              uploadReferences.mutate(newFiles);
                            }
                          }}
                        >
                          <div className="mx-auto h-12 w-12 rounded-full bg-accent flex items-center justify-center mb-3">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <h3 className="text-sm font-medium mb-1">
                            {t("projects.noReferenceFiles")}
                          </h3>
                          <p className="text-xs text-primary">
                            {t("projects.dropFilesHere")}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 border-2 border-border/50 rounded-lg mb-4">
                        <div className="mx-auto h-12 w-12 rounded-full bg-accent flex items-center justify-center mb-3">
                          <File className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-medium mb-1">
                          {t("projects.noReferenceFiles")}
                        </h3>
                        <p className="text-muted-foreground text-xs max-w-md mx-auto">
                          {t("projects.noReferenceFilesDesc")}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>📝 {t("projects.projectNotes")}</span>
                  {!isNotesEditing && note && isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsNotesEditing(true)}
                      className="text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      {t("common.edit")}
                    </Button>
                  )}
                </CardTitle>
                <CardDescription />
              </CardHeader>
              <CardContent>
                {isNotesEditing ? (
                  <Textarea
                    placeholder={t("projects.notesPlaceholder")}
                    className="min-h-24"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={() => {
                      saveNotes.mutate();
                      setIsNotesEditing(false);
                    }}
                    autoFocus
                    disabled={!isAdmin}
                  />
                ) : (
                  <div
                    className={`border rounded-md p-3 min-h-24 text-sm whitespace-pre-wrap ${isAdmin ? "cursor-pointer" : ""}`}
                    onClick={() => isAdmin && setIsNotesEditing(true)}
                  >
                    {note ? (
                      note
                    ) : isAdmin ? (
                      <span className="text-muted-foreground">
                        {t("projects.clickToAddNotes")}
                      </span>
                    ) : (
                      t("projects.noNotesAvailable")
                    )}
                  </div>
                )}
                {saveNotes.isPending && (
                  <div className="mt-2 text-xs text-muted-foreground flex items-center">
                    <div className="animate-spin mr-1 h-3 w-3 border-t-2 border-primary rounded-full"></div>
                    {t("projects.savingNotes")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}

// Analysis: The code has been modified to include translations for project page strings and project details using the i18next library.

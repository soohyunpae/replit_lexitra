import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { formatDate, formatFileSize } from "@/lib/utils";
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
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

  // Reference 파일 업로드 mutation
  const uploadReferences = useMutation({
    mutationFn: async (files: File[]) => {
      // 현재 우리 서버에서는 실제 파일 업로드 처리 대신 메타데이터만 전송
      // 파일 이름과 크기를 서버에 전송합니다
      const fileMetadata = files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      }));

      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/references`,
        {
          files: fileMetadata,
        },
      );
      return response.json();
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
      
      // 새로운 참조 파일 즉시 표시
      if (data && Array.isArray(data)) {
        console.log("Adding new files to savedReferences:", data);
        const newRefs = data.map((file: any) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          addedAt: new Date().toISOString(),
        }));
        setSavedReferences((prev) => {
          console.log("Previous savedReferences:", prev);
          const updated = [...prev, ...newRefs];
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

  // Calculate statistics for the entire project
  const projectStats = useMemo(() => {
    if (!allSegmentsData) return null;

    // Flatten all segments from all files
    const allSegments = Object.values(allSegmentsData).flat();
    const totalSegments = allSegments.length;
    const completedSegments = allSegments.filter(
      (seg) => seg.target && seg.target.trim() !== "",
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
                <span>Project {project.id}: {project.name}</span>
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
                    <span>📋 Project Info</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </Button>
                </div>
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
                    <div className="text-muted-foreground">Created:</div>
                    <div className="font-medium">
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">Last Updated:</div>
                    <div className="font-medium">
                      <span>
                        {formatDate(project.updatedAt || project.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 items-center">
                    <div className="text-muted-foreground">Deadline:</div>
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
                      onClick={() =>
                        saveProjectInfo.mutate({
                          deadline: deadlineInput || null,
                          glossaryId: glossaryInput,
                          tmId: tmInput,
                        })
                      }
                      disabled={saveProjectInfo.isPending}
                    >
                      <span>
                        {saveProjectInfo.isPending
                          ? "Saving..."
                          : "Save Project Info"}
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
                  <span>📊 Translation Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                {projectStats ? (
                  <>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-muted-foreground">
                            Completion:
                          </div>
                          <div className="font-medium">
                            {projectStats.completedSegments} /{" "}
                            {projectStats.totalSegments} segments
                            <span className="ml-1 text-primary">
                              ({projectStats.completionPercentage}%)
                            </span>
                          </div>
                        </div>
                        <Progress
                          value={projectStats.completionPercentage}
                          className="h-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="text-muted-foreground">
                        TM Match Breakdown:
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span>100% Match:</span>
                          <span className="font-medium ml-auto">
                            {projectStats.statusCounts["100%"]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <span>Fuzzy Match:</span>
                          <span className="font-medium ml-auto">
                            {projectStats.statusCounts["Fuzzy"]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span>MT:</span>
                          <span className="font-medium ml-auto">
                            {projectStats.statusCounts["MT"]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          <span>Reviewed:</span>
                          <span className="font-medium ml-auto">
                            {projectStats.statusCounts["Reviewed"]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 mt-2">
                      <div className="text-muted-foreground">
                        Glossary Usage:
                      </div>
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

          {/* Reference Files Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <span>📂 Reference Files</span>
                </CardTitle>
                <CardDescription />
              </CardHeader>
              <CardContent>
                {/* Reference files list */}
                {referenceFiles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {referenceFiles.map((file: FileType, index: number) => (
                      <div
                        key={`file-ref-${index}`}
                        className="flex items-center justify-between border border-border/70 rounded-md p-3 hover:border-primary/60 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate mr-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="truncate">
                            <button
                              onClick={() => {
                                const token =
                                  localStorage.getItem("auth_token");
                                const downloadFile = async () => {
                                  try {
                                    const response = await fetch(
                                      `/api/files/${file.id}/download`,
                                      {
                                        method: "GET",
                                        headers: {
                                          Authorization: `Bearer ${token}`,
                                        },
                                      },
                                    );

                                    if (!response.ok) {
                                      throw new Error(
                                        `Download failed: ${response.status}`,
                                      );
                                    }

                                    const blob = await response.blob();
                                    const url =
                                      window.URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.style.display = "none";
                                    a.href = url;
                                    a.download = file.name;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);

                                    toast({
                                      title: "Download started",
                                      description: `File ${file.name} is being downloaded.`,
                                    });
                                  } catch (error) {
                                    console.error("Download error:", error);
                                    toast({
                                      title: "Download failed",
                                      description:
                                        error instanceof Error
                                          ? error.message
                                          : "Unknown error",
                                      variant: "destructive",
                                    });
                                  }
                                };

                                downloadFile();
                              }}
                              className="text-sm text-primary hover:underline cursor-pointer truncate"
                            >
                              {file.name}
                            </button>
                            <div className="text-xs text-muted-foreground">
                              Added {formatDate(file.createdAt)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            // TODO: Implement delete reference file
                            toast({
                              title: "Not implemented",
                              description:
                                "Delete reference file functionality is not yet implemented.",
                            });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    
                    {/* Drag and drop area for adding more files */}
                    <div 
                      className="border-2 border-dashed border-border/50 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.add('border-primary');
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.remove('border-primary');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.remove('border-primary');
                        
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          const newFiles = Array.from(e.dataTransfer.files);
                          setReferences([...references, ...newFiles]);
                          // Upload the files
                          uploadReferences.mutate(newFiles);
                        }
                      }}
                    >
                      <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Drop files here or click to add more
                      </p>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="text-center py-8 border-2 border-dashed border-border/50 rounded-lg mb-4 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.add('border-primary');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('border-primary');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('border-primary');
                      
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const newFiles = Array.from(e.dataTransfer.files);
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
                      No Reference Files
                    </h3>
                    <p className="text-muted-foreground text-xs max-w-md mx-auto mb-2">
                      Upload reference files to help translators understand
                      context and terminology
                    </p>
                    <p className="text-xs text-primary">
                      Drop files here or click to upload
                    </p>
                  </div>
                )}

                {/* Add references button */}
                <div className="flex items-center justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="h-4 w-4" />
                    Add Reference Files
                  </Button>

                  {/* Hidden file input */}
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const newFiles = Array.from(e.target.files);
                        setReferences([...references, ...newFiles]);

                        // Reset input field after selection
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }

                        // If there are files, upload them
                        if (newFiles.length > 0) {
                          uploadReferences.mutate(newFiles);
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>📝 Project Notes</span>
                  {!isNotesEditing && note && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsNotesEditing(true)}
                      className="text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  )}
                </CardTitle>
                <CardDescription />
              </CardHeader>
              <CardContent>
                {isNotesEditing || !note ? (
                  <Textarea
                    placeholder="Document translation guidelines, special requirements, terminology instructions..."
                    className="min-h-24"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                ) : (
                  <div className="border rounded-md p-3 min-h-24 text-sm whitespace-pre-wrap">
                    {note || "No notes available."}
                  </div>
                )}
              </CardContent>
              {(isNotesEditing || !note) && (
                <CardFooter className="flex justify-end pt-0">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      saveNotes.mutate();
                      setIsNotesEditing(false);
                    }}
                    disabled={saveNotes.isPending}
                  >
                    {saveNotes.isPending ? "Saving..." : "Save Notes"}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>

          {/* File list */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Files</CardTitle>
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
                            <div className="mb-2">
                              <h3 className="font-medium truncate">
                                {file.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={stats.percentage}
                                className="h-2 flex-1"
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {stats.completed}/{stats.total} (
                                {stats.percentage}%)
                              </span>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {formatDate(file.updatedAt || file.createdAt)}
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
                                  user?.role !== "admin")
                              }
                              variant={
                                project.status === "Unclaimed" ||
                                (project.status === "Claimed" &&
                                  project.claimedBy !== user?.id &&
                                  user?.role !== "admin")
                                  ? "outline"
                                  : "default"
                              }
                            >
                              {project.status === "Unclaimed"
                                ? "Claim Project First"
                                : project.status === "Claimed" &&
                                    project.claimedBy !== user?.id
                                  ? "Claimed by Another User"
                                  : "Open Editor"}
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
                    Files must be added during project creation. Per the file
                    management policy, projects without files cannot be created,
                    and files cannot be added or modified after creation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </MainLayout>
  );
}

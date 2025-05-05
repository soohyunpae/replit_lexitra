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
  File 
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter
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
  DialogTrigger
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
  const [references, setReferences] = useState<File[]>([]);
  const [savedReferences, setSavedReferences] = useState<SavedReference[]>([]);
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
    return project.files.filter((file: FileType) => !file.type || file.type === 'work');
  }, [project?.files]);

  const referenceFiles = useMemo(() => {
    if (!project?.files) return [];
    return project.files.filter((file: FileType) => file.type === 'reference');
  }, [project?.files]);

  useEffect(() => {
    if (project) {
      // 노트 가져오기
      if (project.notes) {
        setNote(project.notes);
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
      const response = await apiRequest("POST", `/api/projects/${projectId}/notes`, { notes: note });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Notes saved",
        description: "Project notes have been saved successfully."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save notes. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Reference 파일 업로드 mutation
  const uploadReferences = useMutation({
    mutationFn: async (files: File[]) => {
      // 현재 우리 서버에서는 실제 파일 업로드 처리 대신 메타데이터만 전송
      // 파일 이름과 크기를 서버에 전송합니다
      const fileMetadata = files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }));
      
      const response = await apiRequest("POST", `/api/projects/${projectId}/references`, {
        files: fileMetadata
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reference files added",
        description: `${references.length} file(s) added successfully.`
      });
      // 업로드 후 references 상태 초기화 (DB에서 관리하므로)
      setReferences([]);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload files. Please try again.",
        variant: "destructive"
      });
    }
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

  // Project workflow mutations
  const claimProject = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/claim`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    }
  });

  const releaseProject = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/release`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    }
  });

  const completeProject = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/complete`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    }
  });

  const reopenProject = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/reopen`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    }
  });

  const deleteProject = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/projects/${projectId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      navigate("/");
    }
  });

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
            </div>
            
            {/* Workflow actions based on project status */}
            <div className="flex gap-2">
              {project.status === 'Unclaimed' && (
                <Button 
                  variant="default" 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => claimProject.mutate()}
                  disabled={claimProject.isPending}
                >
                  {claimProject.isPending ? "Claiming..." : "Claim"}
                </Button>
              )}
              
              {project.status === 'Claimed' && project.claimedBy === user?.id && (
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
              
              {project.status === 'Completed' && (project.claimedBy === user?.id || user?.role === 'admin') && (
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
              <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Release</DialogTitle>
                    <DialogDescription>
                      Releasing the project will allow other users to claim it. Are you sure you want to release this project?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>Cancel</Button>
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
              <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Complete</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to mark this project as completed? Completed projects cannot be edited further.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>Cancel</Button>
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
              <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Reopen</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to reopen this completed project and change its status back to in progress?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowReopenDialog(false)}>Cancel</Button>
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
              
              {user?.role === 'admin' && project.status === 'Completed' && (
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
                  
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">Files:</div>
                    <div className="font-medium">
                      <span>{workFiles?.length || 0} file(s)</span>
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
          
          {/* Work files section deleted as requested - it's duplicate of Files section below */}
          
          {/* References Section */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                References
              </CardTitle>
              <CardDescription>
                Upload reference files (glossaries, guides, etc.) to help with translation - unlike work files, reference files can be added anytime
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                {/* Display saved reference files (from files table with type='reference') */}
                {referenceFiles.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Reference Files</h3>
                    {referenceFiles.map((file: FileType, index: number) => (
                      <div key={`file-ref-${index}`} className="flex items-center justify-between py-2 px-3 border border-border rounded-md">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <button
                            onClick={() => {
                              const token = localStorage.getItem('auth_token');
                              const downloadFile = async () => {
                                try {
                                  const response = await fetch(`/api/files/${file.id}/download`, {
                                    method: 'GET',
                                    headers: {
                                      'Authorization': `Bearer ${token}`
                                    }
                                  });
                                  
                                  if (!response.ok) {
                                    throw new Error(`Download failed: ${response.status}`);
                                  }
                                  
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.style.display = 'none';
                                  a.href = url;
                                  a.download = file.name;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                  
                                  toast({
                                    title: "Download started",
                                    description: `File ${file.name} is being downloaded.`
                                  });
                                } catch (error) {
                                  console.error('Download error:', error);
                                  toast({
                                    title: "Download failed",
                                    description: error instanceof Error ? error.message : 'Unknown error',
                                    variant: "destructive"
                                  });
                                }
                              };
                              
                              downloadFile();
                            }}
                            className="text-sm text-primary hover:underline cursor-pointer text-left flex items-center gap-2"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {file.name}
                          </button>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs text-muted-foreground mr-2">
                            {new Date(file.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Display legacy saved references from JSON field (for backward compatibility) */}
                {savedReferences.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Legacy References</h3>
                    {savedReferences.map((file: SavedReference, index: number) => (
                      <div key={`saved-${index}`} className="flex items-center justify-between py-2 px-3 border border-border rounded-md">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{file.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatFileSize(file.size)}
                          </span>
                          <span className="text-xs text-amber-500 ml-2">(레거시 형식 - 다운로드 불가)</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs text-muted-foreground mr-2">
                            {new Date(file.addedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Display new references being uploaded */}
                {references.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">New References</h3>
                    {references.map((file: File, index: number) => (
                      <div key={`new-${index}`} className="flex items-center justify-between py-2 px-3 border border-border rounded-md">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => {
                            setReferences(references.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="flex justify-end">
                      <Button 
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          if (references.length > 0) {
                            uploadReferences.mutate(references);
                          }
                        }}
                        disabled={uploadReferences.isPending}
                      >
                        {uploadReferences.isPending ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                  </div>
                ) : savedReferences.length === 0 && (
                  <div 
                    className="text-center py-6 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <div className="mx-auto h-10 w-10 rounded-full bg-accent flex items-center justify-center mb-3">
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-md font-medium mb-1">No reference files</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-2">
                      Click to upload reference files (glossaries, style guides, etc.)
                    </p>
                  </div>
                )}
                
                {/* Add more references button when there are already references */}
                {(savedReferences.length > 0 && references.length === 0) && (
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="h-4 w-4" />
                    Add References
                  </Button>
                )}
                
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const newFiles = Array.from(e.target.files);
                      setReferences([...references, ...newFiles]);
                      
                      // Reset input field after selection
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }
                  }}
                  multiple
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Notes Section */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                Notes
              </CardTitle>
              <CardDescription>
                Record notes or instructions for this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Document translation guidelines, special requirements, terminology instructions..."
                className="min-h-24"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </CardContent>
            <CardFooter className="justify-end">
              <Button 
                variant="outline"
                className="gap-2"
                onClick={() => saveNotes.mutate()}
                disabled={saveNotes.isPending}
              >
                {saveNotes.isPending ? "Saving..." : "Save"}
              </Button>
            </CardFooter>
          </Card>

          {/* File list */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                Files
              </CardTitle>
              <CardDescription>
                Files for translation (cannot be modified after project creation)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workFiles && workFiles.length > 0 ? (
                <div className="space-y-2">
                  {workFiles.map((file: FileType) => {
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
                    Files must be added during project creation. Per the file management policy, projects without files cannot be created, and files cannot be added or modified after creation.
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
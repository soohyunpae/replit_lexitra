import React, { useState, useMemo, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  CardTitle, 
  CardFooter
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, File, FileText, Paperclip, PlusCircle } from "lucide-react";
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
  
  // 참조 파일과 노트 상태 관리
  const [note, setNote] = useState("");
  const [references, setReferences] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
              
              {/* 릴리스 확인 다이얼로그 */}
              <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>프로젝트 릴리스 확인</DialogTitle>
                    <DialogDescription>
                      프로젝트를 릴리스하면 다른 사용자들이 프로젝트를 클레임할 수 있게 됩니다. 정말 프로젝트를 릴리스하시겠습니까?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>취소</Button>
                    <Button 
                      variant="default" 
                      className="border-yellow-500 bg-yellow-500 hover:bg-yellow-600"
                      onClick={() => {
                        setShowReleaseDialog(false);
                        releaseProject.mutate();
                      }}
                    >
                      릴리스
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* 완료 확인 다이얼로그 */}
              <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>프로젝트 완료 확인</DialogTitle>
                    <DialogDescription>
                      프로젝트를 완료로 표시하시겠습니까? 완료된 프로젝트는 더 이상 편집할 수 없습니다.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>취소</Button>
                    <Button 
                      variant="default" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setShowCompleteDialog(false);
                        completeProject.mutate();
                      }}
                    >
                      완료
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* 재개 확인 다이얼로그 */}
              <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>프로젝트 재개 확인</DialogTitle>
                    <DialogDescription>
                      완료된 프로젝트를 다시 작업 중 상태로 변경하시겠습니까?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowReopenDialog(false)}>취소</Button>
                    <Button 
                      variant="default" 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setShowReopenDialog(false);
                        reopenProject.mutate();
                      }}
                    >
                      재개
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
          
          {/* Download button */}
          <div className="flex gap-2 mb-6 justify-end">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download All
            </Button>
          </div>
          
          {/* References 섹션 */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                References
              </CardTitle>
              <CardDescription>
                번역 작업에 도움이 되는 참조 문서를 업로드하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                {references.length > 0 ? (
                  <div className="space-y-2">
                    {references.map((file, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 border border-border rounded-md">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => {
                            setReferences(references.filter((_, i) => i !== index));
                          }}
                        >
                          <File className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-border rounded-lg">
                    <div className="mx-auto h-10 w-10 rounded-full bg-accent flex items-center justify-center mb-3">
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-md font-medium mb-1">참조 파일이 없습니다</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                      번역을 도울 참조 파일을 업로드하세요. 용어집, 스타일 가이드, 이전 번역 등 유용한 자료를 첨부할 수 있습니다.
                    </p>
                  </div>
                )}
                
                <div className="flex justify-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const newFiles = Array.from(e.target.files);
                        setReferences([...references, ...newFiles]);
                        
                        // 파일 선택 후 input 초기화
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                        
                        toast({
                          title: "참조 파일 추가됨",
                          description: `${newFiles.length}개의 파일이 추가되었습니다.`,
                        });
                      }
                    }}
                    multiple
                  />
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <PlusCircle className="h-4 w-4" />
                    참조 파일 추가
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Notes 섹션 */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                Notes
              </CardTitle>
              <CardDescription>
                프로젝트에 대한 메모나 지침을 기록하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="번역 시 주의사항, 특별한 요구 사항, 용어 사용 지침 등을 기록하세요..."
                className="min-h-24"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </CardContent>
            <CardFooter className="justify-end">
              <Button 
                variant="outline"
                className="gap-2"
                onClick={() => {
                  toast({
                    title: "노트가 저장되었습니다",
                    description: "프로젝트 노트가 성공적으로 저장되었습니다."
                  });
                }}
              >
                노트 저장
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
                    Create a new project to upload files. You can paste text directly or upload a file during the project creation process.
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
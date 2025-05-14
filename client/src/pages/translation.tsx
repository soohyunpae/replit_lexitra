import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { NewTranslationEditor } from "@/components/translation/new-translation-editor";
import { DocReviewEditor } from "@/components/translation/doc-review-editor";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TranslationUnit, Project, File, Glossary } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileX, AlertTriangle, LayoutTemplate, Blocks } from "lucide-react";

// Extended File type with segments for the translation interface
interface ExtendedFile extends File {
  segments?: TranslationUnit[];
}

export default function Translation() {
  const [isMatch, params] = useRoute("/translation/:fileId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedSegment, setSelectedSegment] = useState<TranslationUnit | null>(null);
  const [tmMatches, setTmMatches] = useState([]);
  const [accessError, setAccessError] = useState<string | null>(null);
  
  // Get file ID from URL params
  const fileId = isMatch && params ? parseInt(params.fileId) : null;
  
  // Initial empty data with correct type shape to avoid TypeScript errors
  const emptyFile: ExtendedFile = {
    id: 0,
    name: '',
    content: '',
    projectId: 0,
    createdAt: '',
    updatedAt: '',
    segments: []
  };

  const emptyProject: Project = {
    id: 0,
    name: '',
    sourceLanguage: '',
    targetLanguage: '',
    createdAt: '',
    updatedAt: ''
  };

  // Fetch file data
  const { 
    data: file = emptyFile,
    isLoading: isFileLoading 
  } = useQuery<ExtendedFile>({
    queryKey: [`/api/files/${fileId}`],
    enabled: !!fileId,
  });
  
  // Log file data for debugging
  useEffect(() => {
    if (file && file !== emptyFile) {
      console.log('File data loaded successfully:', {
        fileId,
        fileName: file.name,
        hasSegments: !!file.segments,
        segmentsCount: file.segments?.length || 0,
        segmentSample: file.segments && file.segments.length > 0 ? file.segments[0] : null
      });
    }
  }, [file, fileId]);
  
  // Fetch project data for the file
  const {
    data: project = emptyProject,
    isLoading: isProjectLoading
  } = useQuery<Project>({
    queryKey: [`/api/projects/${file?.projectId}`],
    enabled: !!file?.projectId,
  });
  
  // Fetch glossary terms
  const {
    data: glossaryTerms = [] as Glossary[],
    isLoading: isGlossaryLoading
  } = useQuery<Glossary[]>({
    queryKey: [
      `/api/glossary?sourceLanguage=${project?.sourceLanguage}&targetLanguage=${project?.targetLanguage}`
    ],
    enabled: !!(project?.sourceLanguage && project?.targetLanguage),
  });
  
  // Search TM for selected segment
  const searchTM = async (source: string) => {
    if (!project?.sourceLanguage || !project?.targetLanguage) return;
    
    try {
      const response = await apiRequest(
        "POST", 
        "/api/search_tm", 
        {
          source,
          sourceLanguage: project.sourceLanguage,
          targetLanguage: project.targetLanguage,
          limit: 5
        }
      );
      
      const data = await response.json();
      setTmMatches(data);
      return data;
    } catch (error) {
      console.error("Error searching TM:", error);
      return [];
    }
  };
  
  // Save project mutation
  const saveProject = useMutation({
    mutationFn: async () => {
      // This would normally save the project's state
      // Since we're already saving segments individually, we'll just
      // simulate a save operation for now
      return new Promise(resolve => setTimeout(resolve, 500));
    },
    onSuccess: () => {
      toast({
        title: "Project saved",
        description: "All translations have been saved successfully.",
      });
    },
  });
  
  // Export project mutation
  const exportProject = useMutation({
    mutationFn: async () => {
      // This would normally export the project to a file
      // For now, we'll just simulate the export operation
      return new Promise(resolve => setTimeout(resolve, 500));
    },
    onSuccess: () => {
      toast({
        title: "Export complete",
        description: "Project has been exported successfully.",
      });
    },
  });
  
  // Refresh segments when page loads
  useEffect(() => {
    if (fileId) {
      // Invalidate and refetch file data to get the latest segments
      queryClient.invalidateQueries({
        queryKey: [`/api/files/${fileId}`],
      });
    }
  }, [fileId]);
  
  // Auto-translation on file load
  const [autoTranslationDone, setAutoTranslationDone] = useState(false);
  
  useEffect(() => {
    const performAutoTranslation = async () => {
      if (!file || !file.segments || file.segments.length === 0 || !project || autoTranslationDone) {
        return;
      }
      
      const untranslatedSegments = file.segments.filter(s => !s.target || s.target.trim() === "");
      if (untranslatedSegments.length === 0) {
        setAutoTranslationDone(true);
        return;
      }
      
      toast({
        title: "Auto-translation",
        description: `Applying TM matches and machine translation to ${untranslatedSegments.length} segments...`,
      });
      
      // Create a copy of all segments
      const updatedSegments = [...file.segments];
      
      // Process each untranslated segment
      for (const segment of untranslatedSegments) {
        try {
          // First check TM for matches
          const tmResponse = await apiRequest(
            "POST", 
            "/api/search_tm", 
            {
              source: segment.source,
              sourceLanguage: project.sourceLanguage,
              targetLanguage: project.targetLanguage,
              limit: 1 // Just need the best match
            }
          );
          
          const tmMatches = await tmResponse.json();
          let targetText = "";
          let status = "Draft";
          let origin = "";
          
          // If we have a 100% match from TM
          if (tmMatches && tmMatches.length > 0 && tmMatches[0].similarity === 1) {
            targetText = tmMatches[0].target;
            origin = "100%";
          } 
          // If we have a fuzzy match from TM (similarity > 0.7)
          else if (tmMatches && tmMatches.length > 0 && tmMatches[0].similarity > 0.7) {
            targetText = tmMatches[0].target;
            origin = "Fuzzy";
          }
          // No good TM match, try GPT
          else {
            // Translate with GPT
            const response = await apiRequest(
              "POST", 
              "/api/translate", 
              {
                source: segment.source,
                sourceLanguage: project.sourceLanguage,
                targetLanguage: project.targetLanguage
              }
            );
            
            const data = await response.json();
            if (data.target) {
              targetText = data.target;
              origin = "MT";
            }
          }
          
          // If we have a translation, update the segment
          if (targetText) {
            await apiRequest(
              "PATCH", 
              `/api/segments/${segment.id}`, 
              { target: targetText, status, origin }
            );
            
            // Update our local copy
            const index = updatedSegments.findIndex(s => s.id === segment.id);
            if (index !== -1) {
              updatedSegments[index] = {
                ...updatedSegments[index],
                target: targetText,
                status,
                origin
              };
            }
          }
        } catch (error) {
          console.error(`Error auto-translating segment ${segment.id}:`, error);
          // Continue with next segment even if one fails
        }
      }
      
      // Refresh data after processing all segments
      queryClient.invalidateQueries({
        queryKey: [`/api/files/${fileId}`],
      });
      
      setAutoTranslationDone(true);
      toast({
        title: "Auto-translation complete",
        description: `Applied translations to ${untranslatedSegments.length} segments`,
      });
    };
    
    performAutoTranslation();
  }, [file, project, fileId, autoTranslationDone, toast]);

  // Handle segment selection
  useEffect(() => {
    if (selectedSegment) {
      searchTM(selectedSegment.source);
    }
  }, [selectedSegment]);
  
  // Auto-select first segment when file loads
  useEffect(() => {
    if (file && file.segments && file.segments.length > 0 && !selectedSegment) {
      // Select the first segment automatically
      setSelectedSegment(file.segments[0]);
      // Log that we've auto-selected the first segment
      console.log('Auto-selected first segment:', file.segments[0].id);
    }
  }, [file, selectedSegment]);
  
  // Check editor access permissions
  useEffect(() => {
    if (!user) {
      setAccessError("You must be logged in to access the editor");
      return;
    }
    
    if (project && project.id > 0) {
      // Check project status and claimedBy property
      if (project.status === 'Unclaimed') {
        setAccessError("This project must be claimed before accessing the editor");
        return;
      }
      
      // If project is claimed by another user and current user is not admin
      if (project.status === 'Claimed' && project.claimedBy !== user.id && user.role !== 'admin') {
        setAccessError(`This project is claimed by another user (${project.claimer?.username || 'User #' + project.claimedBy})`);
        return;
      }
      
      // Clear any access errors if all checks pass
      setAccessError(null);
    }
  }, [project, user]);
  
  // Create a blank loader state while data is loading
  if (isFileLoading || isProjectLoading) {
    return (
      <MainLayout title="Loading...">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="h-8 w-40 bg-accent rounded-full mx-auto mb-4"></div>
            <div className="h-4 w-60 bg-accent rounded-full mx-auto"></div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // If file or project wasn't found
  if (!file || !project) {
    return (
      <MainLayout title="File Not Found">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-medium mb-2">File not found</h2>
            <p className="text-muted-foreground">
              The translation file you're looking for doesn't exist or you don't have access to it.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // If access error exists, show error UI
  if (accessError) {
    return (
      <MainLayout title="Access Denied">
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-center">Access Denied</CardTitle>
              <CardDescription className="text-center">{accessError}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <p className="text-muted-foreground text-center text-sm">
                  You don't have permission to access this editor. Only the user who has claimed the project or an admin can access the translation editor.
                </p>
                <Button 
                  onClick={() => setLocation(`/project/${project.id}`)}
                  className="w-full"
                >
                  Go Back to Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }
  
  // editor mode state
  const [editorMode, setEditorMode] = useState<'segment' | 'doc'>('segment');
  
  // Initialize editor mode from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode');
      if (modeParam === 'segment' || modeParam === 'doc') {
        setEditorMode(modeParam);
      }
    }
  }, []);
  
  // Update URL when mode changes
  const updateUrlMode = (mode: 'segment' | 'doc') => {
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('mode', mode);
      window.history.replaceState({}, '', currentUrl.toString());
    }
  };
  
  // Handle mode change
  const handleModeChange = (mode: 'segment' | 'doc') => {
    setEditorMode(mode);
    updateUrlMode(mode);
  };
  
  return (
    <MainLayout title={`Translating: ${file.name}`}>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="border-b bg-card px-4 py-2">
          <Tabs 
            value={editorMode} 
            onValueChange={(value) => handleModeChange(value as 'segment' | 'doc')}
            className="w-full"
          >
            <div className="flex items-center justify-between">
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="segment" className="flex items-center gap-2">
                  <Blocks className="h-4 w-4" />
                  <span>Segment Editor</span>
                </TabsTrigger>
                <TabsTrigger value="doc" className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4" />
                  <span>Document View</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="text-sm text-muted-foreground">
                {project.sourceLanguage} → {project.targetLanguage}
              </div>
            </div>
          </Tabs>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {editorMode === 'segment' ? (
            <NewTranslationEditor
              fileName={file.name}
              sourceLanguage={project.sourceLanguage}
              targetLanguage={project.targetLanguage}
              segments={(file as ExtendedFile).segments || []}
              onSave={() => saveProject.mutate()}
              onExport={() => exportProject.mutate()}
            />
          ) : (
            <DocReviewEditor
              fileName={file.name}
              sourceLanguage={project.sourceLanguage}
              targetLanguage={project.targetLanguage}
              segments={(file as ExtendedFile).segments || []}
              onSave={() => saveProject.mutate()}
              onExport={() => exportProject.mutate()}
              fileId={fileId || 0}
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}

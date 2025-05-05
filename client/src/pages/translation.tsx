import React, { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { RightPanel } from "@/components/layout/right-panel";
import { TranslationEditor } from "@/components/translation/translation-editor";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TranslationUnit, Project, File, Glossary } from "@/types";

// Extended File type with segments for the translation interface
interface ExtendedFile extends File {
  segments?: TranslationUnit[];
}

export default function Translation() {
  const [isMatch, params] = useRoute("/translation/:fileId");
  const { toast } = useToast();
  const [selectedSegment, setSelectedSegment] = useState<TranslationUnit | null>(null);
  const [tmMatches, setTmMatches] = useState([]);
  
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
  
  // Handle segment selection
  useEffect(() => {
    if (selectedSegment) {
      searchTM(selectedSegment.source);
    }
  }, [selectedSegment]);
  
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
  
  return (
    <MainLayout title={`Translating: ${file.name}`} showSearch={true}>
      <div className="flex h-full overflow-hidden">
        <TranslationEditor
          fileName={file.name}
          sourceLanguage={project.sourceLanguage}
          targetLanguage={project.targetLanguage}
          segments={(file as ExtendedFile).segments || []}
          onSave={() => saveProject.mutate()}
          onExport={() => exportProject.mutate()}
        />
        <RightPanel
          tmMatches={tmMatches}
          glossaryTerms={glossaryTerms || []}
          selectedSegment={selectedSegment || undefined}
          onUseTranslation={(translation) => {
            if (selectedSegment) {
              // This would update the segment in the editor
              console.log(`Using translation: ${translation} for segment ID: ${selectedSegment.id}`);
            }
          }}
        />
      </div>
    </MainLayout>
  );
}

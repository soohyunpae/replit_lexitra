import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
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
  Plus,
  Save,
  Trash2,
  Search,
  FileText,
  Book,
  BookMarked,
  Upload,
  ChevronRight,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

// Form schema for adding/editing glossary terms
const glossaryFormSchema = z.object({
  source: z.string().min(1, { message: "Source term is required" }),
  target: z.string().min(1, { message: "Target term is required" }),
  sourceLanguage: z.string().min(1, { message: "Source language is required" }),
  targetLanguage: z.string().min(1, { message: "Target language is required" }),
  resourceId: z.number().optional(),
});

// Form schema for adding new glossary resource
const glossaryResourceFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().optional(),
  defaultSourceLanguage: z.string().min(2, { message: "Source language is required" }),
  defaultTargetLanguage: z.string().min(2, { message: "Target language is required" }),
  domain: z.string().optional(),
  isActive: z.boolean().default(true),
});

type GlossaryFormValues = z.infer<typeof glossaryFormSchema>;
type GlossaryResourceFormValues = z.infer<typeof glossaryResourceFormSchema>;

export default function UnifiedGlossaryPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState<string>("all_source_languages");
  const [targetLanguageFilter, setTargetLanguageFilter] = useState<string>("all_target_languages");
  const [resourceFilter, setResourceFilter] = useState<number | undefined>(undefined);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Initialize filteredGlossary
  const { data: glossaryData = [] } = useQuery({
    queryKey: ["/api/glossary/all", resourceFilter],
    queryFn: async () => {
      try {
        let url = "/api/glossary/all";
        if (resourceFilter) {
          url += `?resourceId=${resourceFilter}`;
        }
        const res = await apiRequest("GET", url);
        return res.json();
      } catch (error) {
        console.error("Error fetching glossary terms:", error);
        return [];
      }
    },
  });

  const filteredGlossary = React.useMemo(() => {
    return glossaryData.filter((term: any) => {
      const matchesSearch = searchQuery
        ? term.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
          term.target.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      const matchesSourceLang =
        sourceLanguageFilter && sourceLanguageFilter !== "all_source_languages"
          ? term.sourceLanguage === sourceLanguageFilter
          : true;

      const matchesTargetLang =
        targetLanguageFilter && targetLanguageFilter !== "all_target_languages"
          ? term.targetLanguage === targetLanguageFilter
          : true;

      const matchesResource = 
        resourceFilter !== undefined
          ? term.resourceId === resourceFilter
          : true;

      return matchesSearch && matchesSourceLang && matchesTargetLang && matchesResource;
    });
  }, [glossaryData, searchQuery, sourceLanguageFilter, targetLanguageFilter, resourceFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sourceLanguageFilter, targetLanguageFilter, resourceFilter]);

  const totalPages = Math.ceil(filteredGlossary.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredGlossary.slice(startIndex, endIndex);

  // Dialog states
  const [addTermDialogOpen, setAddTermDialogOpen] = useState(false);
  const [addResourceDialogOpen, setAddResourceDialogOpen] = useState(false);

  // Glossary term form setup
  const termForm = useForm<GlossaryFormValues>({
    resolver: zodResolver(glossaryFormSchema),
    defaultValues: {
      source: "",
      target: "",
      sourceLanguage: "",
      targetLanguage: "",
      resourceId: undefined,
    },
  });

  // Glossary resource form setup
  const resourceForm = useForm<GlossaryResourceFormValues>({
    resolver: zodResolver(glossaryResourceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultSourceLanguage: "",
      defaultTargetLanguage: "",
      domain: "",
      isActive: true,
    },
  });

  // Get all glossary terms
  const {
    data: glossaryData,
    isLoading: isLoadingTerms,
    error: termsError,
  } = useQuery({
    queryKey: ["/api/glossary/all", resourceFilter],
    queryFn: async () => {
      try {
        let url = "/api/glossary/all";
        if (resourceFilter) {
          url += `?resourceId=${resourceFilter}`;
        }
        const res = await apiRequest("GET", url);
        return res.json();
      } catch (error) {
        console.error("Error fetching glossary terms:", error);
        return [];
      }
    },
  });

  // Get glossary resources
  const { 
    data: glossaryResources = [], 
    isLoading: isLoadingResources,
    error: resourcesError,
  } = useQuery({
    queryKey: ["/api/glossary/resources"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/glossary/resources");
        return res.json();
      } catch (error) {
        console.error("Error fetching glossary resources:", error);
        return [];
      }
    },
  });

  // Get unique languages from glossary data
  const languages = React.useMemo(() => {
    if (!glossaryData) return { source: [], target: [] };

    // Get unique source languages
    const sourceLanguagesSet = new Set<string>();
    glossaryData.forEach((item: any) =>
      sourceLanguagesSet.add(item.sourceLanguage),
    );
    const sourceLanguages = Array.from(sourceLanguagesSet);

    // Get unique target languages
    const targetLanguagesSet = new Set<string>();
    glossaryData.forEach((item: any) =>
      targetLanguagesSet.add(item.targetLanguage),
    );
    const targetLanguages = Array.from(targetLanguagesSet);

    return {
      source: sourceLanguages,
      target: targetLanguages,
    };
  }, [glossaryData]);

  // The filtered glossary is already declared above

  // Add new glossary term
  const addGlossaryMutation = useMutation({
    mutationFn: async (data: GlossaryFormValues) => {
      const response = await apiRequest("POST", "/api/glossary", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/glossary/all"] });
      termForm.reset();
      setAddTermDialogOpen(false);
      toast({
        title: "Term added",
        description: "The term has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add term",
        variant: "destructive",
      });
    },
  });

  // Add new glossary resource
  const addResourceMutation = useMutation({
    mutationFn: async (data: GlossaryResourceFormValues) => {
      const response = await apiRequest("POST", "/api/glossary/resource", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/glossary/resources"] });
      resourceForm.reset();
      setAddResourceDialogOpen(false);
      toast({
        title: t('glossaries.resourceAdded'),
        description: t('glossaries.resourceAddedSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('glossaries.failedToAddResource'),
        variant: "destructive",
      });
    },
  });

  // Delete glossary term
  const deleteGlossaryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/glossary/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/glossary/all"] });
      toast({
        title: t('glossaries.termDeleted'),
        description: t('glossaries.termDeletedSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('glossaries.failedToDeleteTerm'),
        variant: "destructive",
      });
    },
  });

  // Delete glossary resource
  const deleteResourceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/glossary/resource/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/glossary/resources"] });
      toast({
        title: t('glossaries.resourceDeleted'),
        description: t('glossaries.resourceDeletedSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('glossaries.failedToDeleteResource'),
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  function onSubmitTerm(data: GlossaryFormValues) {
    addGlossaryMutation.mutate(data);
  }

  function onSubmitResource(data: GlossaryResourceFormValues) {
    addResourceMutation.mutate(data);
  }

  function handleDeleteTerm(id: number) {
    if (window.confirm(t('glossaries.deleteConfirmation'))) {
      deleteGlossaryMutation.mutate(id);
    }
  }

  function handleDeleteResource(id: number) {
    if (window.confirm(t('glossaries.resourceDeleteConfirmation', "Are you sure you want to delete this glossary resource? This will also delete all terms associated with this resource."))) {
      deleteResourceMutation.mutate(id);
    }
  }

  // Handle file upload for glossary
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      try {
        // Add source and target language to formData if not present
        if (!formData.has('sourceLanguage')) {
          formData.append('sourceLanguage', 'ko');
        }
        if (!formData.has('targetLanguage')) {
          formData.append('targetLanguage', 'en');
        }

        // Use the admin route for glossary file upload
        const response = await apiRequest("POST", "/api/admin/tb/upload", formData, {
          // Let the browser set the content type with proper boundary for FormData
        });

        // Handle any errors that might not throw exceptions
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload glossary file');
        }

        return await response.json();
      } catch (err: any) {
        console.error("File upload error:", err);
        setIsUploading(false);
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/glossary/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/glossary/resources"] });
      toast({
        title: t('glossaries.fileUploaded', "File uploaded"),
        description: t('glossaries.fileUploadedSuccess', "The glossary file has been uploaded and processed successfully.") + ` ${data.message || ''}`,
      });
      setIsUploading(false);

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: t('glossaries.uploadFailed', "Upload failed"),
        description: error.message || t('glossaries.failedToUploadFile', "Failed to upload glossary file. Please check the file format."),
        variant: "destructive",
      });
      setIsUploading(false);

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
  });

  return (
    <MainLayout title={t('common.glossaries')}>
      <div className="container max-w-screen-xl mx-auto p-6">
        {/* No breadcrumb - already in header */}

        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <BookMarked className="h-5 w-5" />
            <h2 className="text-3xl font-bold tracking-tight">{t('common.glossary')}</h2>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const formData = new FormData();
                    formData.append('file', file);
                    uploadFileMutation.mutate(formData);
                  }
                }}
                className="hidden"
                accept=".xlsx,.xls,.csv,.tmx,.tbx"
              />
              <Dialog open={addTermDialogOpen} onOpenChange={setAddTermDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('glossaries.addTerm')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('glossaries.addNewTerm')}</DialogTitle>
                    <DialogDescription>
                      {t('glossaries.addNewTermDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...termForm}>
                    <form onSubmit={termForm.handleSubmit(onSubmitTerm)} className="space-y-4">
                      <FormField
                        control={termForm.control}
                        name="sourceLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('glossaries.sourceLanguage')}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('glossaries.selectSourceLanguage')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="ko">Korean</SelectItem>
                                <SelectItem value="ja">Japanese</SelectItem>
                                <SelectItem value="zh">Chinese</SelectItem>
                                <SelectItem value="es">Spanish</SelectItem>
                                <SelectItem value="fr">French</SelectItem>
                                <SelectItem value="de">German</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={termForm.control}
                        name="targetLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('glossaries.targetLanguage')}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('glossaries.selectTargetLanguage')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="ko">Korean</SelectItem>
                                <SelectItem value="ja">Japanese</SelectItem>
                                <SelectItem value="zh">Chinese</SelectItem>
                                <SelectItem value="es">Spanish</SelectItem>
                                <SelectItem value="fr">French</SelectItem>
                                <SelectItem value="de">German</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={termForm.control}
                        name="resourceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Glossary</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(
                                  value === "none" ? undefined : parseInt(value),
                                );
                              }}
                              defaultValue={field.value?.toString() || "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('glossaries.selectGlossary', 'Select Glossary')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">{t('glossaries.noGlossary', 'No glossary')}</SelectItem>
                                {glossaryResources.map((resource: any) => (
                                  <SelectItem
                                    key={resource.id}
                                    value={resource.id.toString()}
                                  >
                                    {resource.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={termForm.control}
                        name="source"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('glossaries.sourceText')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('glossaries.enterSourceTerm', 'Enter source term')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={termForm.control}
                        name="target"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('glossaries.targetText')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('glossaries.enterTargetTerm', 'Enter target term')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={addGlossaryMutation.isPending}
                        >
                          {addGlossaryMutation.isPending ? "Adding..." : "Add Term"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('glossaries.importGlossary')}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        <p className="text-muted-foreground mb-6">
          {t('glossaries.searchAndManage', 'Search and manage glossary terms and resources')}
        </p>

        {/* Glossary List Section - Now moved to the top */}
        <div className="bg-card border rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <BookMarked className="h-5 w-5" />
              <h3 className="text-xl font-semibold">{t('glossaries.list')}</h3>
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('glossaries.glossaryName')}</TableHead>
                  <TableHead>{t('glossaries.glossaryDescription')}</TableHead>
                  <TableHead>{t('glossaries.defaultLanguages', 'Default Languages')}</TableHead>
                  <TableHead>{t('glossaries.domain', 'Domain')}</TableHead>
                  <TableHead>{t('glossaries.terms', 'Terms')}</TableHead>
                  {isAdmin && <TableHead className="text-right">{t('common.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingResources ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      {t('common.loading')}...
                    </TableCell>
                  </TableRow>
                ) : glossaryResources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      {t('glossaries.noGlossaries')}
                    </TableCell>
                  </TableRow>
                ) : (
                  glossaryResources.map((resource: any) => (
                    <TableRow 
                      key={resource.id} 
                      className={`cursor-pointer hover:bg-muted/50 ${resourceFilter === resource.id ? 'bg-muted/70' : ''}`}
                      onClick={() => setResourceFilter(resource.id)}
                    >
                      <TableCell className="font-medium">{resource.name}</TableCell>
                      <TableCell>{resource.description || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 bg-accent/50 px-2 py-0.5 rounded-full text-xs">
                          <span className="font-medium">
                            {resource.defaultSourceLanguage.toUpperCase()}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium">
                            {resource.defaultTargetLanguage.toUpperCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{resource.domain || "—"}</TableCell>
                      <TableCell>
                        {glossaryData
                          ? glossaryData.filter((term: any) => term.resourceId === resource.id).length
                          : 0}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteResource(resource.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Search Section - Now moved below Glossary List */}
        <div className="bg-card border rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              <h3 className="text-xl font-semibold">{t('glossaries.searchTerms')}</h3>

              {resourceFilter !== undefined && (
                <Badge 
                  variant="secondary" 
                  className="ml-3 py-1 px-3 cursor-pointer hover:bg-muted/70 flex items-center gap-1"
                  onClick={() => setResourceFilter(undefined)}
                >
                  {glossaryResources.find((r: any) => r.id === resourceFilter)?.name}
                  <X className="h-3.5 w-3.5 ml-1" />
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('glossaries.searchTermsPlaceholder', 'Search glossary terms...')}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('glossaries.sourceText')}</TableHead>
                  <TableHead>{t('glossaries.targetText')}</TableHead>
                  <TableHead>{t('common.language')}</TableHead>
                  <TableHead>{t('glossaries.glossaryName')}</TableHead>
                  <TableHead>{t('glossaries.added')}</TableHead>
                  {isAdmin && <TableHead className="text-right">{t('common.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTerms ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      Loading glossary terms...
                    </TableCell>
                  </TableRow>
                ) : filteredGlossary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      No glossary terms found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((term: any) => (
                    <TableRow key={term.id}>
                      <TableCell className="font-medium">{term.source}</TableCell>
                      <TableCell>{term.target}</TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1 bg-accent/50 px-2 py-0.5 rounded-full text-xs">
                          <span className="font-medium">
                            {term.sourceLanguage.toUpperCase()}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium">
                            {term.targetLanguage.toUpperCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {term.resourceId ? (
                          glossaryResources.find((r: any) => r.id === term.resourceId)?.name || "Unknown"
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(term.createdAt)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTerm(term.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {filteredGlossary.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                {t('common.showing', {
                  start: Math.min((currentPage - 1) * itemsPerPage + 1, filteredGlossary.length),
                  end: Math.min(currentPage * itemsPerPage, filteredGlossary.length),
                  total: filteredGlossary.length
                })}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  {t('common.previous')}
                </Button>
                <div className="text-sm mx-4">
                  {t('common.page', { current: currentPage, total: totalPages })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}

          {/* No admin actions here - already in header */}
        </div>


      </div>
    </MainLayout>
  );
}
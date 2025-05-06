import React, { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Save, Trash2, Search, Database, FileText, Tag, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatDate } from "@/lib/utils";

// Form schema for adding/editing glossary terms
const glossaryFormSchema = z.object({
  source: z.string().min(1, { message: "Source term is required" }),
  target: z.string().min(1, { message: "Target term is required" }),
  sourceLanguage: z.string().min(1, { message: "Source language is required" }),
  targetLanguage: z.string().min(1, { message: "Target language is required" }),
  resourceId: z.number().optional(),
});

type GlossaryFormValues = z.infer<typeof glossaryFormSchema>;

const tbResourceFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().optional(),
  defaultSourceLanguage: z.string().min(2),
  defaultTargetLanguage: z.string().min(2),
  domain: z.string().optional(),
  isActive: z.boolean().default(true),
});

type TbResourceFormValues = z.infer<typeof tbResourceFormSchema>;

export default function GlossaryPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState<string>("all_source_languages");
  const [targetLanguageFilter, setTargetLanguageFilter] = useState<string>("all_target_languages");
  const [resourceFilter, setResourceFilter] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = React.useState<string>("entries");
  const [selectedResourceId, setSelectedResourceId] = React.useState<string>("all_resources");
  const [showResourceDialog, setShowResourceDialog] = React.useState<boolean>(false);

  // Glossary form setup
  const form = useForm<GlossaryFormValues>({
    resolver: zodResolver(glossaryFormSchema),
    defaultValues: {
      source: "",
      target: "",
      sourceLanguage: "",
      targetLanguage: "",
      resourceId: undefined,
    },
  });

  // TB Resource form setup
  const resourceForm = useForm<TbResourceFormValues>({
    resolver: zodResolver(tbResourceFormSchema),
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
  const { data: glossaryData, isLoading, error } = useQuery({
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
        return []; // 오류 발생 시 빈 배열 반환
      }
    },
  });

  // Get TB resources
  const { data: tbResources = [] } = useQuery({
    queryKey: ["/api/glossary/resources"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/glossary/resources");
        return res.json();
      } catch (error) {
        console.error("Error fetching TB resources:", error);
        return [];
      }
    },
  });

  // Get unique languages from glossary data
  const languages = React.useMemo(() => {
    if (!glossaryData) return { source: [], target: [] };

    // Get unique source languages
    const sourceLanguagesSet = new Set<string>();
    glossaryData.forEach((item: any) => sourceLanguagesSet.add(item.sourceLanguage));
    const sourceLanguages = Array.from(sourceLanguagesSet);

    // Get unique target languages
    const targetLanguagesSet = new Set<string>();
    glossaryData.forEach((item: any) => targetLanguagesSet.add(item.targetLanguage));
    const targetLanguages = Array.from(targetLanguagesSet);

    return {
      source: sourceLanguages,
      target: targetLanguages,
    };
  }, [glossaryData]);

  // Filtered glossary terms
  const filteredGlossary = React.useMemo(() => {
    if (!glossaryData) return [];

    return glossaryData.filter((term: any) => {
      const matchesSearch = searchQuery
        ? term.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
          term.target.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      const matchesSourceLang = sourceLanguageFilter && sourceLanguageFilter !== "all_source_languages"
        ? term.sourceLanguage === sourceLanguageFilter
        : true;

      const matchesTargetLang = targetLanguageFilter && targetLanguageFilter !== "all_target_languages"
        ? term.targetLanguage === targetLanguageFilter
        : true;

      return matchesSearch && matchesSourceLang && matchesTargetLang;
    });
  }, [glossaryData, searchQuery, sourceLanguageFilter, targetLanguageFilter]);

  // Add new glossary term
  const addGlossaryMutation = useMutation({
    mutationFn: async (data: GlossaryFormValues) => {
      const response = await apiRequest("POST", "/api/glossary", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/glossary/all"] });
      form.reset();
      toast({
        title: "Term added",
        description: "The terminology term has been added successfully.",
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

  // Delete glossary term
  const deleteGlossaryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/glossary/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/glossary/all"] });
      toast({
        title: "Term deleted",
        description: "The terminology term has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete term",
        variant: "destructive",
      });
    },
  });

  // Add TB resource mutation
  const addResourceMutation = useMutation({
    mutationFn: async (data: TbResourceFormValues) => {
      const response = await apiRequest("POST", "/api/glossary/resource", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/glossary/resources"] });
      resourceForm.reset();
      setShowResourceDialog(false);
      toast({
        title: "TB Resource added",
        description: "The terminology base resource has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add TB resource",
        variant: "destructive",
      });
    },
  });

  // Delete TB resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/glossary/resource/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/glossary/resources"] });
      toast({
        title: "Resource deleted",
        description: "The TB resource has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete resource",
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  function onSubmit(data: GlossaryFormValues) {
    addGlossaryMutation.mutate(data);
  }

  function onResourceSubmit(data: TbResourceFormValues) {
    addResourceMutation.mutate(data);
  }

  function handleDeleteTerm(id: number) {
    if (window.confirm("Are you sure you want to delete this term?")) {
      deleteGlossaryMutation.mutate(id);
    }
  }

  function handleDeleteResource(id: number) {
    if (window.confirm("Are you sure you want to delete this resource?")) {
      deleteResourceMutation.mutate(id);
    }
  }

  return (
    <MainLayout title="Terminology Base">
      <div className="container max-w-screen-xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-5 w-5" />
          <h2 className="text-3xl font-bold tracking-tight">Terminology Base</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          Manage terminology database and terms
        </p>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="entries" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Glossary Entries
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              TB Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Add Term Form */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Plus size={18} />
                  <h2 className="text-lg font-medium">Add New Term</h2>
                </div>
                <p className="text-muted-foreground mb-4">Add a new term to the terminology base</p>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                <SelectValue placeholder="Select source language" />
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
                                <SelectValue placeholder="Select target language" />
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
                      control={form.control}
                      name="resourceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TB Resource</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value === "none" ? undefined : Number(value))
                            }}
                            value={field.value ? String(field.value) : "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select TB resource" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {tbResources.map((resource: any) => (
                                <SelectItem key={resource.id} value={String(resource.id)}>
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
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source Term</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter source term" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="target"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Term</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter target term" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full mt-4"
                      disabled={addGlossaryMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Term
                    </Button>
                  </form>
                </Form>
              </div>

              {/* Glossary List */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-medium">Terminology Entries</h2>
                </div>
                <p className="text-muted-foreground mb-4">Manage your terminology entries</p>

                <div className="mt-4 space-y-4">
                  {/* Search and Filter */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search terms..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <Select
                      value={sourceLanguageFilter}
                      onValueChange={setSourceLanguageFilter}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Source language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_source_languages">All languages</SelectItem>
                        {languages.source.map((lang) => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={targetLanguageFilter}
                      onValueChange={setTargetLanguageFilter}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Target language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_target_languages">All languages</SelectItem>
                        {languages.target.map((lang) => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={resourceFilter ? String(resourceFilter) : "all_resources"}
                      onValueChange={(value) => setResourceFilter(
                        value === "all_resources" ? undefined : Number(value)
                      )}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="TB Resource" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_resources">All resources</SelectItem>
                        {tbResources.map((resource: any) => (
                          <SelectItem key={resource.id} value={String(resource.id)}>{resource.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source Term</TableHead>
                        <TableHead>Target Term</TableHead>
                        <TableHead>Languages</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : filteredGlossary.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No terminology terms found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredGlossary.map((term: any) => (
                          <TableRow key={term.id}>
                            <TableCell className="font-medium">{term.source}</TableCell>
                            <TableCell>{term.target}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Source: {term.sourceLanguage}</span>
                                <span className="text-xs text-muted-foreground">Target: {term.targetLanguage}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(term.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTerm(term.id)}
                                className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resources" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Terminology Base Resources</h3>
              <Dialog open={showResourceDialog} onOpenChange={setShowResourceDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Add New Resource
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add New TB Resource</DialogTitle>
                    <DialogDescription>
                      Create a new terminology base resource for managing glossary entries.
                    </DialogDescription>
                  </DialogHeader>

                  {/* TB Resource Form */}
                  <Form {...resourceForm}>
                    <form onSubmit={resourceForm.handleSubmit(onResourceSubmit)} className="space-y-4 py-4">
                      <FormField
                        control={resourceForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Resource Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter TB resource name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={resourceForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={resourceForm.control}
                          name="defaultSourceLanguage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Default Source Language</FormLabel>
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
                                  <SelectItem value="en">English</SelectItem>
                                  <SelectItem value="ko">Korean</SelectItem>
                                  <SelectItem value="ja">Japanese</SelectItem>
                                  <SelectItem value="zh">Chinese</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={resourceForm.control}
                          name="defaultTargetLanguage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Default Target Language</FormLabel>
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
                                  <SelectItem value="en">English</SelectItem>
                                  <SelectItem value="ko">Korean</SelectItem>
                                  <SelectItem value="ja">Japanese</SelectItem>
                                  <SelectItem value="zh">Chinese</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={resourceForm.control}
                        name="domain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domain</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Technical, Legal, Medical" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setShowResourceDialog(false)} type="button">
                          Cancel
                        </Button>
                        <Button type="submit" disabled={addResourceMutation.isPending}>
                          <Save className="w-4 h-4 mr-2" /> Save Resource
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Languages</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tbResources.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No TB resources found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tbResources.map((resource: any) => (
                      <TableRow key={resource.id}>
                        <TableCell className="font-medium">{resource.name}</TableCell>
                        <TableCell>{resource.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span>Source: {resource.defaultSourceLanguage || 'Any'}</span>
                            <span>Target: {resource.defaultTargetLanguage || 'Any'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{resource.domain || 'General'}</TableCell>
                        <TableCell>
                          <Badge className={resource.isActive ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 hover:bg-gray-500"}>
                            {resource.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              onClick={() => handleDeleteResource(resource.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
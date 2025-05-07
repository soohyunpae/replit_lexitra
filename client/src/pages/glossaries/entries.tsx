import React, { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Link, useLocation } from "wouter";

// Form schema for adding/editing glossary terms
const glossaryFormSchema = z.object({
  source: z.string().min(1, { message: "Source term is required" }),
  target: z.string().min(1, { message: "Target term is required" }),
  sourceLanguage: z.string().min(1, { message: "Source language is required" }),
  targetLanguage: z.string().min(1, { message: "Target language is required" }),
  resourceId: z.number().optional(),
});

type GlossaryFormValues = z.infer<typeof glossaryFormSchema>;

export default function GlossaryEntriesPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("entries");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState<string>(
    "all_source_languages",
  );
  const [targetLanguageFilter, setTargetLanguageFilter] = useState<string>(
    "all_target_languages",
  );
  const [resourceFilter, setResourceFilter] = useState<number | undefined>(
    undefined,
  );

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

  // Get all glossary terms
  const {
    data: glossaryData,
    isLoading,
    error,
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
        return []; // 오류 발생 시 빈 배열 반환
      }
    },
  });

  // Get glossary resources
  const { data: glossaryResources = [] } = useQuery({
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

  // Filtered glossary terms
  const filteredGlossary = React.useMemo(() => {
    if (!glossaryData) return [];

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
        description: "The term has been deleted successfully.",
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

  // Form submission handlers
  function onSubmit(data: GlossaryFormValues) {
    addGlossaryMutation.mutate(data);
  }

  function handleDeleteTerm(id: number) {
    if (window.confirm("Are you sure you want to delete this term?")) {
      deleteGlossaryMutation.mutate(id);
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "resources") {
      navigate("/glossaries/resources");
    } else {
      navigate("/glossaries/entries");
    }
  };

  return (
    <MainLayout title="Glossary Entries">
      <div className="container max-w-screen-xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-2">
          <BookMarked className="h-5 w-5" />
          <h2 className="text-3xl font-bold tracking-tight">Glossaries</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          Manage glossary entries and terminology resources
        </p>
        <Tabs
          defaultValue="entries"
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="entries" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Glossary Entries
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <BookMarked className="h-4 w-4" />
              Glossary Resources
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Add Term Form */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Plus size={18} />
              <h2 className="text-lg font-medium">Add New Term</h2>
            </div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
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
                      <FormLabel>Glossary Resource</FormLabel>
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
                            <SelectValue placeholder="Select Glossary Resource" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No glossary resource</SelectItem>
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
                  className="w-full"
                  disabled={addGlossaryMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {addGlossaryMutation.isPending ? "Saving..." : "Save Term"}
                </Button>
              </form>
            </Form>
          </div>

          {/* Glossary Terms Display */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <FileText size={18} />
                <h2 className="text-lg font-medium">Entries List</h2>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-2 mb-4">
              <div className="relative flex-grow">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
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
                  <SelectValue placeholder="Source Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_source_languages">
                    All Source Languages
                  </SelectItem>
                  {languages.source.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={targetLanguageFilter}
                onValueChange={setTargetLanguageFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Target Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_target_languages">
                    All Target Languages
                  </SelectItem>
                  {languages.target.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={resourceFilter?.toString() || "all_resources"}
                onValueChange={(value) =>
                  setResourceFilter(
                    value === "all_resources" ? undefined : parseInt(value),
                  )
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Glossary Resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_resources">All Resources</SelectItem>
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
            </div>

            {/* Glossary Table */}
            {isLoading ? (
              <div className="flex justify-center p-8">
                <p>Loading glossary terms...</p>
              </div>
            ) : error ? (
              <div className="flex justify-center p-8">
                <p className="text-red-500">Error loading glossary terms</p>
              </div>
            ) : filteredGlossary.length === 0 ? (
              <div className="flex justify-center items-center p-8 border rounded-md">
                <p className="text-muted-foreground">No terms found.</p>
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[15%]">Source Lang</TableHead>
                      <TableHead className="w-[30%]">Source</TableHead>
                      <TableHead className="w-[15%]">Target Lang</TableHead>
                      <TableHead className="w-[30%]">Target</TableHead>
                      <TableHead className="w-[10%] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGlossary.map((term: any) => (
                      <TableRow key={term.id}>
                        <TableCell className="font-medium">
                          {term.sourceLanguage.toUpperCase()}
                        </TableCell>
                        <TableCell>{term.source}</TableCell>
                        <TableCell>
                          {term.targetLanguage.toUpperCase()}
                        </TableCell>
                        <TableCell>{term.target}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTerm(term.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

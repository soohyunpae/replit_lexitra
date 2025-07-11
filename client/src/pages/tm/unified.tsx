import React, { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useTranslation } from "react-i18next";
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
  Database,
  FileText,
  Upload,
  ChevronRight,
  X,
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
import { useAuth } from "@/hooks/use-auth";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowRight } from "lucide-react";

// Form schema for adding TM entries
const tmEntryFormSchema = z.object({
  source: z.string().min(1, { message: "Source text is required" }),
  target: z.string().min(1, { message: "Target text is required" }),
  sourceLanguage: z.string().min(1, { message: "Source language is required" }),
  targetLanguage: z.string().min(1, { message: "Target language is required" }),
  resourceId: z.number().optional(),
  status: z.string().default("100%"),
});

// Form schema for adding TM resources
const tmResourceFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().optional(),
  defaultSourceLanguage: z
    .string()
    .min(2, { message: "Source language is required" }),
  defaultTargetLanguage: z
    .string()
    .min(2, { message: "Target language is required" }),
  isActive: z.boolean().default(true),
});

type TmEntryFormValues = z.infer<typeof tmEntryFormSchema>;
type TmResourceFormValues = z.infer<typeof tmResourceFormSchema>;

export default function UnifiedTranslationMemoryPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState<string>(
    "all_source_languages",
  );
  const [targetLanguageFilter, setTargetLanguageFilter] = useState<string>(
    "all_target_languages",
  );
  const [statusFilter, setStatusFilter] = useState<string>("all_statuses");
  const [resourceFilter, setResourceFilter] = useState<string>("all_resources");

  // Dialog states
  const [addEntryDialogOpen, setAddEntryDialogOpen] = useState(false);
  const [addResourceDialogOpen, setAddResourceDialogOpen] = useState(false);

  // Entry form setup
  const entryForm = useForm<TmEntryFormValues>({
    resolver: zodResolver(tmEntryFormSchema),
    defaultValues: {
      source: "",
      target: "",
      sourceLanguage: "",
      targetLanguage: "",
      resourceId: undefined,
      status: "100%",
    },
  });

  // Resource form setup
  const resourceForm = useForm<TmResourceFormValues>({
    resolver: zodResolver(tmResourceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultSourceLanguage: "",
      defaultTargetLanguage: "",
      isActive: true,
    },
  });

  // Delete TM entry mutation
  const deleteTmEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/tm/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("tm.entryDeletedSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tm/all"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: t("tm.failedToDeleteEntry", { message: error.message }),
        variant: "destructive",
      });
    },
  });

  // Get all TM resources
  const { data: tmResources = [], isLoading: isLoadingResources } = useQuery({
    queryKey: ["/api/tm/resources"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/tm/resources");
        return res.json();
      } catch (error) {
        console.error("Error fetching TM resources:", error);
        return [];
      }
    },
  });

  // Get all TM entries
  const { data: tmData = [], isLoading: isLoadingEntries } = useQuery({
    queryKey: ["/api/tm/all", resourceFilter],
    queryFn: async () => {
      try {
        const url =
          resourceFilter && resourceFilter !== "all_resources"
            ? `/api/tm/all?resourceId=${resourceFilter}`
            : "/api/tm/all";
        const res = await apiRequest("GET", url);
        return res.json();
      } catch (error) {
        console.error("Error fetching TM entries:", error);
        return [];
      }
    },
  });

  // Get unique languages and statuses from TM data
  const filters = React.useMemo(() => {
    if (!tmData) return { source: [], target: [], statuses: [] };

    // Get unique source languages
    const sourceLanguagesSet = new Set<string>();
    tmData.forEach((item: any) => sourceLanguagesSet.add(item.sourceLanguage));
    const sourceLanguages = Array.from(sourceLanguagesSet);

    // Get unique target languages
    const targetLanguagesSet = new Set<string>();
    tmData.forEach((item: any) => targetLanguagesSet.add(item.targetLanguage));
    const targetLanguages = Array.from(targetLanguagesSet);

    // Get unique statuses
    const statusesSet = new Set<string>();
    tmData.forEach((item: any) => statusesSet.add(item.status));
    const statuses = Array.from(statusesSet);

    return {
      source: sourceLanguages,
      target: targetLanguages,
      statuses: statuses,
    };
  }, [tmData]);

  // Filtered TM entries
  const filteredTM = React.useMemo(() => {
    if (!tmData) return [];

    return tmData.filter((entry: any) => {
      const matchesSearch = searchQuery
        ? entry.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.target.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      const matchesSourceLang =
        sourceLanguageFilter && sourceLanguageFilter !== "all_source_languages"
          ? entry.sourceLanguage === sourceLanguageFilter
          : true;

      const matchesTargetLang =
        targetLanguageFilter && targetLanguageFilter !== "all_target_languages"
          ? entry.targetLanguage === targetLanguageFilter
          : true;

      const matchesStatus =
        statusFilter && statusFilter !== "all_statuses"
          ? entry.status === statusFilter
          : true;

      return (
        matchesSearch && matchesSourceLang && matchesTargetLang && matchesStatus
      );
    });
  }, [
    tmData,
    searchQuery,
    sourceLanguageFilter,
    targetLanguageFilter,
    statusFilter,
  ]);

  // Add new TM entry
  const addEntryMutation = useMutation({
    mutationFn: async (data: TmEntryFormValues) => {
      const response = await apiRequest("POST", "/api/tm", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tm/all"] });
      entryForm.reset();
      setAddEntryDialogOpen(false);
      toast({
        title: "Entry added",
        description: "The TM entry has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add TM entry",
        variant: "destructive",
      });
    },
  });

  // Add new TM resource
  const addResourceMutation = useMutation({
    mutationFn: async (data: TmResourceFormValues) => {
      const response = await apiRequest("POST", "/api/tm/resources", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tm/resources"] });
      resourceForm.reset();
      setAddResourceDialogOpen(false);
      toast({
        title: "TM resource added",
        description: "The TM resource has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add TM resource",
        variant: "destructive",
      });
    },
  });

  // Delete TM entry
  function handleDeleteEntry(id: number) {
    if (window.confirm("Are you sure you want to delete this TM entry?")) {
      deleteTmEntryMutation.mutate(id);
    }
  }

  // Delete TM resource (placeholder - implement in future)
  function handleDeleteResource(id: number) {
    if (
      window.confirm(
        "Are you sure you want to delete this TM resource? This will also delete all entries associated with this resource.",
      )
    ) {
      toast({
        title: "Feature not implemented",
        description: "The delete TM resource feature is not yet implemented.",
        variant: "destructive",
      });
    }
  }

  // Form submission handlers
  function onSubmitEntry(data: TmEntryFormValues) {
    addEntryMutation.mutate(data);
  }

  function onSubmitResource(data: TmResourceFormValues) {
    addResourceMutation.mutate(data);
  }

  // Handle TM resource click for filtering
  function handleResourceClick(resourceId: string) {
    setResourceFilter(resourceId);
  }

  // Pagination states and calculations
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredTM.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = useMemo(
    () => filteredTM.slice(startIndex, endIndex),
    [filteredTM, startIndex, endIndex],
  );

  return (
    <MainLayout title="Translation Memory">
      <div className="container max-w-screen-xl mx-auto p-6">
        {/* Removed breadcrumb navigation per UI update */}

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <h2 className="text-3xl font-bold tracking-tight">
              {t("tm.title")}
            </h2>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Dialog
                open={addEntryDialogOpen}
                onOpenChange={setAddEntryDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("tm.addEntry")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New TM Entry</DialogTitle>
                    <DialogDescription>
                      Add a new entry to your translation memory database.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...entryForm}>
                    <form
                      onSubmit={entryForm.handleSubmit(onSubmitEntry)}
                      className="space-y-4"
                    >
                      <FormField
                        control={entryForm.control}
                        name="sourceLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("tm.sourceLanguage")}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("tm.selectSourceLanguage")}
                                  />
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
                        control={entryForm.control}
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
                        control={entryForm.control}
                        name="source"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Source Text</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter source text"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={entryForm.control}
                        name="target"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Text</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter target text"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={entryForm.control}
                        name="resourceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>TM Resource</FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(Number(value))
                              }
                              defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select TM resource" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {tmResources.map((resource: any) => (
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
                        control={entryForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="100%">100%</SelectItem>
                                <SelectItem value="Fuzzy">Fuzzy</SelectItem>
                                <SelectItem value="MT">MT</SelectItem>
                                <SelectItem value="Reviewed">
                                  Reviewed
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={addEntryMutation.isPending}
                        >
                          {addEntryMutation.isPending
                            ? t("tm.adding")
                            : t("tm.addEntry")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    {t("tm.uploadTmFile")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("tm.uploadTmFile")}</DialogTitle>
                    <DialogDescription>
                      {t("tm.uploadTmFileDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="tmFile" className="text-right">
                        {t("tm.file")}
                      </Label>
                      <Input
                        id="tmFile"
                        type="file"
                        className="col-span-3"
                        accept=".tmx,.xlsx,.csv"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="tmResource" className="text-right">
                        {t("tm.tmResource")}
                      </Label>
                      <Select defaultValue="none">
                        <SelectTrigger className="col-span-3" id="tmResource">
                          <SelectValue placeholder={t("tm.selectTmResource")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {t("tm.noneCreateNew")}
                          </SelectItem>
                          {tmResources.map((resource: any) => (
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
                  </div>
                  <DialogFooter>
                    <Button type="submit">{t("tm.upload")}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
        <p className="text-muted-foreground mb-6">
          {t("tm.uploadTmFileDescription")}
        </p>

        {/* TM Resources Section */}
        <div className="bg-card border rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <h3 className="text-xl font-semibold">{t("tm.tmResources")}</h3>
            </div>
          </div>

          {/* TM Resources Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tm.resourceName")}</TableHead>
                  <TableHead>{t("tm.description")}</TableHead>
                  <TableHead>{t("common.language")}</TableHead>
                  <TableHead>{t("tm.entries")}</TableHead>
                  <TableHead>{t("tm.created")}</TableHead>
                  {isAdmin && (
                    <TableHead className="text-right">
                      {t("tm.actions")}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingResources ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 6 : 5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t("common.loading")}
                    </TableCell>
                  </TableRow>
                ) : tmResources.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 6 : 5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t("tm.noEntries")}
                    </TableCell>
                  </TableRow>
                ) : (
                  tmResources.map((resource: any) => (
                    <TableRow key={resource.id}>
                      <TableCell className="font-medium">
                        <button
                          className="text-left hover:underline cursor-pointer"
                          onClick={() =>
                            handleResourceClick(String(resource.id))
                          }
                        >
                          {resource.name}
                        </button>
                      </TableCell>
                      <TableCell>{resource.description || "—"}</TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1 bg-accent/50 px-2 py-0.5 rounded-full text-xs">
                          <span className="font-medium">
                            {resource.defaultSourceLanguage.toUpperCase()}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium">
                            {resource.defaultTargetLanguage.toUpperCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tmData
                          ? tmData.filter(
                              (entry: any) => entry.resourceId === resource.id,
                            ).length
                          : 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(resource.createdAt)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteResource(resource.id)}
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

        {/* Search TM Entries Section */}
        <div className="bg-card border rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              <h3 className="text-xl font-semibold">
                {t("tm.searchTmEntries")}
              </h3>

              {resourceFilter !== "all_resources" && (
                <Badge
                  variant="secondary"
                  className="ml-3 py-1 px-3 cursor-pointer hover:bg-muted/70 flex items-center gap-1"
                  onClick={() => setResourceFilter("all_resources")}
                >
                  {
                    tmResources.find(
                      (r: any) => String(r.id) === resourceFilter,
                    )?.name
                  }
                  <X className="h-3.5 w-3.5 ml-1" />
                </Badge>
              )}
            </div>
          </div>

          <div className="mb-6">
            {/* Search and Filters in a single row */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Search Box */}
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("tm.searchEntries")}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Stats Summary Removed - Now displayed next to search box */}

          {/* TM Entries Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tm.source")}</TableHead>
                  <TableHead>{t("tm.target")}</TableHead>
                  <TableHead>{t("common.projects")}</TableHead>
                  <TableHead>{t("tm.status")}</TableHead>
                  <TableHead>{t("tm.added")}</TableHead>
                  <TableHead>{t("tm.modifiedBy")}</TableHead>
                  {isAdmin && (
                    <TableHead className="text-right">
                      {t("tm.actions")}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingEntries ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 7 : 6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t("common.loading")}
                    </TableCell>
                  </TableRow>
                ) : filteredTM.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 7 : 6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t("tm.noEntries")}
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.source}
                      </TableCell>
                      <TableCell>{entry.target}</TableCell>
                      <TableCell>{entry.projectName || "—"}</TableCell>
                      <TableCell>
                        <div className="inline-flex px-2 py-1 rounded-full text-xs font-medium">
                          {entry.origin === "MT" && (
                            <span className="origin-badge-mt px-2 py-0.5 rounded-full">
                              MT
                            </span>
                          )}
                          {entry.origin === "Fuzzy" && (
                            <span className="origin-badge-fuzzy px-2 py-0.5 rounded-full">
                              Fuzzy
                            </span>
                          )}
                          {entry.origin === "100%" && (
                            <span className="origin-badge-100 px-2 py-0.5 rounded-full">
                              100%
                            </span>
                          )}
                          {entry.origin === "HT" && (
                            <span className="origin-badge-ht px-2 py-0.5 rounded-full">
                              HT
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.modifiedBy || "—"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEntry(entry.id)}
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
          {filteredTM.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                {t("common.showing", {
                  start: Math.min(
                    (currentPage - 1) * itemsPerPage + 1,
                    filteredTM.length,
                  ),
                  end: Math.min(currentPage * itemsPerPage, filteredTM.length),
                  total: filteredTM.length,
                })}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  {t("common.previous")}
                </Button>
                <div className="text-sm mx-4">
                  {t("common.pageInfo", {
                    current: currentPage,
                    total: totalPages,
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  {t("common.next")}
                </Button>
              </div>
            </div>
          )}

          {/* Admin actions moved to header */}
        </div>
      </div>
    </MainLayout>
  );
}

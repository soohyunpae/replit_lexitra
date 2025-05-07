import React, { useState, useMemo, useContext, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Database, FileText, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { useLocation } from "wouter";
import { SidebarContext } from "@/components/layout/sidebar";

export default function TranslationMemoryPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("entries");
  const { setActiveSubSection } = useContext(SidebarContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState<string>(
    "all_source_languages",
  );
  const [targetLanguageFilter, setTargetLanguageFilter] = useState<string>(
    "all_target_languages",
  );
  const [statusFilter, setStatusFilter] = useState<string>("all_statuses");
  const [selectedResourceId, setSelectedResourceId] =
    useState<string>("all_resources");

  // Get all TMs
  const { data: tmResources = [], isLoading: isLoadingResources } = useQuery({
    queryKey: ["/api/tm/resources"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/tm/resources");
        return res.json();
      } catch (error) {
        console.error("Error fetching TMs:", error);
        return [];
      }
    },
  });

  // Get all translation memory entries with optional resourceId filter
  const { data: tmData = [], isLoading: isLoadingEntries } = useQuery({
    queryKey: ["/api/tm/all", selectedResourceId],
    queryFn: async () => {
      try {
        const url =
          selectedResourceId && selectedResourceId !== "all_resources"
            ? `/api/tm/all?resourceId=${selectedResourceId}`
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
  const filters = useMemo(() => {
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
  const filteredTM = useMemo(() => {
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

  // 브레드크럼을 업데이트하기 위한 상태 변수
  const [activeTabLabel, setActiveTabLabel] = useState<string>("TM Entries");

  // 탭 변경 시 브레드크럼 업데이트
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // 선택된 탭에 따라 적절한 라벨 설정
    if (value === "entries") {
      setActiveTabLabel("TM Entries");
    } else if (value === "resources") {
      setActiveTabLabel("TM List");
    }
  };
  
  // 활성화된 탭이 변경될 때마다 SidebarContext 업데이트
  useEffect(() => {
    setActiveSubSection(activeTabLabel);
  }, [activeTabLabel, setActiveSubSection]);

  return (
    <MainLayout title="Translation Memory">
      <div className="container max-w-screen-xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-5 w-5" />
          <h2 className="text-3xl font-bold tracking-tight">
            Translation Memory
          </h2>
        </div>
        <p className="text-muted-foreground mb-6">
          View and manage your translation memory database
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
              TM Entries
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              TM List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="mt-0">
            <div className="grid gap-4 md:grid-cols-4 grid-cols-1 mb-4">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search in Translation Memory..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Source Language Filter */}
              <Select
                value={sourceLanguageFilter}
                onValueChange={setSourceLanguageFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Source language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_source_languages">
                    All languages
                  </SelectItem>
                  {filters.source.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Target Language Filter */}
              <Select
                value={targetLanguageFilter}
                onValueChange={setTargetLanguageFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Target language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_target_languages">
                    All languages
                  </SelectItem>
                  {filters.target.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-4 grid-cols-1 mb-4">
              {/* Status Filter */}
              <div className="md:col-span-1">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_statuses">All statuses</SelectItem>
                    {filters.statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resource Filter */}
              <div className="md:col-span-1">
                <Select
                  value={selectedResourceId}
                  onValueChange={setSelectedResourceId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="TM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_resources">All TMs</SelectItem>
                    {tmResources.map((resource: any) => (
                      <SelectItem key={resource.id} value={String(resource.id)}>
                        {resource.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stats Summary */}
              <div className="md:col-span-2 flex flex-wrap gap-3 items-center">
                <div className="px-3 py-1 bg-muted rounded-md text-sm">
                  <span className="font-medium">
                    {tmData ? tmData.length : 0}
                  </span>{" "}
                  total entries
                </div>
                <div className="px-3 py-1 bg-muted rounded-md text-sm">
                  <span className="font-medium">{filters.source.length}</span>{" "}
                  source langs
                </div>
                <div className="px-3 py-1 bg-muted rounded-md text-sm">
                  <span className="font-medium">{filters.target.length}</span>{" "}
                  target langs
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Languages</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingEntries ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredTM.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No translation memory entries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTM.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell className="max-w-xs truncate font-medium">
                          {entry.source}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {entry.target}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">
                              Source: {entry.sourceLanguage}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Target: {entry.targetLanguage}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex px-2 py-1 rounded-full text-xs font-medium">
                            {entry.status === "100%" && (
                              <span className="status-badge-100 px-2 py-0.5 rounded-full">
                                100%
                              </span>
                            )}
                            {entry.status === "Fuzzy" && (
                              <span className="status-badge-fuzzy px-2 py-0.5 rounded-full">
                                Fuzzy
                              </span>
                            )}
                            {entry.status === "MT" && (
                              <span className="status-badge-mt px-2 py-0.5 rounded-full">
                                MT
                              </span>
                            )}
                            {entry.status === "Reviewed" && (
                              <span className="status-badge-reviewed px-2 py-0.5 rounded-full">
                                Reviewed
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(entry.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="resources" className="mt-0">
            {/* TMs Table */}
            <div className="flex justify-between mb-4">
              <div></div>
              <Button onClick={() => navigate("/tm/resources")}>
                <Plus className="h-4 w-4 mr-2" /> Add TM
              </Button>
            </div>
            {isLoadingResources ? (
              <div className="flex justify-center p-8">
                <p>Loading TMs...</p>
              </div>
            ) : tmResources.length === 0 ? (
              <div className="flex justify-center items-center p-8 border rounded-md">
                <p className="text-muted-foreground">
                  No translation memories found. Create your first TM!
                </p>
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Default Languages</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tmResources.map((tm: any) => (
                      <TableRow key={tm.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {tm.name}
                            {tm.isActive && (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                              >
                                Active
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{tm.description || "-"}</TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {tm.defaultSourceLanguage?.toUpperCase() || "-"}
                          </span>{" "}
                          &rarr;{" "}
                          <span className="font-medium">
                            {tm.defaultTargetLanguage?.toUpperCase() || "-"}
                          </span>
                        </TableCell>
                        <TableCell>{tm.domain || "-"}</TableCell>
                        <TableCell>
                          {tm.createdAt ? formatDate(tm.createdAt) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this TM?")) {
                                // 여기에 삭제 로직이 들어갈 수 있습니다.
                                // 현재는 탭 전환 방식으로만 표시합니다.
                              }
                            }}
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
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

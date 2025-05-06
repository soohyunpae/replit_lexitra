import React, { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Search, Database, ChevronRight, FileText, Tag } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { Link, useLocation } from "wouter";

export default function TranslationMemoryPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sourceLanguageFilter, setSourceLanguageFilter] = React.useState<string>("all_source_languages");
  const [targetLanguageFilter, setTargetLanguageFilter] = React.useState<string>("all_target_languages");
  const [statusFilter, setStatusFilter] = React.useState<string>("all_statuses");
  const [activeTab, setActiveTab] = React.useState<string>("entries");
  const [selectedResourceId, setSelectedResourceId] = React.useState<string>("all_resources");
  
  // Get all TM resources
  const { data: tmResources, isLoading: isLoadingResources } = useQuery({
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
  
  // Get all translation memory entries with optional resourceId filter
  const { data: tmData, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["/api/tm/all", selectedResourceId],
    queryFn: async () => {
      try {
        const url = selectedResourceId && selectedResourceId !== "all_resources" 
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
      
      const matchesSourceLang = sourceLanguageFilter && sourceLanguageFilter !== "all_source_languages"
        ? entry.sourceLanguage === sourceLanguageFilter
        : true;
      
      const matchesTargetLang = targetLanguageFilter && targetLanguageFilter !== "all_target_languages"
        ? entry.targetLanguage === targetLanguageFilter
        : true;
      
      const matchesStatus = statusFilter && statusFilter !== "all_statuses"
        ? entry.status === statusFilter
        : true;
      
      return matchesSearch && matchesSourceLang && matchesTargetLang && matchesStatus;
    });
  }, [tmData, searchQuery, sourceLanguageFilter, targetLanguageFilter, statusFilter]);

  return (
    <MainLayout title="Translation Memory">
      <div className="container max-w-screen-xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5" />
          <h2 className="text-3xl font-bold tracking-tight">Translation Memory</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          View and manage your translation memory database
        </p>
          
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/tm">
              <Button variant={activeTab === "entries" ? "default" : "outline"} className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                TM Entries
              </Button>
            </Link>
            <Link href="/tm/resources">
              <Button variant={activeTab === "resources" ? "default" : "outline"} className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                TM Resources
              </Button>
            </Link>
          </div>
        </div>
              
        {activeTab === "entries" && (
          <>
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
                  <SelectItem value="all_source_languages">All languages</SelectItem>
                  {filters.source.map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
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
                  <SelectItem value="all_target_languages">All languages</SelectItem>
                  {filters.target.map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-4 md:grid-cols-4 grid-cols-1 mb-4">
              {/* Status Filter */}
              <div className="md:col-span-1">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_statuses">All statuses</SelectItem>
                    {filters.statuses.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
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
                    <SelectValue placeholder="TM Resource" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_resources">All resources</SelectItem>
                    {tmResources?.map((resource: any) => (
                      <SelectItem key={resource.id} value={String(resource.id)}>{resource.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Stats Summary */}
              <div className="md:col-span-2 flex flex-wrap gap-3 items-center">
                <div className="px-3 py-1 bg-muted rounded-md text-sm">
                  <span className="font-medium">{tmData ? tmData.length : 0}</span> total entries
                </div>
                <div className="px-3 py-1 bg-muted rounded-md text-sm">
                  <span className="font-medium">{filters.source.length}</span> source langs
                </div>
                <div className="px-3 py-1 bg-muted rounded-md text-sm">
                  <span className="font-medium">{filters.target.length}</span> target langs
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
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredTM.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No translation memory entries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTM.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell className="max-w-xs truncate font-medium">{entry.source}</TableCell>
                        <TableCell className="max-w-xs truncate">{entry.target}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Source: {entry.sourceLanguage}</span>
                            <span className="text-xs text-muted-foreground">Target: {entry.targetLanguage}</span>
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
          </>
        )}
          
        {activeTab === "resources" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Translation Memory Resources</h3>
              <Button size="sm">
                <Tag className="h-4 w-4 mr-2" /> Add New Resource
              </Button>
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
                  {isLoadingResources ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : !tmResources || tmResources.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No TM resources found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tmResources.map((resource: any) => (
                      <TableRow key={resource.id}>
                        <TableCell className="font-medium">{resource.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{resource.description}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Source: {resource.defaultSourceLanguage}</span>
                            <span className="text-xs text-muted-foreground">Target: {resource.defaultTargetLanguage}</span>
                          </div>
                        </TableCell>
                        <TableCell>{resource.domain || 'General'}</TableCell>
                        <TableCell>
                          {resource.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              Inactive
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
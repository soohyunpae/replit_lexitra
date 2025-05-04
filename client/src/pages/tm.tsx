import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Search, Database } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { formatDate } from "@/lib/utils";

export default function TranslationMemoryPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sourceLanguageFilter, setSourceLanguageFilter] = React.useState<string>("all_source_languages");
  const [targetLanguageFilter, setTargetLanguageFilter] = React.useState<string>("all_target_languages");
  const [statusFilter, setStatusFilter] = React.useState<string>("all_statuses");
  
  // Get all translation memory entries
  const { data: tmData, isLoading } = useQuery({
    queryKey: ["/api/tm/all"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tm/all");
      return res.json();
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
    <div className="flex flex-col min-h-screen">
      <Header title="Translation Memory Management" />
      
      <main className="flex-1 container max-w-screen-xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Translation Memory Database
            </CardTitle>
            <CardDescription>
              View and manage your translation memory database
            </CardDescription>
            
            <div className="mt-4 grid gap-4 md:grid-cols-4 grid-cols-1">
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
              
              {/* Stats Summary */}
              <div className="md:col-span-3 flex flex-wrap gap-3 items-center">
                <div className="px-3 py-1 bg-muted rounded-md text-sm">
                  <span className="font-medium">{tmData ? tmData.length : 0}</span> total entries
                </div>
                <div className="px-3 py-1 bg-muted rounded-md text-sm">
                  <span className="font-medium">{filters.source.length}</span> source languages
                </div>
                <div className="px-3 py-1 bg-muted rounded-md text-sm">
                  <span className="font-medium">{filters.target.length}</span> target languages
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
          </CardHeader>
          
          <CardContent>
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
                  {isLoading ? (
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
                              <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                                100%
                              </span>
                            )}
                            {entry.status === "Fuzzy" && (
                              <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                                Fuzzy
                              </span>
                            )}
                            {entry.status === "MT" && (
                              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                MT
                              </span>
                            )}
                            {entry.status === "Reviewed" && (
                              <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full">
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
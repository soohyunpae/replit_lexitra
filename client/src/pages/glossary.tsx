import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Plus, Save, Trash2, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
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
});

type GlossaryFormValues = z.infer<typeof glossaryFormSchema>;

export default function GlossaryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState<string>("all_source_languages");
  const [targetLanguageFilter, setTargetLanguageFilter] = useState<string>("all_target_languages");
  
  // Form setup
  const form = useForm<GlossaryFormValues>({
    resolver: zodResolver(glossaryFormSchema),
    defaultValues: {
      source: "",
      target: "",
      sourceLanguage: "",
      targetLanguage: "",
    },
  });

  // Get all glossary terms
  const { data: glossaryData, isLoading } = useQuery({
    queryKey: ["/api/glossary/all"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/glossary/all");
      return res.json();
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

  // Handle form submission
  const onSubmit = (data: GlossaryFormValues) => {
    addGlossaryMutation.mutate(data);
  };

  // Handle delete term
  const handleDeleteTerm = (id: number) => {
    if (window.confirm("Are you sure you want to delete this term?")) {
      deleteGlossaryMutation.mutate(id);
    }
  };

  return (
    <main className="container max-w-screen-xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Add Term Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus size={18} />
                Add New Term
              </CardTitle>
              <CardDescription>
                Add a new term to the terminology base
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
          
          {/* Glossary List */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Terminology Base</CardTitle>
              <CardDescription>
                Manage your terminology base
              </CardDescription>
              
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
                </div>
              </div>
              
              <Separator className="my-4" />
            </CardHeader>
            
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      </main>
  );
}

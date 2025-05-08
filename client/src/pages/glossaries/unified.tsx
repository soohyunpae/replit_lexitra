import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Glossary } from "@/types";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function UnifiedGlossaries() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isAdmin = user?.role === "admin";
  
  // Form state for adding new glossary term
  const [formState, setFormState] = useState({
    source: "",
    target: "",
    sourceLanguage: "en",
    targetLanguage: "ko",
  });
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filtering and sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "updatedAt",
    direction: "desc" as "asc" | "desc",
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Fetch glossary data
  const {
    data: glossaryData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["/api/glossary"],
    queryFn: getQueryFn(),
  });
  
  // Add new glossary term
  const addGlossaryMutation = useMutation({
    mutationFn: async (data: Omit<Glossary, "id" | "createdAt" | "updatedAt">) => {
      const res = await apiRequest("POST", "/api/glossary", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add glossary term");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/glossary"] });
      toast({
        title: "Success",
        description: "Glossary term added successfully",
      });
      setFormState({
        source: "",
        target: "",
        sourceLanguage: "en",
        targetLanguage: "ko",
      });
      setIsDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete glossary term
  const deleteGlossaryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/glossary/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete glossary term");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/glossary"] });
      toast({
        title: "Success",
        description: "Glossary term deleted successfully",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.source || !formState.target) {
      toast({
        title: "Validation Error",
        description: "Source and target terms are required",
        variant: "destructive",
      });
      return;
    }
    
    addGlossaryMutation.mutate({
      source: formState.source,
      target: formState.target,
      sourceLanguage: formState.sourceLanguage,
      targetLanguage: formState.targetLanguage,
    });
  };
  
  // Handle delete confirmation
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this glossary term?")) {
      deleteGlossaryMutation.mutate(id);
    }
  };
  
  // Sorting logic
  const handleSort = (key: keyof Glossary) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };
  
  // Filter and sort the glossary data
  const filteredGlossary = React.useMemo(() => {
    if (!glossaryData) return [];
    
    // First, filter the data
    let filtered = [...glossaryData];
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.source.toLowerCase().includes(lowerCaseQuery) ||
          item.target.toLowerCase().includes(lowerCaseQuery) ||
          item.sourceLanguage.toLowerCase().includes(lowerCaseQuery) ||
          item.targetLanguage.toLowerCase().includes(lowerCaseQuery)
      );
    }
    
    // Then, sort the data
    const { key, direction } = sortConfig;
    filtered.sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [glossaryData, searchQuery, sortConfig]);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredGlossary.length / itemsPerPage);
  const paginatedGlossary = filteredGlossary.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Render page numbers for pagination
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if there are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show a subset of pages with ellipsis
      if (currentPage <= 3) {
        // Case: near start
        for (let i = 1; i <= 3; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Case: near end
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Case: middle
        pages.push(1);
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [searchQuery]);
  
  return (
    <MainLayout title="Glossary">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Glossary Management</h1>
            <p className="text-muted-foreground">
              Manage terminology for consistent translations
            </p>
          </div>
          
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Term
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Glossary Term</DialogTitle>
                  <DialogDescription>
                    Add a new term to the glossary for consistent translations.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="sourceLanguage" className="text-right">
                        Source Language
                      </Label>
                      <Select
                        value={formState.sourceLanguage}
                        onValueChange={(value) =>
                          handleSelectChange("sourceLanguage", value)
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ko">Korean</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="source" className="text-right">
                        Source Term
                      </Label>
                      <Input
                        id="source"
                        name="source"
                        value={formState.source}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="targetLanguage" className="text-right">
                        Target Language
                      </Label>
                      <Select
                        value={formState.targetLanguage}
                        onValueChange={(value) =>
                          handleSelectChange("targetLanguage", value)
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ko">Korean</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="target" className="text-right">
                        Target Term
                      </Label>
                      <Input
                        id="target"
                        name="target"
                        value={formState.target}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={addGlossaryMutation.isPending}
                    >
                      {addGlossaryMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Term
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        <div className="bg-card rounded-md shadow">
          <div className="p-4 border-b">
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search glossary terms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="p-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {error instanceof Error
                    ? error.message
                    : "Failed to load glossary data"}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => handleSort("source")}
                        >
                          Source Term
                          {sortConfig.key === "source" && (
                            <span className="ml-1">
                              {sortConfig.direction === "asc" ? (
                                <ChevronUp className="inline h-4 w-4" />
                              ) : (
                                <ChevronDown className="inline h-4 w-4" />
                              )}
                            </span>
                          )}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => handleSort("target")}
                        >
                          Target Term
                          {sortConfig.key === "target" && (
                            <span className="ml-1">
                              {sortConfig.direction === "asc" ? (
                                <ChevronUp className="inline h-4 w-4" />
                              ) : (
                                <ChevronDown className="inline h-4 w-4" />
                              )}
                            </span>
                          )}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => handleSort("sourceLanguage")}
                        >
                          Source Lang
                          {sortConfig.key === "sourceLanguage" && (
                            <span className="ml-1">
                              {sortConfig.direction === "asc" ? (
                                <ChevronUp className="inline h-4 w-4" />
                              ) : (
                                <ChevronDown className="inline h-4 w-4" />
                              )}
                            </span>
                          )}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => handleSort("targetLanguage")}
                        >
                          Target Lang
                          {sortConfig.key === "targetLanguage" && (
                            <span className="ml-1">
                              {sortConfig.direction === "asc" ? (
                                <ChevronUp className="inline h-4 w-4" />
                              ) : (
                                <ChevronDown className="inline h-4 w-4" />
                              )}
                            </span>
                          )}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => handleSort("updatedAt")}
                        >
                          Updated
                          {sortConfig.key === "updatedAt" && (
                            <span className="ml-1">
                              {sortConfig.direction === "asc" ? (
                                <ChevronUp className="inline h-4 w-4" />
                              ) : (
                                <ChevronDown className="inline h-4 w-4" />
                              )}
                            </span>
                          )}
                        </TableHead>
                        {isAdmin && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedGlossary.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={isAdmin ? 6 : 5}
                            className="text-center py-8"
                          >
                            No glossary terms found
                            {searchQuery && (
                              <> matching "{searchQuery}"</>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedGlossary.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.source}
                            </TableCell>
                            <TableCell>{item.target}</TableCell>
                            <TableCell>{item.sourceLanguage}</TableCell>
                            <TableCell>{item.targetLanguage}</TableCell>
                            <TableCell>
                              {new Date(item.updatedAt).toLocaleDateString()}
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(item.id)}
                                  disabled={deleteGlossaryMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
            
            {/* Pagination Component */}
            {!isLoading && !isError && filteredGlossary.length > 0 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {renderPageNumbers().map((page, i) =>
                      page === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={currentPage === page}
                            onClick={() => setCurrentPage(page as number)}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                <div className="text-center text-sm text-muted-foreground mt-2">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredGlossary.length)} of {filteredGlossary.length} entries
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
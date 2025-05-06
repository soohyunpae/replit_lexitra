import React, { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Database, FileText, ChevronRight, Tag, Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";

// Form schema for TM resources
const tmResourceFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().optional(),
  defaultSourceLanguage: z.string().min(2),
  defaultTargetLanguage: z.string().min(2),
  domain: z.string().optional(),
  isActive: z.boolean().default(true),
});

type TmResourceFormValues = z.infer<typeof tmResourceFormSchema>;

export default function TranslationMemoryResourcesPage() {
  const { toast } = useToast();
  const [showResourceDialog, setShowResourceDialog] = useState<boolean>(false);
  
  // Get all TM resources
  const { data: tmResources = [], isLoading } = useQuery({
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

  // TM Resource form setup
  const resourceForm = useForm<TmResourceFormValues>({
    resolver: zodResolver(tmResourceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultSourceLanguage: "",
      defaultTargetLanguage: "",
      domain: "",
      isActive: true,
    },
  });
  
  // Add TM resource mutation
  const addResourceMutation = useMutation({
    mutationFn: async (data: TmResourceFormValues) => {
      const response = await apiRequest("POST", "/api/tm/resource", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tm/resources"] });
      resourceForm.reset();
      setShowResourceDialog(false);
      toast({
        title: "TM Resource added",
        description: "The translation memory resource has been added successfully.",
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
  
  // Delete TM resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/tm/resource/${id}`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tm/resources"] });
      toast({
        title: "Resource deleted",
        description: "The TM resource has been deleted successfully.",
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
  
  function onResourceSubmit(data: TmResourceFormValues) {
    addResourceMutation.mutate(data);
  }
  
  function handleDeleteResource(id: number) {
    if (window.confirm("Are you sure you want to delete this resource?")) {
      deleteResourceMutation.mutate(id);
    }
  }
  
  return (
    <MainLayout title="TM Resources">
      <div className="container max-w-screen-xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5" />
          <h2 className="text-3xl font-bold tracking-tight">TM Resources</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          Manage translation memory resources
        </p>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/tm">
              <Button variant="outline" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                TM Entries
              </Button>
            </Link>
            <Link href="/tm/resources">
              <Button variant="default" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                TM Resources
              </Button>
            </Link>
          </div>
          <Button onClick={() => setShowResourceDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Resource
          </Button>
        </div>
        
        {/* Resources Table */}
        {isLoading ? (
          <div className="flex justify-center p-8">
            <p>Loading resources...</p>
          </div>
        ) : tmResources.length === 0 ? (
          <div className="flex justify-center items-center p-8 border rounded-md">
            <p className="text-muted-foreground">
              No translation memory resources found. Create your first resource!
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
                {tmResources.map((resource: any) => (
                  <TableRow key={resource.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {resource.name}
                        {resource.isActive && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{resource.description || "-"}</TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {resource.defaultSourceLanguage?.toUpperCase() || "-"}
                      </span>{" "}
                      &rarr;{" "}
                      <span className="font-medium">
                        {resource.defaultTargetLanguage?.toUpperCase() || "-"}
                      </span>
                    </TableCell>
                    <TableCell>{resource.domain || "-"}</TableCell>
                    <TableCell>
                      {resource.createdAt ? formatDate(resource.createdAt) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteResource(resource.id)}
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
        
        {/* Add Resource Dialog */}
        <Dialog open={showResourceDialog} onOpenChange={setShowResourceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New TM Resource</DialogTitle>
              <DialogDescription>
                Create a new translation memory resource to organize your TM data.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...resourceForm}>
              <form
                onSubmit={resourceForm.handleSubmit(onResourceSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={resourceForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter resource name" {...field} />
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
                        <Input
                          placeholder="Enter description (optional)"
                          {...field}
                          value={field.value || ""}
                        />
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
                        <FormLabel>Source Language</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
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
                    control={resourceForm.control}
                    name="defaultTargetLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Language</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
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
                </div>
                
                <FormField
                  control={resourceForm.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Domain (e.g., Legal, Technical, Medical)"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={resourceForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            id="isActive"
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <Label htmlFor="isActive">Active</Label>
                        </div>
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Set as an active resource
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowResourceDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addResourceMutation.isPending}
                  >
                    {addResourceMutation.isPending ? "Adding..." : "Add Resource"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
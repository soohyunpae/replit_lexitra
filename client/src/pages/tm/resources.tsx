import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Database, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/main-layout";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tmFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().optional(),
  defaultSourceLanguage: z.string().min(2),
  defaultTargetLanguage: z.string().min(2),
  domain: z.string().optional(),
  isActive: z.boolean().default(true),
});

type TmFormValues = z.infer<typeof tmFormSchema>;

export function TMResourcesPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showTmDialog, setShowTmDialog] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("resources");

  // Get all TMs
  const { data: tmResources = [], isLoading } = useQuery({
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

  // TM form setup
  const tmForm = useForm<TmFormValues>({
    resolver: zodResolver(tmFormSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultSourceLanguage: "",
      defaultTargetLanguage: "",
      domain: "",
      isActive: true,
    },
  });

  // Add TM mutation
  const addTmMutation = useMutation({
    mutationFn: async (data: TmFormValues) => {
      const response = await apiRequest("POST", "/api/tm/resource", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tm/resources"] });
      tmForm.reset();
      setShowTmDialog(false);
      toast({
        title: "TM added",
        description: "The translation memory has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add TM",
        variant: "destructive",
      });
    },
  });

  // Delete TM mutation
  const deleteTmMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/tm/resource/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tm/resources"] });
      toast({
        title: "TM deleted",
        description: "The TM has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete TM",
        variant: "destructive",
      });
    },
  });

  function onTmSubmit(data: TmFormValues) {
    addTmMutation.mutate(data);
  }

  function handleDeleteTm(id: number) {
    if (window.confirm("Are you sure you want to delete this TM?")) {
      deleteTmMutation.mutate(id);
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "entries") {
      navigate("/tm");
    } else {
      navigate("/tm/resources");
    }
  };

  return (
    <MainLayout title="TMs">
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
          defaultValue="resources"
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="entries">
              TM Entries
            </TabsTrigger>
            <TabsTrigger value="resources">
              TM List
            </TabsTrigger>
          </TabsList>
          <TabsContent value="resources" className="mt-0">
            {/* TMs Table */}
            <div className="flex justify-between mb-4">
              <div></div>
              <Button onClick={() => setShowTmDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add TM
              </Button>
            </div>
            {isLoading ? (
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
                            onClick={() => handleDeleteTm(tm.id)}
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

        {/* Add TM Dialog */}
        <Dialog open={showTmDialog} onOpenChange={setShowTmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New TM</DialogTitle>
              <DialogDescription>
                Create a new translation memory to organize your TM data.
              </DialogDescription>
            </DialogHeader>

            <Form {...tmForm}>
              <form
                onSubmit={tmForm.handleSubmit(onTmSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={tmForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter TM name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={tmForm.control}
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
                    control={tmForm.control}
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
                    control={tmForm.control}
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
                  control={tmForm.control}
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
                  control={tmForm.control}
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
                        <FormLabel>Set as an active TM</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowTmDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addTmMutation.isPending}>
                    {addTmMutation.isPending ? "Adding..." : "Add TM"}
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
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { FileHeart, Loader2, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Schema for TM cleanup form
const cleanupSchema = z.object({
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string().optional(),
  cleanupType: z.enum(["duplicates", "similar", "untranslated", "invalid"]),
  similarityThreshold: z.coerce.number().min(70).max(99).optional(),
  deleteItems: z.boolean().default(false),
});

type CleanupFormValues = z.infer<typeof cleanupSchema>;

export default function TMCleanup() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [results, setResults] = useState<any>(null);
  
  // Form definition
  const form = useForm<CleanupFormValues>({
    resolver: zodResolver(cleanupSchema),
    defaultValues: {
      cleanupType: "duplicates",
      similarityThreshold: 90,
      deleteItems: false,
    },
  });

  // Watch the cleanupType to conditionally show other fields
  const cleanupType = form.watch("cleanupType");

  // Mutation for cleanup
  const cleanupMutation = useMutation({
    mutationFn: async (data: CleanupFormValues) => {
      const response = await apiRequest("POST", "/api/admin/tm/cleanup", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cleanup complete",
        description: `Found ${data.count} items matching your criteria.`,
      });
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/tm"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Cleanup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: CleanupFormValues) => {
    // If similarityThreshold is needed but not provided, set a default
    if (values.cleanupType === "similar" && !values.similarityThreshold) {
      values.similarityThreshold = 90;
    }
    
    cleanupMutation.mutate(values);
  };

  // Loading state
  if (isLoading) {
    return (
      <MainLayout title="TM Cleanup">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </MainLayout>
    );
  }

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return (
    <MainLayout title="TM Cleanup">
      <div className="container py-6">
        <div className="flex items-center mb-6">
          <FileHeart className="mr-2 h-6 w-6" />
          <h1 className="text-2xl font-bold">Translation Memory Cleanup</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Cleanup Options</CardTitle>
                <CardDescription>
                  Configure the criteria for cleaning up the translation memory database.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="cleanupType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Cleanup Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="duplicates" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Find duplicate entries
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="similar" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Find similar entries
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="untranslated" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Find untranslated entries
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="invalid" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Find invalid entries
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {cleanupType === "similar" && (
                      <FormField
                        control={form.control}
                        name="similarityThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Similarity Threshold (%)</FormLabel>
                            <FormControl>
                              <Input type="number" min={70} max={99} {...field} />
                            </FormControl>
                            <FormDescription>
                              Entries with similarity equal or above this percentage will be considered similar.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                  <SelectValue placeholder="Any language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="any_language">Any language</SelectItem>
                                <SelectItem value="EN">English</SelectItem>
                                <SelectItem value="KO">Korean</SelectItem>
                                <SelectItem value="JA">Japanese</SelectItem>
                                <SelectItem value="ZH">Chinese</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Optional filter by source language
                            </FormDescription>
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
                                  <SelectValue placeholder="Any language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="any_language">Any language</SelectItem>
                                <SelectItem value="EN">English</SelectItem>
                                <SelectItem value="KO">Korean</SelectItem>
                                <SelectItem value="JA">Japanese</SelectItem>
                                <SelectItem value="ZH">Chinese</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Optional filter by target language
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="deleteItems"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 border p-4 rounded-md">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-red-500">
                              Delete matching entries
                            </FormLabel>
                            <FormDescription>
                              WARNING: This will permanently delete matching entries. First scan without this option to review results.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      disabled={cleanupMutation.isPending}
                      className="w-full"
                    >
                      {cleanupMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>Scan Translation Memory</>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Cleanup Results</CardTitle>
                <CardDescription>
                  Results of the translation memory cleanup scan will appear here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!results && !cleanupMutation.isPending && (
                  <div className="flex flex-col items-center justify-center h-64">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No scan results yet. Configure options and run a scan.</p>
                  </div>
                )}
                
                {cleanupMutation.isPending && (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-border mb-4" />
                    <p className="text-muted-foreground">Scanning translation memory...</p>
                  </div>
                )}
                
                {results && (
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Scan Complete</AlertTitle>
                      <AlertDescription>
                        Found {results.count} items matching your criteria.
                      </AlertDescription>
                    </Alert>
                    
                    {/* Display sample results if available */}
                    {results.samples && results.samples.length > 0 && (
                      <div className="border rounded-md overflow-hidden">
                        <div className="bg-background px-4 py-2 font-medium border-b">
                          Sample Entries ({Math.min(results.samples.length, 10)} of {results.count})
                        </div>
                        <div className="divide-y">
                          {results.samples.slice(0, 10).map((item: any, index: number) => (
                            <div key={index} className="p-4 space-y-2">
                              <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-5 text-muted-foreground text-sm">Source:</div>
                                <div className="col-span-7 font-medium">{item.source}</div>
                              </div>
                              <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-5 text-muted-foreground text-sm">Target:</div>
                                <div className="col-span-7">{item.target}</div>
                              </div>
                              {item.similarity && (
                                <div className="grid grid-cols-12 gap-2">
                                  <div className="col-span-5 text-muted-foreground text-sm">Similarity:</div>
                                  <div className="col-span-7">{item.similarity}%</div>
                                </div>
                              )}
                              {item.reason && (
                                <div className="grid grid-cols-12 gap-2">
                                  <div className="col-span-5 text-muted-foreground text-sm">Reason:</div>
                                  <div className="col-span-7 text-amber-500">{item.reason}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    {results.count > 0 && !form.getValues("deleteItems") && (
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            form.setValue("deleteItems", true);
                            form.handleSubmit(onSubmit)();
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                        >
                          Delete All Matches
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

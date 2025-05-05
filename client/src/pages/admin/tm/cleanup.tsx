import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { MainLayout } from '@/components/layout/main-layout';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Redirect } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, FileHeart } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const cleanupFormSchema = z.object({
  sourceLanguage: z.string().min(1, { message: "Source language is required" }),
  targetLanguage: z.string().min(1, { message: "Target language is required" }),
  removeDuplicates: z.boolean().default(true),
  normalizeWhitespace: z.boolean().default(true),
  removeTags: z.boolean().default(false),
});

type CleanupFormValues = z.infer<typeof cleanupFormSchema>;

export default function TMCleanup({ embedded = false }: { embedded?: boolean }) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [cleanupStats, setCleanupStats] = useState<{ 
    processed: number; 
    removed: number; 
    normalized: number;
    timeElapsed: number;
  } | null>(null);

  const form = useForm<CleanupFormValues>({
    resolver: zodResolver(cleanupFormSchema),
    defaultValues: {
      sourceLanguage: "EN",
      targetLanguage: "KO",
      removeDuplicates: true,
      normalizeWhitespace: true,
      removeTags: false,
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async (formData: CleanupFormValues) => {
      const response = await apiRequest(
        'POST',
        '/api/admin/tm/cleanup',
        formData
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process cleanup request');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setCleanupStats(data);
      toast({
        title: "Translation Memory Cleanup Complete",
        description: `Processed ${data.processed} entries, removed ${data.removed} duplicates, normalized ${data.normalized} entries in ${data.timeElapsed.toFixed(2)}s.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CleanupFormValues) => {
    setCleanupStats(null);
    cleanupMutation.mutate(data);
  };

  // Loading state
  if (isLoading) {
    if (embedded) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      );
    }
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
  
  // Card content for cleanup
  const CleanupForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>TM Cleanup</CardTitle>
        <CardDescription>
          Clean up your Translation Memory by removing duplicates and normalizing entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <SelectItem value="EN">English</SelectItem>
                        <SelectItem value="KO">Korean</SelectItem>
                        <SelectItem value="JA">Japanese</SelectItem>
                        <SelectItem value="ZH">Chinese</SelectItem>
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
                        <SelectItem value="EN">English</SelectItem>
                        <SelectItem value="KO">Korean</SelectItem>
                        <SelectItem value="JA">Japanese</SelectItem>
                        <SelectItem value="ZH">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-md font-medium">Cleanup Options</h3>
              
              <FormField
                control={form.control}
                name="removeDuplicates"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Remove Duplicates</FormLabel>
                      <FormDescription>
                        Remove entries with identical source and target text
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="normalizeWhitespace"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Normalize Whitespace</FormLabel>
                      <FormDescription>
                        Standardize spacing and line breaks in all entries
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="removeTags"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Remove HTML/XML Tags</FormLabel>
                      <FormDescription>
                        Strip all HTML and XML tags from entries
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {cleanupStats && (
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium mb-2">Cleanup Results</h3>
                <ul className="space-y-1 text-sm">
                  <li>✓ Processed {cleanupStats.processed} entries</li>
                  <li>✓ Removed {cleanupStats.removed} duplicates</li>
                  <li>✓ Normalized {cleanupStats.normalized} entries</li>
                  <li>✓ Completed in {cleanupStats.timeElapsed.toFixed(2)} seconds</li>
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={cleanupMutation.isPending}
                className="w-full md:w-auto"
              >
                {cleanupMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileHeart className="mr-2 h-4 w-4" />
                    Run Cleanup
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  // If in embedded mode, return just the form
  if (embedded) {
    return <CleanupForm />;
  }
  
  // Otherwise return the full page layout
  return (
    <MainLayout title="TM Cleanup">
      <div className="container py-6">
        <div className="flex items-center mb-6">
          <FileHeart className="mr-2 h-6 w-6" />
          <h1 className="text-2xl font-bold">TM Cleanup</h1>
        </div>
        <CleanupForm />
      </div>
    </MainLayout>
  );
}
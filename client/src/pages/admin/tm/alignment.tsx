import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlignLeft, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Schema for alignment form
const alignmentSchema = z.object({
  sourceLanguage: z.string().min(1, "Source language is required"),
  targetLanguage: z.string().min(1, "Target language is required"),
  sourceFile: z.any().refine((file) => file?.length > 0, "Source file is required"),
  targetFile: z.any().refine((file) => file?.length > 0, "Target file is required"),
  description: z.string().optional(),
});

type AlignmentFormValues = z.infer<typeof alignmentSchema>;

interface TMAlignmentProps {
  embedded?: boolean;
}

export default function TMAlignment({ embedded = false }: TMAlignmentProps) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  
  // Form definition
  const form = useForm<AlignmentFormValues>({
    resolver: zodResolver(alignmentSchema),
    defaultValues: {
      sourceLanguage: "",
      targetLanguage: "",
      description: ""
    },
  });

  // Mutation for alignment
  const alignmentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/admin/tm/alignment", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Alignment successful",
        description: "The files have been aligned and saved to the translation memory.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/tm"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Alignment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: AlignmentFormValues) => {
    const formData = new FormData();
    formData.append("sourceLanguage", values.sourceLanguage);
    formData.append("targetLanguage", values.targetLanguage);
    formData.append("description", values.description || "");
    
    if (values.sourceFile?.[0]) {
      formData.append("sourceFile", values.sourceFile[0]);
    }
    
    if (values.targetFile?.[0]) {
      formData.append("targetFile", values.targetFile[0]);
    }
    
    alignmentMutation.mutate(formData);
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
      <MainLayout title="Bilingual Alignment">
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
  
  // Card content for alignment
  const AlignmentForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Align Bilingual Files</CardTitle>
        <CardDescription>
          Upload matching source and target text files to align them and add the segments to the translation memory.
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter a description for this alignment"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description to help identify these aligned segments in the TM.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="sourceFile"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Source File</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".txt,.html,.xml,.csv"
                        onChange={(e) => {
                          onChange(e.target.files);
                        }}
                        {...fieldProps}
                      />
                    </FormControl>
                    <FormDescription>
                      Upload the source language file.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetFile"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Target File</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".txt,.html,.xml,.csv"
                        onChange={(e) => {
                          onChange(e.target.files);
                        }}
                        {...fieldProps}
                      />
                    </FormControl>
                    <FormDescription>
                      Upload the target language file.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={alignmentMutation.isPending}
                className="w-full md:w-auto"
              >
                {alignmentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <AlignLeft className="mr-2 h-4 w-4" />
                    Align Files
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
    return <AlignmentForm />;
  }
  
  // Otherwise return the full page layout
  return (
    <MainLayout title="Bilingual Alignment">
      <div className="container py-6">
        <div className="flex items-center mb-6">
          <AlignLeft className="mr-2 h-6 w-6" />
          <h1 className="text-2xl font-bold">Bilingual Alignment</h1>
        </div>
        <AlignmentForm />
      </div>
    </MainLayout>
  );
}

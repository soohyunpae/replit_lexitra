import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Trash2, Eye, Download } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

// Type definitions
interface DocTemplate {
  id: number;
  name: string;
  description: string | null;
  originalFilename: string;
  filePath: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateStructure {
  id: number;
  templateId: number;
  elementType: string;
  index: number | null;
  styleName: string | null;
  tableIndex: number | null;
  rowIndex: number | null;
  cellIndex: number | null;
  isTranslationTarget: boolean;
}

interface TemplateDetail {
  template: DocTemplate;
  structures: TemplateStructure[];
}

const TemplateManager: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetail | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch templates
  const templatesQuery = useQuery({
    queryKey: ['/api/admin/templates'],
    retry: false
  });

  // Mutation to upload a template
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) return null;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', templateName);
      formData.append('description', templateDescription || '');
      
      return await apiRequest('/api/admin/templates', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type here, let the browser set it with the boundary
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Template uploaded',
        description: 'The template has been successfully uploaded.',
      });
      setFile(null);
      setTemplateName('');
      setTemplateDescription('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/templates'] });
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload the template. Please try again.',
        variant: 'destructive',
      });
      console.error('Template upload error:', error);
    }
  });

  // Mutation to delete a template
  const deleteMutation = useMutation({
    mutationFn: async (templateId: number) => {
      return await apiRequest(`/api/admin/templates/${templateId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Template deleted',
        description: 'The template has been successfully deleted.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/templates'] });
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete the template. Please try again.',
        variant: 'destructive',
      });
      console.error('Template delete error:', error);
    }
  });

  // Mutation to get template details
  const detailsMutation = useMutation({
    mutationFn: async (templateId: number) => {
      return await apiRequest(`/api/admin/templates/${templateId}`);
    },
    onSuccess: (data) => {
      setSelectedTemplate(data);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to load template details.',
        variant: 'destructive',
      });
      console.error('Template details error:', error);
    }
  });

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a DOCX file to upload.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!templateName.trim()) {
      toast({
        title: 'Template name required',
        description: 'Please provide a name for the template.',
        variant: 'destructive',
      });
      return;
    }
    
    uploadMutation.mutate();
  };

  // Handle template deletion
  const handleDelete = (templateId: number) => {
    deleteMutation.mutate(templateId);
  };

  // Handle viewing template details
  const handleViewDetails = (templateId: number) => {
    detailsMutation.mutate(templateId);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Document Template Management</h1>
      
      {/* Upload Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload New Template</CardTitle>
          <CardDescription>
            Upload a DOCX template to use for document translation. The system will analyze 
            the document structure and allow you to mark which elements should be translated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input 
                id="templateName" 
                value={templateName} 
                onChange={(e) => setTemplateName(e.target.value)} 
                placeholder="Enter template name"
                required 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="templateDescription">Description (Optional)</Label>
              <Textarea 
                id="templateDescription" 
                value={templateDescription} 
                onChange={(e) => setTemplateDescription(e.target.value)} 
                placeholder="Enter template description"
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="templateFile">DOCX Template File</Label>
              <Input 
                id="templateFile" 
                type="file" 
                accept=".docx" 
                onChange={handleFileChange} 
                required 
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={uploadMutation.isPending || !file}
              className="w-full"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Template'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Templates</CardTitle>
          <CardDescription>
            Manage your DOCX translation templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templatesQuery.isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : templatesQuery.isError ? (
            <div className="text-center py-8 text-red-500">
              Error loading templates. Please try again.
            </div>
          ) : templatesQuery.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates available. Upload a template to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Original Filename</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templatesQuery.data?.map((template: DocTemplate) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.description || '-'}</TableCell>
                    <TableCell>{template.originalFilename}</TableCell>
                    <TableCell>{new Date(template.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleViewDetails(template.id)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              title="Delete Template"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Template</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this template? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(template.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Template Details Dialog */}
      {selectedTemplate && (
        <AlertDialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
          <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Template Details: {selectedTemplate.template.name}</AlertDialogTitle>
              <AlertDialogDescription>
                Review the structure elements of this template
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4">
              <h3 className="font-semibold mb-2">Template Information</h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <span className="text-muted-foreground">Name:</span> {selectedTemplate.template.name}
                </div>
                <div>
                  <span className="text-muted-foreground">Original File:</span> {selectedTemplate.template.originalFilename}
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Description:</span> {selectedTemplate.template.description || '-'}
                </div>
              </div>
              
              <h3 className="font-semibold mb-2">Structure Elements</h3>
              {selectedTemplate.structures.length === 0 ? (
                <div className="text-muted-foreground">No structure elements defined for this template.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Index</TableHead>
                      <TableHead>Style</TableHead>
                      <TableHead>Table Position</TableHead>
                      <TableHead>Translation Target</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTemplate.structures.map((structure) => (
                      <TableRow key={structure.id}>
                        <TableCell>{structure.elementType}</TableCell>
                        <TableCell>{structure.index !== null ? structure.index : '-'}</TableCell>
                        <TableCell>{structure.styleName || '-'}</TableCell>
                        <TableCell>
                          {structure.tableIndex !== null ? (
                            `Table ${structure.tableIndex}, Row ${structure.rowIndex}, Cell ${structure.cellIndex}`
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {structure.isTranslationTarget ? (
                            <span className="px-2 py-1 rounded-md bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Yes
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-md bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              No
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default TemplateManager;
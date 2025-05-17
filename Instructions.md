
# File Upload Error Analysis & Fix Plan

## Issue Description
The file upload functionality in the project's reference files section is failing with an "File upload error" message when clicking the upload area and selecting files.

## Root Cause Analysis

1. Authentication Token Issue:
- Console logs show JWT malformed errors
- Token verification is failing on the server side
- Error logs indicate missing or invalid authentication headers

2. File Upload Implementation:
- Upload logic in project.tsx exists but needs proper authentication handling
- Current implementation may not be properly passing auth tokens

## Files Involved

1. `client/src/pages/project.tsx`:
- Reference file upload area implementation
- File input ref and click handlers
- Upload mutation logic

2. `client/src/lib/api.ts`:
- API request utilities
- Authentication header handling

## Fix Implementation Plan

### 1. Fix Authentication Token Handling

Update the upload mutation in project.tsx to properly include authentication:

```typescript
const uploadReferences = useMutation({
  mutationFn: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    // Get auth token
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Use fetch with proper auth headers
    const response = await fetch(`/api/projects/${projectId}/references/upload`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload files');
    }

    return response.json();
  }
});
```

### 2. Improve Error Handling

Add better error feedback and handling:

```typescript
const handleFileUpload = async (files: FileList | null) => {
  if (!files || files.length === 0) return;
  
  try {
    await uploadReferences.mutateAsync(Array.from(files));
    toast({
      title: "Success",
      description: "Files uploaded successfully"
    });
  } catch (error) {
    console.error('Upload error:', error);
    toast({
      title: "Upload failed",
      description: error instanceof Error ? error.message : "Failed to upload files",
      variant: "destructive"
    });
  }
};
```

### 3. Implementation Steps

1. Update project.tsx to add proper authentication
2. Enhance error handling and user feedback
3. Verify file input ref connection
4. Test upload functionality with authentication

## Testing Plan

1. Verify authentication token is present
2. Test file selection and upload
3. Verify successful upload to server
4. Confirm proper error handling
5. Test various file types and sizes

## Notes

- The file upload functionality follows the project's file management policy
- Only admins can add reference files
- Proper authentication must be maintained throughout the upload process

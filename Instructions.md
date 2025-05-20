# Lexitra Project Creation and File Processing Workflow Improvements

## 1. Current Issues

### 1.1 Project Creation UX Problems
- Project creation page stays in "Creating" state during file processing
- Users cannot tell if project creation succeeded or failed
- Large PDF files cause long waiting times without progress indication
- No separation between project creation and file processing steps

### 1.2 File Processing Issues
- Synchronous file processing blocks project creation feedback
- No progress indication for file preprocessing
- Users cannot access project until all files are processed

## 2. Proposed Solution

### 2.1 Separate Project Creation from File Processing
1. Quick Project Creation:
   - Create project record immediately after file upload
   - Show success message and close creation dialog
   - Return user to project list page

2. Background File Processing:
   - Process files asynchronously after project creation
   - Show file status in project list/detail view
   - Disable editor access until file is ready

### 2.2 UI Status Indicators
1. Project List View:
   - Show file processing status per project
   - Display "Processing..." status with progress indicator
   - Enable/disable "Open Editor" based on file status

2. File Status States:
   - `processing`: File is being preprocessed
   - `ready`: File is ready for editing
   - `error`: Processing failed (with error details)

### 2.3 Editor Access Control
- Disable "Open Editor" button while files are processing
- Show processing progress in the project detail view
- Maintain existing claim check (only claimed projects are editable)

## 3. Implementation Plan

### 3.1 Database Updates
```sql
ALTER TABLE files
ADD COLUMN processing_status TEXT DEFAULT 'processing'
CHECK (processing_status IN ('processing', 'ready', 'error'));
```

### 3.2 Backend Changes
1. Modify project creation endpoint:
   - Create project record first
   - Queue file processing tasks
   - Return success immediately

2. Add file processing service:
   - Process files in background
   - Update file status on completion
   - Handle processing errors

### 3.3 Frontend Updates
1. Project creation dialog:
   - Show success message after project creation
   - Close dialog and refresh project list
   - Display new project with processing status

2. Project list/detail views:
   - Add file status indicators
   - Implement "Open Editor" button logic
   - Show processing progress

## 4. Expected User Flow

1. Project Creation:
   - User uploads files and submits form
   - Success message appears immediately
   - Returns to project list showing new project

2. File Processing:
   - Project appears in list with "Processing" status
   - Files are processed in background
   - Status updates automatically when ready

3. Editor Access:
   - Editor button is disabled while processing
   - Button enables when files are ready
   - Normal claim checks still apply

## 5. Success Criteria

1. Improved User Experience:
   - Quick project creation feedback
   - Clear file processing status
   - No blocking operations

2. Maintainable Implementation:
   - Separate concerns (creation vs. processing)
   - Clear status management
   - Robust error handling

3. Consistent Behavior:
   - Reliable status updates
   - Proper access control
   - Clear user feedback

## 6. Testing Plan

1. Project Creation:
   - Verify immediate success feedback
   - Check project appears in list
   - Confirm status indicators

2. File Processing:
   - Test with various file sizes
   - Verify background processing
   - Check status updates

3. Editor Access:
   - Verify button state changes
   - Test claim functionality
   - Confirm error handling

# Korean Filename Encoding Issue Analysis and Solution

## Problem Description
- Korean filenames are displaying as garbled text (e.g., `ë°ë¤_ìí_ko.docx`)
- This occurs in file uploads and file processing operations
- The issue appears in both storage and display of filenames

## Root Cause Analysis

After reviewing the codebase, several encoding-related issues were identified:

1. File Upload Handling (server/routes.ts):
- Current multer configuration doesn't properly handle non-ASCII filenames
- Binary-to-string conversion issues in the filename normalization process

2. File Processing (server/routes.ts):
- PDF text extraction and file path handling lacks proper encoding support
- File path construction doesn't account for UTF-8 filenames

## Solution Implementation Plan

### 1. Update Multer Configuration

The main issue is in the multer storage configuration where filename processing needs proper UTF-8 handling. Key fixes needed:

- Normalize filenames using UTF-8
- Add proper buffer handling for binary filename data
- Implement consistent filename encoding across storage and retrieval

### 2. File Path Handling

Improve file path handling in both storage and processing:

- Use Buffer for binary data handling
- Implement consistent UTF-8 normalization
- Add proper encoding checks in file operations

### 3. Code Changes Required

The following files need to be modified:

1. server/routes.ts:
- Update multer configuration
- Improve filename processing
- Add proper encoding handling for file operations

2. client/src/components/translation/doc-review-editor.tsx:
- Update filename display handling
- Add proper decoding for Korean characters

## Implementation Details

Key changes to implement:

1. Multer Configuration Update:
```typescript
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // ... existing destination code ...
  },
  filename: function (req, file, cb) {
    // Properly decode and normalize the filename
    const decodedName = Buffer.from(file.originalname, 'binary').toString('utf8');
    const normalizedName = decodedName.normalize('NFC');

    // Generate unique filename while preserving original name
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const safeFileName = `${timestamp}-${randomStr}-${normalizedName}`;

    cb(null, safeFileName);
  }
});
```

2. File Processing Update:
```typescript
function processFile(file: Express.Multer.File) {
  // Decode and normalize the filename
  const normalizedFilename = file.originalname.normalize('NFC');

  // Use normalized filename in paths
  const outputPath = path.join(
    outputDir,
    `${Date.now()}-${normalizedFilename}`
  );

  // ... rest of file processing ...
}
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
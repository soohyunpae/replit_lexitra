# Template Upload Feature Debug Guide

## Problem Analysis

The template upload feature is failing due to missing database tables and columns. The main issues are:

1. Missing `template_fields` table
2. Missing `placeholder_data` column in `doc_templates` table 
3. Missing `placeholder` column in `template_fields` table

## Solution Plan

### 1. Database Schema Update

We need to create SQL migration for the template-related tables with proper columns:

```sql
-- Create doc_templates table
CREATE TABLE IF NOT EXISTS doc_templates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    docx_file_path TEXT NOT NULL,
    placeholder_data JSONB,
    use_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create template_fields table
CREATE TABLE IF NOT EXISTS template_fields (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES doc_templates(id) ON DELETE CASCADE,
    placeholder TEXT NOT NULL,
    field_type TEXT DEFAULT 'text',
    description TEXT,
    is_required BOOLEAN DEFAULT true,
    is_translatable BOOLEAN DEFAULT true,
    order_index INTEGER,
    sample_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_template_fields_template_id ON template_fields(template_id);
```

### 2. Implementation Steps

1. Create new migration file with above SQL
2. Run the migration
3. Test template upload again
4. Verify data insertion in both tables

### 3. Implementation Details

The template upload flow should:

1. Save uploaded DOCX file
2. Extract placeholders using docx-templater
3. Create template record with placeholders data
4. Create field records for each placeholder
5. Return success response

### 4. Testing Plan

1. Upload a test DOCX template
2. Verify file storage
3. Check database records
4. Validate field extraction
5. Test template usage

## Current Status

Template upload is non-functional due to missing database schema. After implementing the above solution, the feature should work as expected.
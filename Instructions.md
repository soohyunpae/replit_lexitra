
# Template Upload Feature Debug Guide

## Problem Analysis

The template upload feature is failing due to database schema mismatches. There are three critical issues:

1. The `doc_templates` table is missing the `placeholder_data` JSONB column
2. The `template_fields` table structure doesn't match the application code
3. The database indexes are not properly created

## Root Cause

The database schema defined in the migration files and the schema used in the application code (docx_template_service.ts) are out of sync. The application expects certain columns that don't exist in the database.

## Solution Plan

### 1. Drop and Recreate Tables

First, we need to drop the existing tables and recreate them with the correct schema:

```sql
-- Drop existing tables first to avoid conflicts
DROP TABLE IF EXISTS template_fields CASCADE;
DROP TABLE IF EXISTS doc_templates CASCADE;

-- Create doc_templates table with correct schema
CREATE TABLE doc_templates (
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

-- Create template_fields table with correct schema
CREATE TABLE template_fields (
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

-- Add necessary indexes
CREATE INDEX idx_template_fields_template_id ON template_fields(template_id);
CREATE INDEX idx_doc_templates_created_by ON doc_templates(created_by);
```

### 2. Implementation Steps

1. Execute the above SQL to recreate the tables with correct schema
2. Test template upload again to verify database operations
3. Monitor for any additional errors in the application logs

### 3. Verification Checklist

After applying the changes, verify:

- [ ] Template file upload succeeds
- [ ] Template metadata is saved in doc_templates
- [ ] Template fields are correctly extracted and saved
- [ ] Template preview works
- [ ] Template deletion works

## Current Status

Template upload is failing due to database schema mismatch. After implementing the above solution, particularly recreating the tables with the correct schema, the feature should work as expected.

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
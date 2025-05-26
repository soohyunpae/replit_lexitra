
-- Add template-related columns to projects table
ALTER TABLE projects 
ADD COLUMN template_id INTEGER,
ADD COLUMN template_match_score REAL;

-- Add foreign key constraint
ALTER TABLE projects 
ADD CONSTRAINT projects_template_id_fk 
FOREIGN KEY (template_id) REFERENCES doc_templates(id);

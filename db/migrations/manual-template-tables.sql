-- Create doc_templates table
CREATE TABLE IF NOT EXISTS "doc_templates" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "docx_file_path" TEXT NOT NULL,
  "use_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_by" INTEGER NOT NULL REFERENCES "users"("id")
);

-- Create template_structures table
CREATE TABLE IF NOT EXISTS "template_structures" (
  "id" SERIAL PRIMARY KEY,
  "template_id" INTEGER NOT NULL REFERENCES "doc_templates"("id"),
  "segment_type" TEXT NOT NULL,
  "table_index" INTEGER,
  "row_index" INTEGER,
  "cell_index" INTEGER,
  "style_name" TEXT,
  "is_translation_target" BOOLEAN NOT NULL DEFAULT TRUE,
  "path_selector" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS "template_structures_template_id_idx" ON "template_structures" ("template_id");
CREATE INDEX IF NOT EXISTS "doc_templates_created_by_idx" ON "doc_templates" ("created_by");
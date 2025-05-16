// File Type
export interface File {
  id: number;
  name: string;
  content: string;
  projectId: number;
  createdAt: string;
  updatedAt: string;
}

// Project Type
export interface Project {
  id: number;
  name: string;
  description?: string;
  sourceLanguage: string;
  targetLanguage: string;
  userId?: number;
  status?: 'Unclaimed' | 'Claimed' | 'Completed';
  claimedBy?: number;
  claimedAt?: string;
  completedAt?: string;
  claimer?: {
    id: number;
    username: string;
    role?: string;
  };
  createdAt: string;
  updatedAt: string;
  files?: File[];
}

// Translation Unit Type
export interface TranslationUnit {
  id: number;
  source: string;
  target?: string;
  status: string; // 'Draft', 'Reviewed', 'Rejected'
  origin?: string; // 'MT', 'Fuzzy', '100%', 'HT'
  comment?: string;
  fileId: number;
  createdAt: string;
  updatedAt: string;
  modified?: boolean;
}

// Translation Memory Type
export interface TranslationMemory {
  id: number;
  source: string;
  target: string;
  status: string;
  context?: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: string;
  updatedAt: string;
}

// Glossary Type
export interface Glossary {
  id: number;
  source: string;
  target: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: string;
  updatedAt: string;
}

// Status for translation segments
export type StatusType = 'MT' | '100%' | 'Fuzzy' | 'Edited' | 'Reviewed' | 'Rejected';

// Origin for translation sources
export type OriginType = 'MT' | 'Fuzzy' | '100%' | 'HT';

import * as path from 'path';

// Repository root directory
export const REPO_ROOT = process.cwd();

// Upload directories
export const UPLOAD_DIR = path.join(REPO_ROOT, 'uploads');
export const TEMP_UPLOAD_DIR = path.join(UPLOAD_DIR, 'tmp');
export const PROCESSED_DIR = path.join(UPLOAD_DIR, 'processed');
export const REFERENCES_DIR = path.join(UPLOAD_DIR, 'references');
export const CACHE_DIR = path.join(UPLOAD_DIR, 'cache');

// API prefix for all endpoints
export const API_PREFIX = '/api';

// Session configuration
export const SESSION_SECRET = process.env.SESSION_SECRET || 'lexitra-dev-secret';
export const SESSION_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// File size limits
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

// Translation settings
export const DEFAULT_SOURCE_LANGUAGE = 'ko';
export const DEFAULT_TARGET_LANGUAGE = 'en';

// Feature flags
export const ENABLE_BATCH_TRANSLATION = true;
export const ENABLE_CACHED_PROCESSING = true;
# Architecture Overview

## 1. Overview

Lexitra is a full-stack translation management system designed to help translators manage projects, handle translation memory, maintain glossaries, and process various file formats. The application follows a client-server architecture with a React frontend and a Node.js/Express backend, using PostgreSQL for data persistence.

The system supports:
- Project management with assignment capabilities
- Translation memory features for reusing previous translations
- Glossary management for consistent terminology
- File upload and processing
- User authentication with both session and token-based mechanisms
- Admin-specific tooling for data management

## 2. System Architecture

### High-Level Architecture

The application follows a three-tier architecture:

1. **Presentation Layer**: React-based Single Page Application (SPA) with UI components from Shadcn UI
2. **Application Layer**: Express.js server handling API requests, business logic, and authentication
3. **Data Layer**: PostgreSQL database accessed via Drizzle ORM

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  Express Server │────▶│    PostgreSQL   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         ▲                      │                        │
         │                      │                        │
         └──────────────────────┘                        │
                  API                                    │
                                                         │
┌─────────────────┐                                      │
│                 │                                      │
│   OpenAI API    │◀─────────────────────────────────────┘
│                 │              Integration
└─────────────────┘
```

### Backend Architecture

The server uses Express.js with a modular structure:
- API routes for different resources (projects, files, translation memory, etc.)
- Authentication middleware for protecting routes
- Services for business logic and external API integration (OpenAI)

### Frontend Architecture

The React frontend follows a component-based architecture:
- UI components from Shadcn UI library
- Page components for different application sections
- Custom hooks for shared logic (authentication, API requests)
- Context providers for application state management

## 3. Key Components

### Backend Components

1. **Authentication System**:
   - Dual-mode authentication with both session and JWT token support
   - Role-based authorization (user/admin)
   - Middleware for route protection

2. **Database Layer**:
   - Drizzle ORM for database interactions
   - PostgreSQL database with schemas for users, projects, files, translation units, etc.
   - Migration management with Drizzle Kit

3. **API Routes**:
   - RESTful endpoints for managing resources
   - File upload handling with Multer
   - Error handling middleware

4. **Translation Services**:
   - OpenAI integration for machine translation
   - Similarity calculation for fuzzy matching

### Frontend Components

1. **UI Framework**:
   - Shadcn UI components with Tailwind CSS for styling
   - Dark/light theme support

2. **State Management**:
   - React Query for server state management and caching
   - Context API for application state (auth, theme)

3. **Navigation**:
   - Wouter for client-side routing

4. **Form Management**:
   - React Hook Form with Zod validation

## 4. Data Flow

### Authentication Flow

1. **Session-based Authentication**:
   - User submits credentials → Server validates → Session cookie set
   - Subsequent requests include cookie → Server validates session

2. **Token-based Authentication**:
   - User submits credentials → Server validates → JWT token returned
   - Client stores token → Token included in Authorization header for subsequent requests

### Project Translation Flow

1. User creates/claims a translation project
2. Files are uploaded and processed into translation units
3. Translation occurs with:
   - Machine translation (OpenAI)
   - Translation memory matches
   - Glossary term suggestions
4. Completed translations are saved to database
5. Translations can be exported in various formats

### Admin Operations Flow

1. Admin uploads translation memory data
2. System processes and stores entries
3. Admin can clean up and align translation memory
4. Translation projects leverage the enhanced translation memory

## 5. External Dependencies

### Core Dependencies

- **React**: Frontend framework
- **Express**: Backend server framework
- **PostgreSQL**: Database (via Neon serverless)
- **Drizzle ORM**: Database access layer
- **Vite**: Build tool and development server

### Key External Services

- **OpenAI API**: Machine translation capabilities
- **Neon Database**: PostgreSQL provider

### Other Notable Dependencies

- **Shadcn UI**: Component library
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Data fetching and caching
- **Zod**: Schema validation
- **JWT**: Token-based authentication

## 6. Deployment Strategy

The application is configured for deployment on Replit, as indicated by the `.replit` configuration file.

### Build Process

1. Frontend (Vite):
   - Builds optimized assets with `vite build`
   - Output directed to `dist/public`

2. Backend (ESBuild):
   - Bundles server code with `esbuild`
   - Preserves external package references

### Runtime Configuration

- Environment variables for sensitive data (DATABASE_URL, JWT_SECRET, OPENAI_API_KEY)
- Production mode configuration with `NODE_ENV=production`

### Deployment Setup

- Configured for autoscaling on Replit
- Server listens on port 5000, mapped to external port 80
- Static assets served from the `dist/public` directory

## 7. Database Schema

### Core Entities

1. **Users**
   - Authentication and permission data
   - Roles (user/admin)

2. **Projects**
   - Translation project metadata
   - Source/target language pairs
   - Status tracking (unclaimed, claimed, completed)
   - Assignment information

3. **Files**
   - Project-associated files
   - File metadata and content references

4. **Translation Units**
   - Segments for translation
   - Source and target text
   - Status tracking

5. **Translation Memory**
   - Previously translated segments
   - Language pair information
   - Match quality metadata

6. **Glossary**
   - Terminology pairs
   - Language and domain information
   - Usage context
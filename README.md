# Multi-Tenant RAG Customer Service Platform

> **An AI-powered, multi-tenant customer service platform with Retrieval-Augmented Generation, real-time event-driven architecture, role-based access control, and workspace isolation.**

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [System Design](#system-design)
  - [Backend Architecture](#backend-architecture)
  - [Frontend Architecture](#frontend-architecture)
  - [Database Schema](#database-schema)
  - [Event-Driven Pipeline](#event-driven-pipeline)
  - [RAG Pipeline](#rag-pipeline)
- [Security Model](#security-model)
  - [Authentication](#authentication)
  - [Multi-Tenant Isolation](#multi-tenant-isolation)
  - [Role-Based Access Control](#role-based-access-control)
  - [Input Validation](#input-validation)
  - [Security Headers](#security-headers)
- [API Reference](#api-reference)
  - [Authentication](#api-authentication)
  - [Chat](#api-chat)
  - [Documents (Knowledge Base)](#api-documents)
  - [Workspace](#api-workspace)
  - [Analytics](#api-analytics)
  - [Canned Responses](#api-canned-responses)
  - [Health](#api-health)
- [Workers & Queues](#workers--queues)
  - [Document Ingestion Worker](#document-ingestion-worker)
  - [Event Worker](#event-worker)
  - [Aggregation Worker](#aggregation-worker)
- [Real-Time System (Socket.IO)](#real-time-system-socketio)
- [Observability](#observability)
  - [Structured Logging](#structured-logging)
  - [Request ID Tracing](#request-id-tracing)
  - [Health Checks](#health-checks)
  - [Graceful Shutdown](#graceful-shutdown)
- [Error Handling](#error-handling)
- [Frontend Architecture](#frontend-architecture-1)
  - [Pages & Routes](#pages--routes)
  - [Components](#components)
  - [State Management](#state-management)
- [Widget System](#widget-system)
- [Testing Strategy](#testing-strategy)
- [Environment Configuration](#environment-configuration)
- [Getting Started](#getting-started)
- [Development](#development)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐     │
│  │ Dashboard│  │   Login  │  │  Register│  │ Chat Widget (3rd │     │
│  │ (Next.js)│  │          │  │          │  │   Party Embed)   │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘     │
│       │             │             │                  │              │
└───────┼─────────────┼─────────────┼──────────────────┼──────────────┘
        │             │             │                  │
        ▼             ▼             ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Express)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐     │
│  │  Helmet  │  │   CORS   │  │  Pino    │  │   Request ID     │     │
│  │(Sec Hdrs)│  │(Origins) │  │(Logging) │  │   (UUID Trace)   │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    MIDDLEWARE STACK                          │   │
│  │  authMiddleware → tenantMiddleware → validate(schema)        │   │
│  │  → roleMiddleware(roles) → controller → service              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐     │
│  │   Auth   │  │   Chat   │  │Document  │  │   Workspace      │     │
│  │ Module   │  │  Module  │  │ Module   │  │   Module         │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                           │
│  │Analytics │  │  Canned  │  │   RAG    │                           │
│  │ Module   │  │ Responses│  │  Service │                           │
│  └──────────┘  └──────────┘  └──────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DATA & INFRASTRUCTURE LAYER                     │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐     │
│  │  PostgreSQL    │  │     Redis      │  │     Ollama         │     │
│  │  + pgvector    │  │  + BullMQ      │  │  (Local LLM)       │     │
│  │                │  │  + Socket.IO   │  │                    │     │
│  │  - Workspaces  │  │                │  │  - nomic-embed-text│     │
│  │  - Users/Roles │  │  - Queues      │  │  - gemma4:e4b      │     │
│  │  - Conversations│ │  - Pub/Sub     │  │                    │     │
│  │  - Documents   │  │  - Session Mgmt│  └────────────────────┘     │
│  │  - Embeddings  │  └────────────────┘                             │
│  │  - Analytics   │                                                 │
│  └────────────────┘                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Customer Message
  → POST /api/chat/message (tenantMiddleware)
  → ChatController.customerMessage
  → ChatService.processCustomerMessage
      ├─ if isPreview → RAGService.generateResponse → return
      ├─ Conversation lookup / creation
      ├─ Auto-resolution check (Arabic/English keywords)
      ├─ Save user message to DB
      ├─ emitEvent(MESSAGE_SENT) → Event Queue
      ├─ if ESCALATED → return polite redirect
      └─ RAGService.generateResponse
           ├─ getEmbedding(query, isQuery=true) → Ollama
           ├─ pgvector similarity search (cosine distance > 0.3)
           ├─ Build context from top-6 chunks
           └─ /api/generate (LLM) with system prompt + context
      ├─ Escalation trigger check (AI admits defeat + suggests human)
      ├─ Save AI response to DB
      ├─ emitEvent(MESSAGE_SENT) → Event Queue
      └─ return { response, sources, conversationId }

Event Worker (async)
  ← eventQueue(MESSAGE_SENT)
  → io.to(conversation_${id}).emit('new_message', message)
  → io.to(workspace_${wsId}).emit('chat_updated', ...)
  → prisma.event.create({ type, workspaceId })
```

---

## Tech Stack

### Backend
| Category | Technology | Purpose |
|----------|-----------|---------|
| Runtime | Node.js 20 + TypeScript 5.9 | Strict typing, ES2020 target |
| Framework | Express 4.22 | HTTP server, routing, middleware |
| Database ORM | Prisma 5.22 + PostgreSQL 16 | Type-safe queries, migrations, pgvector extension |
| Vector Storage | pgvector (768-dim) | Cosine similarity search on document embeddings |
| Embeddings | nomic-embed-text (via Ollama) | 768-dim prefix-aware embeddings (`search_document:` / `search_query:`) |
| LLM | gemma4:e4b (via Ollama) | Response generation with RAG context |
| Queue | BullMQ 4.18 + Redis 7 | Document ingestion, event processing, daily aggregation |
| Real-Time | Socket.IO 4.8 | Bidirectional event streaming (Widget + Dashboard) |
| Auth | bcryptjs + jsonwebtoken | Password hashing, JWT stateless auth |
| Validation | Zod 3.25 | Runtime schema validation for all API inputs |
| Logging | Pino 10 + pino-http | Structured JSON logging with request correlation |
| Security | Helmet 8 | HTTP security headers |
| File Upload | Multer (memory storage) | PDF/DOCX/TXT parsing via pdf-parse + mammoth |
| Testing | Vitest 4 + Supertest | Unit/integration tests, mocking |
| CI | GitHub Actions | Typecheck → Test → Build pipeline |

### Frontend
| Category | Technology | Purpose |
|----------|-----------|---------|
| Framework | Next.js 14.2 (App Router) | SSR, file-based routing, API client |
| Language | TypeScript 5.9 | Type safety |
| Styling | Tailwind CSS 3.4 | Utility-first CSS |
| Icons | Lucide React | Icon library |
| Markdown | react-markdown + remark-gfm | AI response rendering |
| Real-Time | socket.io-client 4.8 | WebSocket connections |
| HTTP | Axios 1.6 | API client with interceptors |

---

## System Design

### Backend Architecture

#### Middleware Stack (Execution Order)
```
Request
  → helmet()                          Security headers (XSS, nosniff, etc.)
  → cors()                            CORS with allowed origins
  → requestIdMiddleware               X-Request-Id UUID generation
  → pinoHttp({ logger })              HTTP request/response logging
  → express.json({ limit: '10mb' })   Body parsing with size limit
  → [route-specific middleware]
      → authMiddleware                JWT verification → req.userId
      → tenantMiddleware              x-workspace-id header → req.workspaceId
      → validate(schema)              Zod schema validation → 400 on failure
      → roleMiddleware(roles)         RBAC check → 403 on denial
      → controller method             Business logic (no try/catch)
  → errorHandler                      Catches all errors → consistent JSON
```

#### Module Structure
```
src/
├── modules/
│   ├── auth/           # Registration, login, invitations, JWT management
│   ├── chat/           # Conversations, messaging, escalation, locking
│   ├── document/       # Knowledge base CRUD, file upload, chunking
│   ├── workspace/      # Workspace CRUD, branding, member management
│   ├── analytics/      # Dashboard stats, AI-generated insights
│   └── canned/         # Canned response snippets for agents
├── services/
│   ├── rag/            # Embedding generation, vector search, LLM prompt
│   └── queue/          # (Deprecated — use lib/queue directly)
├── middleware/
│   ├── auth.middleware.ts      # JWT verification
│   ├── tenant.middleware.ts    # Workspace isolation header
│   ├── role.middleware.ts      # RBAC with resolveWorkspaceRole helper
│   ├── requestId.ts            # UUID per request
│   └── errorHandler.ts         # Centralized error response
├── workers/
│   ├── ingestion.worker.ts     # Document chunking + embedding (BullMQ)
│   ├── event.worker.ts         # Real-time event dispatch (Socket.IO)
│   └── aggregation.worker.ts   # Daily analytics aggregation (BullMQ)
├── lib/
│   ├── queue.ts       # Shared Redis connection + Queue definitions
│   ├── events.ts      # AppEvent enum + emitEvent helper
│   ├── socket.ts      # Socket.IO server initialization
│   ├── logger.ts      # Pino logger instance
│   ├── errors.ts      # AppError class + asyncHandler wrapper
│   ├── env.ts         # Environment variable validation + typed config
│   └── validation.ts  # Zod schemas + validate middleware
├── db/
│   └── prisma.ts      # PrismaClient singleton with event hooks
└── index.ts           # App entry point, middleware stack, health check, shutdown
```

### Database Schema

```prisma
// Core Tenant Model
model Workspace {
  id              String          @id @default(uuid())
  name            String
  ownerId         String
  owner           User            @relation("WorkspaceOwner")
  widgetName      String          @default("Support AI")
  widgetColor     String          @default("#3B82F6")
  welcomeMessage  String          @default("Hello! I'm your AI assistant...")
  users           User[]          // M:N via implicit join table
  conversations   Conversation[]
  documents       Document[]
  events          Event[]
  analytics       AnalyticsDaily[]
  invitations     Invitation[]
  cannedResponses CannedResponse[]
  insightReports  InsightReport[]
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  @@index([id])
}

// Role-Based Access
enum Role {
  PLATFORM_OWNER    // Super-admin across all workspaces
  WORKSPACE_OWNER   // Inferred from workspace.ownerId (not stored on User)
  ADMIN             // Can manage agents, view insights, configure workspace
  AGENT             // Can view and reply to escalated conversations
}

model User {
  id                  String         @id @default(uuid())
  name                String?
  email               String         @unique
  password            String         // bcrypt hashed
  role                Role           @default(AGENT)  // Global fallback role
  isOnline            Boolean        @default(false)
  workspaces          Workspace[]    // M:N membership
  ownedWorkspaces     Workspace[]    @relation("WorkspaceOwner")
  messages            Message[]
  assignedConversations Conversation[] @relation("AssignedConversations")
  lockedConversations   Conversation[] @relation("LockedConversations")
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
}

// Conversations & Messaging
enum ConversationStatus {
  AI_ACTIVE    // Being handled by the AI
  ESCALATED    // Transferred to human agent
  CLOSED       // Resolved
}

model Conversation {
  id              String             @id @default(uuid())
  customerEmail   String?
  status          ConversationStatus @default(AI_ACTIVE)
  workspaceId     String
  workspace       Workspace          @relation(fields: [workspaceId], references: [id])
  assignedToId    String?            // Agent assigned via round-robin
  assignedTo      User?              @relation("AssignedConversations")
  lockedById      String?            // Agent currently handling
  lockedBy        User?              @relation("LockedConversations")
  lockedAt        DateTime?
  messages        Message[]
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  @@index([workspaceId])
  @@index([status])
  @@index([assignedToId])
}

model Message {
  id             String       @id @default(uuid())
  content        String
  role           String       // 'user', 'assistant', 'system'
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  userId         String?      // Agent who sent (null for AI/customer)
  user           User?        @relation
  sources        String[]     @default([])  // Source filenames from RAG
  createdAt      DateTime     @default(now())
  @@index([conversationId])
}

// Knowledge Base & Vector Search
model Document {
  id          String         @id @default(uuid())
  filename    String
  content     String
  status      String         @default("PENDING") // PENDING → PROCESSING → COMPLETED | ERROR
  workspaceId String
  workspace   Workspace      @relation(fields: [workspaceId], references: [id])
  chunks      DocumentChunk[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  @@index([workspaceId])
}

model DocumentChunk {
  id         String                 @id @default(uuid())
  content    String                 // 150-word chunk with 45-word overlap
  embedding  Unsupported("vector(768)")?  // nomic-embed-text embedding
  documentId String
  document   Document               @relation(fields: [documentId], references: [id], onDelete: Cascade)
  @@index([documentId])
}

// Analytics
model AnalyticsDaily {
  id            String   @id @default(uuid())
  date          DateTime
  workspaceId   String
  workspace     Workspace @relation
  totalChats    Int      @default(0)
  totalMessages Int      @default(0)
  escalations   Int      @default(0)
  avgResolution Int      @default(0)  // Average resolution time in seconds
  @@unique([date, workspaceId])
}

model Event {
  id          String   @id @default(uuid())
  type        String
  workspaceId String
  workspace   Workspace @relation
  createdAt   DateTime @default(now())
}

// Invitations & Snippets
model Invitation {
  id          String   @id @default(uuid())
  email       String
  token       String   @unique            // JWT with 7-day expiry
  workspaceId String
  workspace   Workspace @relation
  role        Role     @default(AGENT)
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}

model CannedResponse {
  id          String   @id @default(uuid())
  title       String
  content     String                     // Full message template
  shortcut    String?                    // Quick-access alias (e.g., "return-policy")
  workspaceId String
  workspace   Workspace @relation
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([workspaceId])
}
```

### Event-Driven Pipeline

```
┌────────────┐    emitEvent()    ┌────────────┐    BullMQ     ┌──────────────┐
│ Controller  │ ──────────────→  │  Event     │ ────────────→ │ Event Worker  │
│ / Service   │                  │  Queue     │                │              │
│             │                  │  (Redis)   │                │ socket.io    │
│ emitEvent({ │                  └────────────┘                │   .emit()    │
│   workspaceId,                                              │              │
│   type,         ┌─────────────────────────────────────────┐  │ prisma.event │
│   data          │  AppEvent Enum                           │  │   .create()  │
│ })              │                                          │  └──────────────┘
│                 │  MESSAGE_SENT     - New message in conv  │
│                 │  NEW_CHAT         - New conversation     │
│                 │  CHAT_ESCALATED   - Escalated to human   │
│                 │  CHAT_RESOLVED    - Marked as resolved   │
│                 │  BRANDING_UPDATED - Widget config changed│
│                 │  DOCUMENT_PROCESSED - Ingestion complete │
│                 │  CHAT_UPDATED     - Lock/unlock/assign   │
│                 │  TYPING_STATUS    - Agent typing indicator│
│                 └─────────────────────────────────────────┘
```

### RAG Pipeline

```
User Query ("What are your return hours?")
  │
  ▼
getEmbedding(query, isQuery=true)
  → POST /api/embeddings { model: 'nomic-embed-text', prompt: 'search_query: What are your return hours?' }
  → Returns 768-dim vector
  │
  ▼
pgvector Similarity Search
  → SELECT content, filename, 1 - (embedding <=> $vector) as similarity
  → WHERE workspaceId = $wsId AND similarity > 0.3
  → ORDER BY similarity DESC LIMIT 6
  │
  ▼
Context Assembly
  → Chunk texts joined with \n\n
  → Source filenames deduplicated
  → Conversation history appended
  │
  ▼
LLM Generation
  → POST /api/generate { model: 'gemma4:e4b', prompt: 'System: ... Context: ... History: ... User: ...' }
  → stream: false
  │
  ▼
Response Post-Processing
  → Check AI admits defeat + suggests human → auto-escalate
  → Check user explicitly requests human → auto-escalate
  → Check bilingual resolution keywords (Arabic/English) → auto-resolve
  │
  ▼
Return { response, sources, conversationId }
```

### Document Ingestion Pipeline

```
Upload → DocumentController.upload
  │
  ▼
prisma.document.create({ status: 'PROCESSING' })
  │
  ▼
ingestionQueue.add('process-document', { documentId, content, fileBuffer, ... })
  │  (3 retries with exponential backoff, 5s initial delay)
  ▼
IngestionWorker.processor(job)
  │
  ├─ Parse file
  │   ├─ application/pdf     → pdf-parse → text
  │   ├─ application/vnd...  → mammoth → text
  │   └─ text/plain          → buffer.toString('utf-8')
  │
  ├─ Sliding Window Chunking
  │   ├─ Split by word boundaries
  │   ├─ 150 words per chunk
  │   ├─ 45 word overlap
  │   └─ O(n) time complexity
  │
  ├─ Generate Embeddings (sequential, concurrency: 2)
  │   ├─ ragService.getEmbedding(chunkContent) → 768-dim vector
  │   └─ INSERT INTO "DocumentChunk" (id, content, documentId, embedding)
  │
  ├─ prisma.document.update({ status: 'COMPLETED' })
  │
  └─ emitEvent(DOCUMENT_PROCESSED) → Dashboard real-time update
```

---

## Security Model

### Authentication

- **JWT-based stateless authentication**
- Token signed with `JWT_SECRET` (validated at startup — app crashes if missing)
- Payload: `{ userId, workspaceId }`
- No refresh tokens (MVP — can be added)
- Hardcoded fallback removed — `JWT_SECRET` must be set via environment
- Token verified in `authMiddleware` before every protected route

### Multi-Tenant Isolation

Every request to a workspace-specific endpoint must include `x-workspace-id` header:

```
GET /api/chat
x-workspace-id: uuid-of-workspace
Authorization: Bearer <jwt>
```

- `tenantMiddleware` extracts `x-workspace-id` → `req.workspaceId`
- All service queries filter by `workspaceId` in WHERE clauses
- Cross-workspace access returns 403
- Even authenticated users cannot access data from workspaces they don't belong to
- `roleMiddleware` verifies workspace membership before role resolution

### Role-Based Access Control

Roles are resolved via `resolveWorkspaceRole(workspace, userId, globalRole)`:

```
resolveWorkspaceRole logic:
  1. If globalRole === 'PLATFORM_OWNER' → return 'PLATFORM_OWNER'
  2. If workspace.ownerId === userId → return 'WORKSPACE_OWNER'
  3. Otherwise → return globalRole (ADMIN or AGENT)
```

| Role | Can |
|------|-----|
| PLATFORM_OWNER | Everything across all workspaces |
| WORKSPACE_OWNER | Manage members, roles, branding, insights, settings. Delete workspace |
| ADMIN | View insights, manage canned responses, configure widget |
| AGENT | View/respond to escalated chats, use canned responses |

Route protection examples:
```typescript
router.get('/insights/history', roleMiddleware(['PLATFORM_OWNER', 'ADMIN', 'WORKSPACE_OWNER']), ...)
router.post('/:id/reply', authMiddleware, ...)  // Any authenticated user
router.get('/branding/public', ...)             // No auth (public widget)
```

### Input Validation

All request bodies are validated with Zod before reaching controllers:

```typescript
// Example: registerSchema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  workspaceName: z.string().min(1, 'Workspace name is required'),
  name: z.string().optional(),
});

// Failure response:
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

Schemas defined:
- `registerSchema`, `loginSchema`, `acceptInviteSchema`
- `createWorkspaceSchema`, `updateWorkspaceSchema`
- `sendMessageSchema`, `agentReplySchema`, `typingStatusSchema`
- `cannedResponseSchema`, `brandingSchema`
- `updateRoleSchema`, `updateStatusSchema`, `inviteSchema`

### Security Headers (Helmet)

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-XSS-Protection` | `0` (deprecated, modern XSS protection) |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` |
| `Content-Security-Policy` | Default Helmet config |
| `Referrer-Policy` | `no-referrer` |

---

## API Reference

### API Authentication

All API responses follow a consistent format:

**Success:**
```json
{ "field": "value" }
```

**Error:**
```json
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
```

**Validation Error:**
```json
{ "error": "Validation failed", "details": [{ "field": "email", "message": "Invalid email" }] }
```

Standard HTTP status codes:
| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 204 | Deleted (no content) |
| 400 | Validation error or bad request |
| 401 | Missing or invalid authentication |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (e.g., conversation already locked) |
| 500 | Internal server error |

---

### API Authentication Endpoints

Base path: `/api/auth`

#### `POST /api/auth/register`
Create a new workspace owner account with a workspace.

**Request:**
```json
{
  "email": "user@company.com",
  "password": "securePassword123",
  "workspaceName": "Acme Support",
  "name": "John Doe"
}
```

**Response** `201`:
```json
{
  "user": { "id": "uuid", "email": "user@company.com", "role": "WORKSPACE_OWNER", ... },
  "workspace": { "id": "uuid", "name": "Acme Support", ... },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Validation:** `email` must be valid email, `password` ≥ 8 chars, `workspaceName` ≥ 1 char.

#### `POST /api/auth/login`
Authenticate and receive a JWT.

**Request:**
```json
{ "email": "user@company.com", "password": "securePassword123" }
```

**Response** `200`:
```json
{
  "user": { "id": "uuid", "email": "user@company.com", "workspaces": [{ "id": "uuid", "name": "Acme Support" }] },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### `GET /api/auth/me`
Get current user profile with workspace list.

**Headers:** `Authorization: Bearer <token>`

**Response** `200`:
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "user@company.com",
  "role": "WORKSPACE_OWNER",
  "workspaces": [{ "id": "uuid", "name": "Acme Support", "ownerId": "uuid" }]
}
```

#### `POST /api/auth/invite`
Generate an invitation link for a new member.

**Headers:** `Authorization: Bearer <token>`
**Request:**
```json
{ "email": "agent@company.com" }
```

**Response** `201`:
```json
{
  "id": "uuid",
  "email": "agent@company.com",
  "token": "jwt-token-7d-expiry",
  "workspaceId": "uuid",
  "role": "AGENT",
  "expiresAt": "2026-05-27T..."
}
```

#### `GET /api/auth/invite/:token`
Verify an invitation token.

**Response** `200`:
```json
{
  "id": "uuid",
  "email": "agent@company.com",
  "workspace": { "id": "uuid", "name": "Acme Support" }
}
```

#### `POST /api/auth/invite/accept`
Accept an invitation and create or link a user account.

**Request:**
```json
{ "token": "jwt-token", "password": "securePassword123", "name": "Agent Name" }
```

**Response** `200`: `{ "id": "uuid", "email": "agent@company.com", "role": "AGENT", ... }`

#### `PATCH /api/auth/status`
Update agent online/offline presence.

**Headers:** `Authorization: Bearer <token>`
**Request:**
```json
{ "isOnline": true }
```

---

### API Chat Endpoints

Base path: `/api/chat`

#### `POST /api/chat/start`
Initialize a new chat session (lazy — returns ready status).

**Headers:** `x-workspace-id: <workspaceId>`

**Response** `200`: `{ "status": "ready" }`

#### `POST /api/chat/message`
Send a customer message and receive an AI response.

**Headers:** `x-workspace-id: <workspaceId>`

**Request:**
```json
{
  "message": "What are your business hours?",
  "conversationId": "uuid-or-null-for-new",  // optional
  "isPreview": false  // optional, true = don't save to DB
}
```

**Response** `200`:
```json
{
  "response": "Our business hours are Monday-Friday, 9AM-5PM EST.",
  "sources": ["business-hours.pdf"],
  "conversationId": "uuid"
}
```

**Auto-resolution:** If message contains gratitude keywords (thanks, شكرا, etc.) and conversation has ≥ 2 messages, it auto-resolves.

**Auto-escalation:** If AI admits it can't answer + suggests human, OR user explicitly asks for human.

#### `GET /api/chat`
List all conversations in workspace (dashboard).

**Headers:** `Authorization: Bearer <token>`, `x-workspace-id: <workspaceId>`

**Response** `200`: Array of conversations with last message, assigned agent, locked status.

#### `GET /api/chat/:id`
Get full conversation with messages.

**Headers:** `Authorization: Bearer <token>`, `x-workspace-id: <workspaceId>`

#### `GET /api/chat/history/:id`
Get conversation history (public, for widget restoration).

**Headers:** `x-workspace-id: <workspaceId>`

#### `POST /api/chat/:id/reply`
Agent replies to a conversation.

**Headers:** `Authorization: Bearer <token>`, `x-workspace-id: <workspaceId>`

**Request:**
```json
{ "content": "I can help you with that." }
```

**Response** `201`: `{ "id": "uuid", "content": "...", "role": "assistant", "userId": "uuid", ... }`

#### `POST /api/chat/:id/resolve`
Mark a conversation as resolved.

**Headers:** `Authorization: Bearer <token>`, `x-workspace-id: <workspaceId>`

#### `POST /api/chat/:id/lock`
Lock a conversation (claim for handling).

**Headers:** `Authorization: Bearer <token>`, `x-workspace-id: <workspaceId>`

**Error `409`:** `{ "error": "Conversation is already being handled by another agent", "code": "ALREADY_LOCKED" }`

#### `POST /api/chat/:id/unlock`
Release lock on a conversation.

#### `POST /api/chat/:id/typing`
Broadcast typing indicator.

**Headers:** `x-workspace-id: <workspaceId>`
**Request:** `{ "isTyping": true }`

---

### API Documents

Base path: `/api/documents`

#### `POST /api/documents/upload`
Upload a document (PDF, DOCX, or TXT) or paste text content.

**Headers:** `Authorization: Bearer <token>`, `x-workspace-id: <workspaceId>`
**Body:** `multipart/form-data` with `file` field, or JSON with `title` + `content` fields.

**File constraints:**
- Max size: 10MB
- Allowed types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`

**Response** `201`:
```json
{
  "id": "uuid",
  "filename": "business-hours.pdf",
  "status": "PROCESSING",
  "workspaceId": "uuid",
  ...
}
```

#### `GET /api/documents`
List all documents in workspace.

**Response** `200`: Array of documents with `_count.chunks`.

#### `DELETE /api/documents/:id`
Delete a document (cascades to chunks).

---

### API Workspace

Base path: `/api/workspace`

#### `POST /api/workspace`
Create a new workspace.

**Headers:** `Authorization: Bearer <token>`
**Request:** `{ "name": "New Workspace" }`

#### `PATCH /api/workspace`
Update workspace name.

**Headers:** `Authorization: Bearer <token>`, `x-workspace-id: <workspaceId>`

#### `GET /api/workspace/members`
List workspace members with context-aware roles.

**Headers:** `Authorization: Bearer <token>`, `x-workspace-id: <workspaceId>`

**Response** `200`:
```json
[
  { "id": "uuid", "name": "John", "email": "john@co.com", "role": "WORKSPACE_OWNER", "createdAt": "..." },
  { "id": "uuid", "name": "Jane", "email": "jane@co.com", "role": "ADMIN", "createdAt": "..." }
]
```

#### `PATCH /api/workspace/members/:userId`
Update a member's role (Workspace Owner only).

**Headers:** `Authorization: Bearer <token>`, `x-workspace-id: <workspaceId>`
**Request:** `{ "role": "ADMIN" }`

**Errors:** `403` if not owner, `400` if self-role-change, `404` if not a member.

#### `DELETE /api/workspace/members/:userId`
Remove a member from workspace.

**Errors:** `400` if self-removal or owner-removal attempt.

#### Branding Endpoints

All branding fields have defaults via Prisma schema `@default()`:
- `widgetName`: `"Support AI"`
- `widgetColor`: `"#3B82F6"`
- `welcomeMessage`: `"Hello! I'm your AI assistant. How can I help you today?"`

#### `GET /api/workspace/branding/public`
Public branding endpoint (no auth). Used by the chat widget on load.

**Query:** `?workspaceId=uuid` **or Header:** `x-workspace-id`

#### `GET /api/workspace/branding`
Get workspace branding (workspace-scoped).

**Headers:** `x-workspace-id: <workspaceId>`

#### `PATCH /api/workspace/branding`
Update branding.

**Headers:** `Authorization: Bearer <token>`, `x-workspace-id: <workspaceId>`
**Request:**
```json
{
  "widgetName": "Acme Bot",
  "widgetColor": "#FF0000",
  "welcomeMessage": "Hi! How can I help?"
}
```

Triggers `BRANDING_UPDATED` event → all active widgets update in real-time.

---

### API Analytics

Base path: `/api/analytics`

#### `GET /api/analytics/overview`
Dashboard statistics.

**Headers:** `Authorization: Bearer <token>`, `x-workspace-id: <workspaceId>`

**Response** `200`:
```json
{
  "activeConversations": 5,
  "totalMessages": 142,
  "aiResolutionRate": 78,
  "escalations": 3,
  "avgMessagesPerChat": 8.5,
  "knowledgeBaseSize": 12,
  "dailyStats": [
    { "date": "2026-05-14", "conversations": 12, "messages": 45 },
    { "date": "2026-05-15", "conversations": 8, "messages": 32 }
  ]
}
```

#### `GET /api/analytics/insights`
Get latest AI-generated insights.

#### `POST /api/analytics/insights`
Generate new AI insights from recent 100 messages.

**Role:** `PLATFORM_OWNER`, `ADMIN`, or `WORKSPACE_OWNER`

#### `GET /api/analytics/insights/history`
Get all past insight reports.

**Role:** `PLATFORM_OWNER`, `ADMIN`, or `WORKSPACE_OWNER`

---

### API Canned Responses

Base path: `/api/canned`

All endpoints require `Authorization` and `x-workspace-id`.

#### `GET /api/canned`
List all canned responses (sorted by title).

#### `POST /api/canned`
Create a canned response.

**Request:**
```json
{
  "title": "Return Policy",
  "content": "Our return policy allows returns within 30 days of purchase...",
  "shortcut": "return-policy"  // optional
}
```

#### `PUT /api/canned/:id`
Update a canned response.

#### `DELETE /api/canned/:id`
Delete a canned response.

---

### API Health

#### `GET /api/health`
Health check endpoint (no auth, no rate limit).

**Response** `200`:
```json
{
  "status": "ok",
  "uptime": 12345.67,
  "timestamp": "2026-05-20T12:00:00.000Z",
  "checks": {
    "db": "ok",
    "redis": "ok"
  }
}
```

**Response** `503` (degraded):
```json
{
  "status": "degraded",
  "uptime": 12345.67,
  "timestamp": "2026-05-20T12:00:00.000Z",
  "checks": {
    "db": "error",
    "redis": "ok"
  }
}
```

---

## Workers & Queues

All workers share a single Redis connection via `lib/queue.ts`:

```typescript
export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});
```

### Document Ingestion Worker

| Property | Value |
|----------|-------|
| Queue name | `document-ingestion` |
| Concurrency | 2 (limits Ollama load) |
| Retries | 3 with exponential backoff (5s base) |
| Connection | Shared `redisConnection` |

**Workflow:**
1. Document created with `status: 'PROCESSING'`
2. Job added to queue with document content/buffer
3. Worker parses file (PDF/DOCX/TXT → text)
4. Sliding window chunking: 150 words, 45 overlap
5. Generates embedding for each chunk via Ollama
6. Inserts chunks with embeddings via parameterized SQL
7. Updates document `status: 'COMPLETED'`
8. Emits `DOCUMENT_PROCESSED` event

### Event Worker

| Property | Value |
|----------|-------|
| Queue name | `app-events` |
| Concurrency | 1 (sequential event processing) |
| Retries | 2 (on job level via emitEvent) |

**Processes all AppEvent types** by emitting Socket.IO events and recording to the `Event` audit table.

### Aggregation Worker

| Property | Value |
|----------|-------|
| Queue name | `aggregation` |
| Trigger | Manual or scheduled job |
| Purpose | Aggregate daily chat/message/escalation counts per workspace |

---

## Real-Time System (Socket.IO)

### Server-Side (Socket.IO 4.8)

Initialized in `lib/socket.ts` with CORS from environment.

**Rooms:**
- `workspace_${workspaceId}` — All agents in a workspace
- `conversation_${conversationId}` — Widget + assigned agents

**Events emitted by the Event Worker:**
| Event | Room | Payload |
|-------|------|---------|
| `new_message` | `conversation_${id}` | Message object |
| `new_chat` | `workspace_${id}` | Conversation object |
| `chat_escalated` | `workspace_${id}` | Updated conversation |
| `chat_resolved` | `conversation_${id}` | Updated conversation |
| `branding_updated` | `workspace_${id}` | `{ widgetName, widgetColor, welcomeMessage }` |
| `document_processed` | `workspace_${id}` | `{ documentId }` |
| `chat_updated` | `workspace_${id}` | `{ conversationId, lastMessage }` |

### Client-Side (socket.io-client 4.8)

Singleton connection managed by `lib/socket.ts`:
```typescript
export const getSocket = () => { /* lazy singleton */ };
export const connectSocket = () => { /* connect if disconnected */ };
export const disconnectSocket = () => { /* disconnect + nullify */ };
```

**Widget connection pattern:**
1. Connect socket
2. `emit('join_workspace', workspaceId)` — receive branding updates
3. On receiving `conversationId`: `emit('join_conversation', conversationId)` — receive messages
4. Listen for `new_message`, `chat_resolved`, `branding_updated`

---

## Observability

### Structured Logging (Pino)

All logs are structured JSON, suitable for ingestion into ELK, Datadog, or any log aggregation system.

```json
{
  "level": 30,
  "time": 1716192000000,
  "pid": 1234,
  "hostname": "server-1",
  "req": {
    "id": "uuid-request-id",
    "method": "POST",
    "url": "/api/chat/message",
    "headers": { "x-workspace-id": "uuid", ... }
  },
  "res": { "statusCode": 200 },
  "responseTime": 1452,
  "msg": "request completed"
}
```

Sensitive fields redacted:
```typescript
redact: ['req.headers.authorization', 'req.headers.cookie']
```

Non-production environments use `pino-pretty` for human-readable console output.

### Request ID Tracing

Every request receives a UUID via `X-Request-Id` header:
- Incoming: reads `x-request-id` header if provided (for distributed tracing)
- Generation: creates UUID via `uuid` package if absent
- Propagation: attached to all log entries via `pino-http`
- Response: returned as `X-Request-Id` header

### Health Checks

`GET /api/health` checks:
1. **PostgreSQL**: `SELECT 1` via Prisma
2. **Redis**: `PING` command via IORedis

Returns:
- `200 OK` if both healthy
- `503 Service Unavailable` if any check fails
- Excluded from rate limiting and request logging

### Graceful Shutdown

On `SIGTERM` or `SIGINT`:
1. Logs shutdown initiation with signal name
2. Closes HTTP server (stops accepting new connections)
3. Disconnects Prisma from PostgreSQL
4. Quits Redis connection
5. Exits with code 0

---

## Error Handling

### Architecture

```
Controller/Service throws AppError
  → asyncHandler catches (Promise rejection)
  → Express error middleware (errorHandler)
  → Returns structured JSON
```

### AppError Class

```typescript
class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  constructor(statusCode: number, code: string, message: string)
}
```

### Error Codes

| HTTP | Code | When |
|------|------|------|
| 400 | `VALIDATION_ERROR` | Zod schema validation failed |
| 400 | `WORKSPACE_REQUIRED` | Missing `x-workspace-id` header |
| 400 | `CONVERSATION_CLOSED` | Reply to resolved conversation |
| 400 | `INVITATION_EXPIRED` | Invitation token expired |
| 400 | `INVALID_FILE_TYPE` | Uploaded file not PDF/DOCX/TXT |
| 400 | `FILE_TOO_LARGE` | Upload exceeded 10MB |
| 400 | `SELF_ROLE` | User tried to change own role |
| 400 | `SELF_REMOVE` | User tried to remove self |
| 400 | `OWNER_REMOVE` | User tried to remove workspace owner |
| 401 | `NO_TOKEN` | Missing Authorization header |
| 401 | `INVALID_TOKEN` | JWT expired or malformed |
| 401 | `INVALID_CREDENTIALS` | Wrong email/password |
| 401 | `USER_NOT_FOUND` | User from token not in DB |
| 403 | `FORBIDDEN` | Insufficient role permissions |
| 403 | `NOT_MEMBER` | User not in workspace |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `EMAIL_EXISTS` | Email already registered |
| 409 | `ALREADY_LOCKED` | Conversation locked by another agent |
| 500 | `INTERNAL_ERROR` | Unhandled exceptions |
| 502 | `AI_UNAVAILABLE` | Ollama unreachable |

### Controller Pattern

```typescript
// Before (old pattern — 10+ lines of try/catch per method):
async foo(req, res) {
  try {
    const result = await service.foo();
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// After (new pattern — 3 lines):
foo = asyncHandler(async (req, res) => {
  const result = await service.foo();
  res.json(result);
});
```

This eliminates:
- Inconsistent error status codes (each controller used different values)
- Inconsistent error shapes (some returned `error.message`, some leaked internals)
- Missing error logging
- Code duplication (~20 lines per controller file)

---

## Frontend Architecture

### Pages & Routes

```
/                               → Landing page (feature overview)
/login                          → Authentication
/register                       → Account creation (creates workspace)
/dashboard                      → Overview analytics (owner/admin only)
/dashboard/conversations        → Chat inbox with tabs (AI Managed, Escalated, Archived)
/dashboard/knowledge            → Document management (upload, list, delete)
/dashboard/widget               → Widget configuration + live preview
/dashboard/settings             → Workspace settings, team management, canned responses
/join/[token]                   → Accept invitation
/widget/[workspaceId]           → Embedded chat widget (public)
/chat-frame                     → Full-page chat (for mobile/embed)
```

### Components

| Component | Purpose |
|-----------|---------|
| `ChatWidget.tsx` | Universal chat widget (embed, preview, full-page modes) |
| `CustomAlert.tsx` | Toast notification component |
| `AlertContext.tsx` | React context for global alert/confirm dialogs |
| `Navbar.tsx` | Top navigation bar (landing page) |

### State Management

- **No Redux/Zustand** — uses React built-in state + context
- `AlertContext` provides `showAlert()` and `showConfirm()` globally
- Local component state with `useState` + `useEffect` for data fetching
- Socket.IO events update state in real-time
- localStorage for token, workspaceId, userRole, chat session persistence

### Key Pages

#### Conversations Page
- Role-based tabs: Owners see "AI Managed" / "Escalated" / "Archived". Agents see "My Chats" / "Archived"
- Chat sidebar with real-time updates via Socket.IO
- Main chat area with lock indicator, typing indicator, canned response snippets
- Auto-unlock on navigation away from a conversation

#### Widget Settings Page
- Live branding preview alongside configuration form
- Installation snippet generator (universal script tag)
- Color picker + hex input for brand color

---

## Widget System

### Embed Code

```html
<!-- SupportBot Universal Snippet -->
<script 
  src="http://localhost:3001/widget.js" 
  data-workspace-id="<your-workspace-id>" 
  async>
</script>
```

### Widget Modes

| Mode | Prop | Behavior |
|------|------|----------|
| Floating | `fullMode=false, previewMode=false` | Fixed bottom-right button, opens 400x600 popup |
| Full | `fullMode=true, previewMode=false` | Fills container, no close button |
| Preview | `previewMode=true` | Full mode with no localStorage persistence |

### Widget Features

- Welcome message from branding config
- Real-time AI responses via REST + Socket.IO
- Bilingual support (Arabic/English auto-detection)
- Source citations in AI responses
- Auto-resolution on gratitude keywords
- Session persistence via localStorage
- "New Chat" button to reset conversation
- Typing indicators for AI and human agents
- Resolution state: shows "This conversation has ended" + new chat button

---

## Testing Strategy

### Framework: Vitest 4 + Supertest

**Test files:** `src/__tests__/`

| Test File | Tests | Description |
|-----------|-------|-------------|
| `auth.service.test.ts` | 3 | Registration, login failure, getUser not found |
| `chat.service.test.ts` | 3 | Preview mode, lock failure, resolve conversation |
| `rag.service.test.ts` | 2 | Embedding generation, response generation with mocked axios |

**Mocking pattern:**
- Prisma: Entire `db/prisma` module mocked with `vi.mock()`
- Axios: Mocked for Ollama API calls
- Logger: Mocked to avoid pino initialization in test env
- Events: Mocked to avoid Redis/queue dependencies

**CI pipeline (GitHub Actions):**
```
Checkout → Setup Node → Install deps → Generate Prisma → Typecheck → Test → Build
```

Services: PostgreSQL 16 + Redis 7 (Docker containers in CI)

---

## Environment Configuration

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:pass@localhost:5432/rag_bot` |
| `JWT_SECRET` | JWT signing key (min 32 chars) | `6821b0ea736ef6f6b91b2e1106f985a8...` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |

### Optional Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `REDIS_HOST` | `localhost` | Redis host (used if REDIS_URL not set) |
| `REDIS_PORT` | `6379` | Redis port |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base URL |
| `LOG_LEVEL` | `info` | Pino log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001` | Comma-separated CORS origins |
| `NODE_ENV` | `development` | Environment: `development`, `production`, `test` |

### .env file
```env
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/rag_bot
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-256-bit-secret-key-here
OLLAMA_BASE_URL=http://localhost:11434
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## Getting Started

### Prerequisites

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥ 20 | Runtime |
| PostgreSQL | ≥ 14 | Primary database |
| Redis | ≥ 7 | Queue broker + pub/sub |
| Ollama | Latest | Local LLM + embeddings |
| npm | ≥ 10 | Package manager |

### Ollama Models

```bash
# Pull required models
ollama pull nomic-embed-text   # 768-dim embeddings
ollama pull gemma4:e4b         # Response generation
```

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd multi-tenant-rag-customer-service

# 2. Backend setup
cd backend
cp .env.example .env      # Edit with your credentials
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# 3. Frontend setup (separate terminal)
cd frontend
npm install
npm run dev
```

### Startup Sequence

```
1. PostgreSQL       → Ensure running on port 5432
2. Redis            → Ensure running on port 6379
3. Ollama           → ollama serve
4. Backend          → npm run dev (port 3000)
5. Frontend         → npm run dev (port 3001)
```

### Verification

```bash
# Health check
curl http://localhost:3000/api/health
# → { "status": "ok", "checks": { "db": "ok", "redis": "ok" } }

# Register a new workspace
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123","workspaceName":"Test Workspace"}'

# Check the dashboard
open http://localhost:3001/dashboard
```

---

## Development

### Available Scripts

**Backend:**
```bash
npm run dev              # Hot-reload development with nodemon
npm run build            # TypeScript compilation → dist/
npm start                # Run compiled dist/index.js
npm test                 # Vitest run
npm run test:watch       # Vitest watch mode
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
```

**Frontend:**
```bash
npm run dev              # Next.js development server
npm run build            # Production build
npm start                # Start production server
npm run lint             # ESLint
```

### Project Structure
```
multi-tenant-rag-customer-service/
├── backend/
│   ├── src/
│   │   ├── index.ts                 # Entry point
│   │   ├── config/                  # (removed — consolidated into lib/)
│   │   ├── db/
│   │   │   └── prisma.ts           # PrismaClient singleton
│   │   ├── lib/
│   │   │   ├── env.ts              # Environment validation
│   │   │   ├── errors.ts           # AppError + asyncHandler
│   │   │   ├── events.ts           # Event enum + emitter
│   │   │   ├── logger.ts           # Pino instance
│   │   │   ├── queue.ts            # Redis connection + queues
│   │   │   ├── socket.ts           # Socket.IO server
│   │   │   └── validation.ts       # Zod schemas + middleware
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts   # JWT verification
│   │   │   ├── errorHandler.ts     # Error response handler
│   │   │   ├── requestId.ts        # UUID middleware
│   │   │   ├── role.middleware.ts   # RBAC middleware
│   │   │   └── tenant.middleware.ts # Workspace isolation
│   │   ├── modules/
│   │   │   ├── analytics/          # Dashboard stats + AI insights
│   │   │   ├── auth/               # Registration, login, invites
│   │   │   ├── canned/             # Canned response CRUD
│   │   │   ├── chat/               # Conversations + messaging
│   │   │   ├── document/           # Knowledge base management
│   │   │   └── workspace/          # Workspace + branding + members
│   │   ├── services/
│   │   │   ├── queue/              # (deprecated)
│   │   │   └── rag/               # RAG pipeline (embeddings + LLM)
│   │   ├── workers/
│   │   │   ├── aggregation.worker.ts
│   │   │   ├── event.worker.ts
│   │   │   └── ingestion.worker.ts
│   │   └── __tests__/              # Vitest test files
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   └── migrations/             # Migration history
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Landing page
│   │   │   ├── layout.tsx          # Root layout
│   │   │   ├── login/              # Login page
│   │   │   ├── register/           # Registration page
│   │   │   ├── dashboard/          # Dashboard + sub-pages
│   │   │   ├── join/[token]/       # Invitation acceptance
│   │   │   ├── widget/[wsId]/      # Embedded widget
│   │   │   └── chat-frame/         # Full-page chat
│   │   ├── components/
│   │   │   ├── ChatWidget.tsx      # Universal chat widget
│   │   │   ├── CustomAlert.tsx     # Toast component
│   │   │   ├── AlertContext.tsx    # Alert context provider
│   │   │   └── Navbar.tsx          # Landing page navbar
│   │   └── lib/
│   │       ├── api.ts              # Axios instance + interceptors
│   │       └── socket.ts           # Socket.IO client singleton
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
├── .github/
│   └── workflows/
│       └── ci.yml                  # CI pipeline
└── README.md
```

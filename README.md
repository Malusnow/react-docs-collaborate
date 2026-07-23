# Docs Collaborate

Docs Collaborate is a full-stack collaborative document editor built with Next.js, Tiptap, Yjs/Hocuspocus, Convex, and Clerk. It combines document management, rich-text editing, real-time collaboration, templates, and persistent image uploads in personal and organization workspaces.

## Features

- Create, search, rename, and delete documents with paginated workspace lists.
- Start from blank documents or reusable letter, resume, and proposal templates.
- Edit rich text with headings, fonts, colors, highlights, alignment, line height, links, task lists, tables, resizable images, page margins, and print styles.
- Collaborate through a self-hosted Yjs WebSocket service with cursors, avatars, shared margins, reconnection, and IndexedDB offline recovery.
- Upload JPEG, PNG, WebP, and GIF images up to 5 MiB to Convex File Storage.
- Switch between personal and currently active Clerk organization workspaces.

## Architecture

| Layer                | Responsibility                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Next.js App Router   | Application routes, server rendering, and document page loading                              |
| Tiptap / ProseMirror | Rich-text editing and custom editor extensions                                               |
| Yjs / Hocuspocus     | WebSocket synchronization, awareness, collaborative content, offline recovery, and margins   |
| Convex               | Document metadata, authorization, Yjs state, workspace queries, mutations, and image records |
| Clerk                | Authentication, users, and the currently active organization claim                           |
| Zustand / nuqs       | Editor instance state and URL-backed search state                                            |

The Hocuspocus server authenticates every room connection by calling the protected Convex document query with the caller's Clerk/Convex token. Persistence uses a separate server-only secret and Convex HTTP Actions; clients cannot call the internal collaboration state functions directly.

## Authorization model

- A personal document can be created, read, updated, and deleted only by its owner.
- An organization document can be created, read, updated, and deleted by its owner or a member whose current Clerk session has that organization active.
- Authorized owners and members can edit the corresponding WebSocket room.
- The application does not define Viewer, Editor, or Admin roles.

Organization access follows Clerk's current `organization_id` claim. Membership in an organization that is not currently active does not independently grant access.

## Local development

### Prerequisites

- Node.js 22 and npm
- Clerk and Convex projects

### Configuration

Install dependencies:

```bash
npm install
```

Configure these values in `.env.local` without committing the file:

```dotenv
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_COLLABORATION_URL=ws://localhost:4000
CONVEX_SITE_URL=
COLLABORATION_SECRET=
COLLABORATION_ALLOWED_ORIGINS=http://localhost:3000
```

`CONVEX_SITE_URL` is the deployment's HTTP Actions URL ending in `.convex.site`; it is different from `NEXT_PUBLIC_CONVEX_URL`, which normally ends in `.convex.cloud`. Set the same `COLLABORATION_SECRET` in the Convex deployment environment and the Hocuspocus process. Create a Clerk JWT template named `convex` and update `convex/auth.config.ts` for your Clerk instance.

Set the server-only secret in Convex before starting the collaboration service:

```bash
npx convex env set COLLABORATION_SECRET '<the-same-random-secret>'
```

Run Convex, Next.js, and Hocuspocus in separate terminals:

```bash
npx convex dev
```

```bash
npm run dev
```

```bash
npm run server
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```text
convex/                              Metadata, authorization, Yjs state, HTTP Actions, and auth configuration
server/                              Hocuspocus authentication, persistence, and WebSocket entry point
scripts/migrate-liveblocks.ts        Optional one-time migration from legacy Liveblocks rooms
src/app/(home)/                      Workspace, search, templates, and document list
src/app/documents/[documentId]/      Editor, toolbar, room lifecycle, awareness avatars, and shared margins
src/components/                      Shared application and UI components
src/extensions/                      Custom Tiptap extensions
src/constants/                       Templates and editor limits
```

## Legacy Liveblocks migration

The migration is safe by default: it performs a dry run and skips documents that already have a Convex collaboration state. Configure `LIVEBLOCKS_SECRET_KEY` temporarily, then run:

```bash
npm run migrate:liveblocks
npm run migrate:liveblocks -- --write
```

Use `--overwrite` together with `--write` only after reviewing the dry-run output. The script migrates the Yjs binary document and legacy shared margins; comments and notifications are intentionally not migrated.

## Verification

Run checks in proportion to the change:

```bash
npx tsc --noEmit --incremental false
npm run lint
npm run format:check
npm run build
```

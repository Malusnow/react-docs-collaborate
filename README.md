# Docs Collaborate

Docs Collaborate is a full-stack collaborative document editor built with Next.js, Tiptap, Liveblocks, Convex, and Clerk. It combines document management, rich-text editing, real-time collaboration, comments, notifications, templates, and persistent image uploads in personal and organization workspaces.

## Features

- Create, search, rename, and delete documents with paginated workspace lists.
- Start from blank documents or reusable letter, resume, and proposal templates.
- Edit rich text with headings, fonts, colors, highlights, alignment, line height, links, task lists, tables, resizable images, page margins, and print styles.
- Collaborate through Liveblocks presence, avatars, comments, mentions, notifications, shared margins, and experimental offline support.
- Upload JPEG, PNG, WebP, and GIF images up to 5 MiB to Convex File Storage.
- Switch between personal and currently active Clerk organization workspaces.

## Architecture

| Layer                | Responsibility                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Next.js App Router   | Application routes, server rendering, and the Liveblocks authorization endpoint                |
| Tiptap / ProseMirror | Rich-text editing and custom editor extensions                                                 |
| Liveblocks           | Collaborative document content, presence, comments, notifications, and shared margins          |
| Convex               | Document metadata, workspace queries, search, pagination, mutations, and image storage records |
| Clerk                | Authentication, users, and the currently active organization claim                             |
| Zustand / nuqs       | Editor instance state and URL-backed search state                                              |

Convex metadata authorization and Liveblocks room authorization are separate boundaries. The server authorizes the Convex document first and grants Liveblocks room access only when that check succeeds.

## Authorization model

- A personal document can be created, read, updated, and deleted only by its owner.
- An organization document can be created, read, updated, and deleted by its owner or a member whose current Clerk session has that organization active.
- Authorized owners and members receive Liveblocks `FULL_ACCESS` for the document room.
- The application does not define Viewer, Editor, or Admin roles.

Organization access follows Clerk's current `organization_id` claim. Membership in an organization that is not currently active does not independently grant access.

## Local development

### Prerequisites

- Node.js and npm
- Clerk, Convex, and Liveblocks projects

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
LIVEBLOCKS_SECRET_KEY=
```

Create a Clerk JWT template named `convex`. Update the Clerk issuer domain in `convex/auth.config.ts` for your Clerk instance. The Convex CLI may also add `CONVEX_DEPLOYMENT` to `.env.local` when linking the local checkout to a deployment.

Run the Convex development process and the Next.js application in separate terminals:

```bash
npx convex dev
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```text
convex/                              Convex schema, queries, mutations, and auth configuration
src/app/(home)/                      Workspace, search, templates, and document list
src/app/documents/[documentId]/      Editor, toolbar, Liveblocks room, comments, and notifications
src/app/api/liveblocks-auth/         Server-side Liveblocks room authorization
src/components/                      Shared application and UI components
src/extensions/                      Custom Tiptap extensions
src/constants/                       Templates and editor limits
```

## Verification

Run checks in proportion to the change:

```bash
npx tsc --noEmit --incremental false
npm run lint
npm run format:check
npm run build
```

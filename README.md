# IUDEX

**A real-time, collaborative code editor in your browser.**

IUDEX is a web-based code editor that looks and feels like VS Code, but runs entirely in the browser and lets multiple people edit the same file at the same time. Think Google Docs, but for code.

---

## Table of Contents

- [What is IUDEX?](#what-is-iudex)
- [Why Was It Built?](#why-was-it-built)
- [Features at a Glance](#features-at-a-glance)
- [How It Works (The Big Picture)](#how-it-works-the-big-picture)
- [Architecture Flowcharts](#architecture-flowcharts)
  - [User Journey](#user-journey)
  - [Real-Time Collaboration Flow](#real-time-collaboration-flow)
  - [Application Component Tree](#application-component-tree)
  - [GitHub Import Flow](#github-import-flow)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Feature Deep Dives](#feature-deep-dives)
  - [1. Authentication](#1-authentication)
  - [2. The Code Editor](#2-the-code-editor)
  - [3. Real-Time Collaboration (CRDT)](#3-real-time-collaboration-crdt)
  - [4. File Explorer & Tree](#4-file-explorer--tree)
  - [5. GitHub Import](#5-github-import)
  - [6. Command Palette](#6-command-palette)
  - [7. Keyboard Shortcuts](#7-keyboard-shortcuts)
  - [8. Terminal](#8-terminal)
  - [9. Preferences](#9-preferences)
  - [10. Zoom Controls](#10-zoom-controls)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Install Dependencies](#1-install-dependencies)
  - [2. Set Up Environment Variables](#2-set-up-environment-variables)
  - [3. Run the Development Servers](#3-run-the-development-servers)
  - [4. Open in Browser](#4-open-in-browser)
- [Environment Variables Reference](#environment-variables-reference)
- [Keyboard Shortcuts Reference](#keyboard-shortcuts-reference)

---

## What is IUDEX?

IUDEX is a **browser-based collaborative code editor**. It provides:

- A professional code editing experience powered by Monaco (the same engine behind VS Code)
- Real-time collaboration where multiple users see each other's edits as they type
- A file explorer, tab system, terminal panel, and command palette -- all the things you'd expect from a desktop editor, running in a browser tab
- The ability to import public GitHub repositories and browse their code

---

## Why Was It Built?

The goal was to build a fully functional, collaborative IDE that runs in the browser and demonstrates how modern web technologies can replicate a desktop-class developer experience. Specifically:

1. **Real-time collaboration** -- Using CRDTs (Conflict-free Replicated Data Types) so multiple users can edit the same document simultaneously without conflicts
2. **Professional editor feel** -- Full syntax highlighting, intellisense, multiple themes, keyboard shortcuts, and a familiar VS Code-like layout
3. **No installation required** -- Just open a URL and start coding with your team
4. **Modern web architecture** -- Built with Next.js, React, TypeScript, and WebSockets

---

## Features at a Glance

| Feature | Description |
|---|---|
| **Monaco Editor** | Industry-standard code editor with syntax highlighting for 15+ languages |
| **Real-Time Collaboration** | Multiple users edit the same file simultaneously using Yjs CRDTs |
| **Google Authentication** | Secure sign-in via Google OAuth |
| **File Explorer** | Create, delete, and organize files and folders in a tree view |
| **Tab System** | Open multiple files in tabs with unsaved change indicators |
| **GitHub Import** | Import any public GitHub repository and browse its code |
| **Command Palette** | Quick access to all commands via a searchable popup |
| **Keyboard Shortcuts** | 30+ shortcuts matching VS Code conventions |
| **Built-in Terminal** | Simulated terminal with common commands |
| **Preferences Panel** | Customize theme, font, tab size, minimap, and more |
| **Zoom Controls** | Scale the entire UI from 50% to 200% |
| **Breadcrumb Navigation** | See the current file's path in the folder hierarchy |
| **Status Bar** | Live cursor position, language, encoding, connection status |
| **Debug Mode UI** | Visual debug mode with UI state changes |

---

## How It Works (The Big Picture)

In simple terms:

1. **You sign in** with your Google account
2. **You enter an editor room** -- each room has a unique URL (e.g. `/editor/my-project`)
3. **You write code** in a professional code editor in your browser
4. **If someone else opens the same room URL**, they see your edits in real-time (and you see theirs)
5. **Behind the scenes**, a WebSocket server keeps all users in sync using a technology called CRDTs -- a way to merge edits from multiple people without conflicts

---

## Architecture Flowcharts

### User Journey

```
                         +------------------+
                         |   Landing Page   |
                         |   (app/page.tsx) |
                         +--------+---------+
                                  |
                         "Login with Google"
                                  |
                                  v
                     +------------------------+
                     |   Google OAuth Flow    |
                     |   (NextAuth + JWT)     |
                     +----------+-------------+
                                |
                          Authenticated
                                |
                                v
                    +---------------------------+
                    |  "Try out the Code Editor" |
                    |  -> /editor/test           |
                    +------------+--------------+
                                 |
                     Server checks session
                     (getServerSession)
                                 |
                                 v
                   +----------------------------+
                   |      EditorLayout          |
                   | (Full IDE in the Browser)  |
                   +----------------------------+
```

### Real-Time Collaboration Flow

This is how two users editing the same file stay in sync:

```
   User A (Browser)                                     User B (Browser)
  +----------------+                                   +----------------+
  | Monaco Editor  |                                   | Monaco Editor  |
  |   + y-monaco   |                                   |   + y-monaco   |
  +-------+--------+                                   +--------+-------+
          |                                                      |
          | Yjs Updates                                Yjs Updates |
          | (binary diffs)                        (binary diffs)   |
          v                                                      v
  +----------------+                                   +----------------+
  | WebSocket      |                                   | WebSocket      |
  | Client         |                                   | Client         |
  | (y-websocket)  |                                   | (y-websocket)  |
  +-------+--------+                                   +--------+-------+
          |                                                      |
          +------------------>  WebSocket  <---------------------+
                              Connection
                                  |
                                  v
                     +------------------------+
                     |   Realtime Server      |
                     |   (realtime-server/)   |
                     |                        |
                     |  +------------------+  |
                     |  |  Y.Doc per room  |  |    Each "room" is a
                     |  |  + Awareness     |  |    unique file being
                     |  +------------------+  |    edited (roomId:fileId)
                     |                        |
                     |  +------------------+  |
                     |  | Supabase         |  |    Documents are saved
                     |  | Persistence      |  |    so they survive
                     |  +------------------+  |    server restarts
                     |                        |
                     |  +------------------+  |
                     |  | Redis PubSub     |  |    Allows multiple
                     |  | (optional)       |  |    server instances
                     |  +------------------+  |    to share updates
                     +------------------------+
```

**What are CRDTs?** In plain language, a CRDT is a data structure that lets multiple people make edits at the same time and automatically merges them together without conflicts. Unlike Google Docs (which uses a central server to decide), CRDTs work even if the network connection drops temporarily -- edits queue up and merge when reconnected.

### Application Component Tree

This shows how the UI components are organized:

```
RootLayout
  |
  +-- SessionProviderWrapper (provides auth session to all pages)
       |
       +-- Landing Page (/) -- AuthButtons (Login/Logout)
       |
       +-- Editor Page (/editor/[roomId])
            |
            +-- EditorLayout (the main orchestrator)
                 |
                 +-- TitleBar
                 |    +-- Menu Buttons (File, Edit, View, Go, Run, Terminal)
                 |    +-- MenuDropdown (appears on click)
                 |    +-- CommandPalette (appears on Cmd+Shift+P)
                 |    +-- Toast (brief notification messages)
                 |    +-- Icon Buttons (layout, terminal, sidebar, settings)
                 |
                 +-- ActivityBar (left icon strip: Files, Search, Git, Run, Extensions)
                 |
                 +-- Sidebar
                 |    +-- Search Input (filter files by name)
                 |    +-- FileTreeNode (recursive tree of files/folders)
                 |    +-- CreationInput (inline new file/folder input)
                 |    +-- Footer (file count + CRDT status)
                 |
                 +-- EditorPane
                 |    +-- Tab Bar (open file tabs with dirty indicators)
                 |    +-- Breadcrumb (folder > subfolder > file.ts)
                 |    +-- CodeEditor (Monaco Editor instance)
                 |    +-- TerminalPanel (resizable bottom panel)
                 |
                 +-- StatusBar
                 |    +-- Branch indicator
                 |    +-- Error/Warning counts
                 |    +-- Cursor position (Ln/Col)
                 |    +-- Language label
                 |    +-- Encoding (UTF-8)
                 |    +-- CRDT connection status
                 |
                 +-- PreferencesModal (settings popup)
                 +-- ImportGitHubModal (GitHub import popup)
```

### GitHub Import Flow

```
  User clicks "Import from GitHub"
              |
              v
  +---------------------------+
  | ImportGitHubModal appears |
  | User pastes GitHub URL    |
  +------------+--------------+
               |
       URL parsed & validated
       (owner/repo/branch)
               |
               v
  +---------------------------+
  | GET /api/github/tree      |     Fetches repository
  | ?owner=X&repo=Y&branch=Z |     structure from
  +------------+--------------+     GitHub API
               |
        Returns file tree
        (paths + types)
               |
               v
  +-------------------------------+
  | githubTreeToFileNodes()       |    Converts flat GitHub
  | Converts to nested FileNode[]|    tree into nested
  +------------+------------------+    file/folder structure
               |
       File tree loaded into
       the editor sidebar
               |
               v
  User clicks a file
               |
               v
  +---------------------------+
  | GET /api/github/content   |     Fetches individual
  | ?owner=X&repo=Y&path=Z   |     file content on
  +------------+--------------+     demand (lazy loading)
               |
       Content loaded into
       the Monaco editor
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | Next.js 16 + React 19 | Server-side rendering, routing, API routes |
| **Language** | TypeScript | Type safety across the entire codebase |
| **Code Editor** | Monaco Editor | The same editor engine that powers VS Code |
| **Real-Time Sync** | Yjs + y-websocket + y-monaco | CRDT-based conflict-free real-time collaboration |
| **State Management** | Zustand | Lightweight global state for collaboration info |
| **Authentication** | NextAuth.js + Google OAuth | Secure sign-in with JWT sessions |
| **WebSocket Server** | ws + y-protocols | Custom server handling the Yjs sync protocol |
| **Persistence** | Supabase (PostgreSQL) | Saves document state so it survives restarts |
| **Horizontal Scaling** | Redis Pub/Sub (optional) | Syncs updates across multiple server instances |
| **Styling** | Tailwind CSS + Inline styles | Utility-first CSS with custom dark theme |
| **Animations** | Framer Motion + CSS | Smooth UI transitions |
| **Icons** | Lucide React + inline SVGs | Consistent icon system |

---

## Project Structure

```
iudex/
|
+-- app/                          # Next.js App Router pages
|   +-- page.tsx                  # Landing page (login screen)
|   +-- layout.tsx                # Root layout with session provider
|   +-- editor/
|   |   +-- [roomId]/
|   |       +-- page.tsx          # Editor page (auth-gated, passes roomId)
|   +-- api/
|       +-- auth/
|       |   +-- [...nextauth]/
|       |       +-- route.ts      # NextAuth API route
|       +-- github/
|           +-- tree/route.ts     # Fetches GitHub repo tree
|           +-- content/route.ts  # Fetches individual file content
|
+-- components/
|   +-- auth/
|   |   +-- authButtons.tsx       # Login/Logout buttons
|   +-- providers/
|   |   +-- SessionProviderWrapper.tsx  # NextAuth session context
|   +-- editor/
|       +-- EditorLayout.tsx      # Main orchestrator (state + layout)
|       +-- CodeEditor.tsx        # Monaco Editor wrapper
|       +-- Activitybar.tsx       # Left icon strip
|       +-- Sidebar.tsx           # File explorer panel
|       +-- Editorpane.tsx        # Tabs + editor + terminal area
|       +-- Statusbar.tsx         # Bottom status bar
|       +-- TerminalPanel.tsx     # Built-in terminal emulator
|       +-- PreferencesModal.tsx  # Settings dialog
|       +-- ImportGitHubModal.tsx # GitHub import dialog
|       +-- fileTreeNode.tsx      # Recursive file/folder tree node
|       +-- CreationInput.tsx     # Inline new file/folder input
|       +-- types.ts              # Core TypeScript types
|       +-- utils.ts              # Utility functions (tree ops, language detection)
|       +-- initialTree.ts        # Default file tree on first load
|       +-- editorStyles.css      # Custom CSS for the editor shell
|       +-- github.ts             # GitHub URL parsing + tree conversion
|       +-- titlebar/
|       |   +-- Titlebar.tsx      # Top menu bar
|       |   +-- MenuDropDown.tsx  # Dropdown menu component
|       |   +-- CommandPalette.tsx # Cmd+Shift+P command search
|       |   +-- Menudata.tsx      # Menu items, shortcuts, toast messages
|       |   +-- Toast.tsx         # Brief notification popup
|       |   +-- Iconbtn.tsx       # Reusable icon button
|       |   +-- types.ts          # Title bar TypeScript types
|       +-- hooks/
|           +-- UserEditorActions.tsx  # Monaco editor action wrappers
|           +-- UserTabHistory.tsx     # Back/forward navigation history
|           +-- Usezoom.tsx           # UI zoom in/out/reset
|           +-- UseGlobalShortcuts.ts # Global keyboard shortcut handler
|
+-- lib/
|   +-- auth/
|   |   +-- authOptions.ts       # NextAuth configuration (Google provider)
|   +-- yjs/
|       +-- useRealtimeEditor.ts  # React hook: Yjs + WebSocket + Monaco binding
|
+-- store/
|   +-- collaboration.ts         # Zustand store (connection status, collaborators)
|
+-- realtime-server/              # Standalone WebSocket server
    +-- server.ts                 # Main server (y-websocket protocol)
    +-- persistence.ts            # Supabase document persistence
    +-- redis.ts                  # Redis pub/sub for horizontal scaling
    +-- schema.sql                # SQL table definition for Supabase
    +-- package.json              # Server dependencies
    +-- tsconfig.json             # Server TypeScript config
```

---

## Feature Deep Dives

### 1. Authentication

Users sign in with their Google account via **NextAuth.js**. The flow:

- The landing page shows a "Login with Google" button
- After Google OAuth completes, a JWT session is created
- The editor page (`/editor/[roomId]`) checks for a valid session server-side
- If not authenticated, the user is redirected back to the landing page
- The user's name and email are passed into the editor for collaboration identity

**Key files:** `lib/auth/authOptions.ts`, `components/auth/authButtons.tsx`, `app/editor/[roomId]/page.tsx`

### 2. The Code Editor

The code editor is powered by **Monaco Editor**, the same engine that runs VS Code. It provides:

- Syntax highlighting for TypeScript, JavaScript, Python, Rust, Go, HTML, CSS, JSON, Markdown, PHP, SQL, Shell, and more
- IntelliSense and autocompletion
- Find and replace
- Go to line, go to symbol, go to definition
- Code folding
- Format document
- Toggle line comments
- Minimap navigation
- Multiple cursor styles (line, block, underline)
- Three themes: Dark, Light, High Contrast

The editor is loaded dynamically (no SSR) to avoid server-side rendering issues with Monaco.

**Key files:** `components/editor/CodeEditor.tsx`, `components/editor/hooks/UserEditorActions.tsx`

### 3. Real-Time Collaboration (CRDT)

This is the core feature. When two users open the same room URL:

1. Each browser creates a **Yjs document** (`Y.Doc`) -- a special data structure designed for real-time collaboration
2. A **WebSocket connection** is established to the realtime server
3. The **y-monaco binding** connects the Yjs document to the Monaco editor, so every keystroke is captured as a Yjs update
4. Updates are sent through the WebSocket to the server, which broadcasts them to all other connected clients
5. Each client applies incoming updates to their local Yjs document, and the y-monaco binding automatically reflects them in the editor

**Why CRDTs matter:** Unlike traditional collaboration (where a central server resolves conflicts), CRDTs guarantee that all users converge to the same state regardless of the order edits arrive. This means:

- No edit conflicts, ever
- Works even with high latency
- Edits can queue up while offline and merge cleanly when reconnected

**Awareness** (seeing other users' cursors): Each user's cursor position and identity is shared via Yjs awareness protocol. The status bar shows how many users are connected.

**Persistence:** When all users disconnect from a room, the server saves the document state to Supabase. When someone reconnects, the saved state is loaded so no work is lost.

**Key files:** `lib/yjs/useRealtimeEditor.ts`, `store/collaboration.ts`, `realtime-server/server.ts`, `realtime-server/persistence.ts`

### 4. File Explorer & Tree

The sidebar provides a full file explorer:

- **Nested file/folder tree** with expand/collapse
- **Create files and folders** with inline name input
- **Delete files and folders** with tree cleanup
- **Search files** by name with instant filtering
- **File type icons** with language-specific colors (React, TypeScript, Python, etc.)
- **File count** displayed in the footer
- **CRDT status indicator** in the footer

The entire file tree lives in React state as a recursive `FileNode[]` structure. Tree operations (add, delete, toggle, breadcrumb) are pure functions in `utils.ts`.

**Key files:** `components/editor/Sidebar.tsx`, `components/editor/fileTreeNode.tsx`, `components/editor/utils.ts`, `components/editor/types.ts`

### 5. GitHub Import

Users can import any public GitHub repository:

1. Click "Import from GitHub" (from the welcome screen or File menu)
2. Paste a GitHub URL like `https://github.com/owner/repo`
3. The app calls the GitHub API to fetch the repository's file tree
4. The tree is converted into the editor's `FileNode[]` format
5. Files are **lazy-loaded** -- content is only fetched when you click on a file, keeping the initial import fast

**Key files:** `components/editor/ImportGitHubModal.tsx`, `components/editor/github.ts`, `app/api/github/tree/route.ts`, `app/api/github/content/route.ts`

### 6. Command Palette

Press `Cmd+Shift+P` (or `Ctrl+Shift+P`) to open the command palette -- a searchable list of every action in the editor. It works just like VS Code's command palette:

- Type to filter commands
- See keyboard shortcuts inline
- Press Enter to execute
- Press Escape to dismiss

The palette includes 35+ commands across File, Edit, View, Go, Run, and Terminal categories.

**Key files:** `components/editor/titlebar/CommandPalette.tsx`, `components/editor/titlebar/Menudata.tsx`

### 7. Keyboard Shortcuts

IUDEX implements 30+ keyboard shortcuts that match VS Code conventions. All shortcuts are centralized in a single hook (`useGlobalShortcuts`) and route through the same action handler as menu items, ensuring consistent behavior.

**Key file:** `components/editor/hooks/UseGlobalShortcuts.ts`

### 8. Terminal

A built-in terminal panel at the bottom of the editor provides a simulated bash environment with:

- Common commands: `ls`, `pwd`, `cd`, `echo`, `git status/log/branch`, `npm run/install`, `node`, `date`, `whoami`, `clear`, `help`
- Command history (arrow up/down)
- Current working directory tracking
- Resizable panel height (drag the divider)
- Color-coded output (errors in red, info in blue, commands in white)

**Key file:** `components/editor/TerminalPanel.tsx`

### 9. Preferences

The preferences modal (`Cmd+,`) lets users customize:

| Setting | Options |
|---|---|
| Theme | Dark, Light, High Contrast |
| Font Family | JetBrains Mono, Fira Code, Consolas, SF Mono, Cascadia Code |
| Font Size | 10 -- 24 |
| Tab Size | 2, 4, 8 spaces |
| Word Wrap | On / Off |
| Minimap | On / Off |
| Line Numbers | On, Relative, Off |
| Cursor Style | Line, Block, Underline |
| Render Whitespace | None, Boundary, All |
| Format on Save | On / Off |

All preferences are persisted in `localStorage` so they survive page refreshes.

**Key files:** `components/editor/PreferencesModal.tsx`, `components/editor/types.ts`

### 10. Zoom Controls

The entire editor UI can be scaled:

- `Cmd+=` to zoom in (up to 200%)
- `Cmd+-` to zoom out (down to 50%)
- `Cmd+0` to reset to 100%
- Current zoom level is shown in the status bar (click to reset)

**Key file:** `components/editor/hooks/Usezoom.tsx`

---

## Getting Started

### Prerequisites

- **Node.js** 18 or later
- **npm** (comes with Node.js)
- A **Google Cloud** project with OAuth credentials (for authentication)
- (Optional) A **Supabase** project for document persistence
- (Optional) A **Redis** instance for multi-server scaling

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install realtime server dependencies
cd realtime-server && npm install && cd ..
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the project root:

```env
# Google OAuth (required)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth (required)
AUTH_SECRET=any-random-secret-string
NEXTAUTH_URL=http://localhost:3000

# WebSocket server URL (the frontend connects to this)
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# Supabase persistence (optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Redis (optional, for horizontal scaling)
REDIS_URL=redis://localhost:6379

# Realtime server port (optional, defaults to 4000)
REALTIME_WS_PORT=4000
```

If using Supabase persistence, run the schema in `realtime-server/schema.sql` in your Supabase SQL editor to create the `documents` table.

### 3. Run the Development Servers

Open two terminal windows:

```bash
# Terminal 1: Next.js frontend
npm run dev

# Terminal 2: Realtime WebSocket server
npm run realtime
```

### 4. Open in Browser

Go to [http://localhost:3000](http://localhost:3000), sign in with Google, and click "Try out the Code Editor".

To test collaboration, open the same editor URL in a second browser tab or a different browser (you need separate Google accounts or sessions).

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `AUTH_SECRET` | Yes | Secret for signing JWT sessions |
| `NEXTAUTH_URL` | Yes | Base URL of the app (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_WS_URL` | No | WebSocket server URL (defaults to `ws://localhost:4000`) |
| `SUPABASE_URL` | No | Supabase project URL (enables persistence) |
| `SUPABASE_SERVICE_KEY` | No | Supabase service role key |
| `REDIS_URL` | No | Redis connection URL (enables multi-server pub/sub) |
| `REALTIME_WS_PORT` | No | Port for the realtime server (defaults to `4000`) |

---

## Keyboard Shortcuts Reference

| Shortcut | Action |
|---|---|
| `Cmd+N` | New File |
| `Cmd+Shift+N` | New Window |
| `Cmd+S` | Save |
| `Cmd+Shift+S` | Save As (Download) |
| `Alt+Cmd+S` | Save All |
| `Cmd+W` | Close Editor |
| `Cmd+,` | Preferences |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+F` | Find |
| `Alt+Cmd+F` | Find and Replace |
| `Cmd+/` | Toggle Line Comment |
| `Shift+Alt+F` | Format Document |
| `Cmd+A` | Select All |
| `Cmd+B` | Toggle Sidebar |
| `Ctrl+`` ` `` | Toggle Terminal |
| `Cmd+Shift+P` | Command Palette |
| `Cmd+P` | Go to File |
| `Ctrl+G` | Go to Line |
| `Cmd+=` | Zoom In |
| `Cmd+-` | Zoom Out |
| `Cmd+0` | Reset Zoom |
| `Cmd+Shift+E` | Toggle Explorer |
| `F5` | Start Debugging |
| `F9` | Toggle Breakpoint |

---

Built with Next.js, React, Monaco Editor, Yjs, and TypeScript.

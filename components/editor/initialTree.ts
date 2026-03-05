import type { FileNode } from "./types"
import { uid } from "./utils"

export const INITIAL_TREE: FileNode[] = [
  {
    id: uid(), name: "app", type: "folder", isOpen: true,
    children: [
      {
        id: uid(), name: "api", type: "folder", isOpen: false,
        children: [
          {
            id: uid(), name: "auth", type: "folder", isOpen: false,
            children: [
              {
                id: uid(), name: "route.ts", type: "file",
                content: `import NextAuth from "next-auth"\nimport { authOptions } from "@/lib/auth/authOptions"\n\nconst handler = NextAuth(authOptions)\nexport { handler as GET, handler as POST }`,
              },
            ],
          },
          {
            id: uid(), name: "editor", type: "folder", isOpen: false,
            children: [
              {
                id: uid(), name: "page.tsx", type: "file",
                content: `// Editor room page\nexport default function EditorRoom({ params }: { params: { roomId: string } }) {\n  return <div>Room: {params.roomId}</div>\n}`,
              },
            ],
          },
        ],
      },
      {
        id: uid(), name: "globals.css", type: "file",
        content: `@import "tailwindcss";\n\n:root {\n  --background: #0a0a0a;\n  --foreground: #ededed;\n}`,
      },
      {
        id: uid(), name: "layout.tsx", type: "file",
        content: `import "./globals.css"\nimport SessionProviderWrapper from "@/components/providers/SessionProviderWrapper"\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>\n        <SessionProviderWrapper>{children}</SessionProviderWrapper>\n      </body>\n    </html>\n  )\n}`,
      },
      {
        id: uid(), name: "page.tsx", type: "file",
        content: `import AuthButtons from "@/components/auth/authButtons"\n\nexport default function Home() {\n  return (\n    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-6">\n      <h1 className="text-4xl font-bold">IUDEX</h1>\n      <AuthButtons />\n    </div>\n  )\n}`,
      },
    ],
  },
  {
    id: uid(), name: "components", type: "folder", isOpen: true,
    children: [
      {
        id: uid(), name: "auth", type: "folder", isOpen: false,
        children: [
          {
            id: uid(), name: "authButtons.tsx", type: "file",
            content: `"use client"\nimport { signIn, signOut, useSession } from "next-auth/react"\n\nexport default function AuthButtons() {\n  const { data: session, status } = useSession()\n  if (status === "loading") return null\n  if (session) {\n    return (\n      <div className="flex items-center gap-4">\n        <span>{session.user?.name}</span>\n        <button onClick={() => signOut()}>Logout</button>\n      </div>\n    )\n  }\n  return <button onClick={() => signIn("google")}>Login with Google</button>\n}`,
          },
        ],
      },
      {
        id: uid(), name: "editor", type: "folder", isOpen: true,
        children: [
          {
            id: uid(), name: "CodeEditor.tsx", type: "file",
            content: `"use client"\nimport dynamic from "next/dynamic"\n\nconst MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })\n\nexport default function CodeEditor({ language = "typescript", defaultValue = "// Start coding..." }) {\n  return (\n    <MonacoEditor\n      height="100%"\n      language={language}\n      theme="vs-dark"\n      value={defaultValue}\n    />\n  )\n}`,
          },
          {
            id: uid(), name: "EditorLayout.tsx", type: "file",
            content: `"use client"\n// Main editor layout component\nexport default function EditorLayout() {\n  return <div>Editor</div>\n}`,
          },
        ],
      },
      {
        id: uid(), name: "providers", type: "folder", isOpen: false,
        children: [
          {
            id: uid(), name: "SessionProviderWrapper.tsx", type: "file",
            content: `"use client"\nimport { SessionProvider } from "next-auth/react"\nexport default function SessionProviderWrapper({ children }: { children: React.ReactNode }) {\n  return <SessionProvider>{children}</SessionProvider>\n}`,
          },
        ],
      },
    ],
  },
  {
    id: uid(), name: "lib", type: "folder", isOpen: false,
    children: [
      {
        id: uid(), name: "auth", type: "folder", isOpen: false,
        children: [
          {
            id: uid(), name: "authOptions.ts", type: "file",
            content: `import { NextAuthOptions } from "next-auth"\nimport GoogleProvider from "next-auth/providers/google"\n\nexport const authOptions: NextAuthOptions = {\n  providers: [\n    GoogleProvider({\n      clientId: process.env.GOOGLE_CLIENT_ID!,\n      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,\n    }),\n  ],\n  secret: process.env.AUTH_SECRET,\n  session: { strategy: "jwt" },\n}`,
          },
        ],
      },
      { id: uid(), name: "yjs", type: "folder", isOpen: false, children: [] },
    ],
  },
]
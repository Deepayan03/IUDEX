import { INITIAL_TREE } from "@/features/editor/lib/initialTree"
import type { FileNode } from "@/features/editor/lib/types"
import type { ProjectTemplateId } from "@/features/editor/lib/projectTemplateMetadata"

const NEXT_BASIC_TEMPLATE: FileNode[] = [
  {
    id: "app",
    name: "app",
    type: "folder",
    isOpen: true,
    children: [
      {
        id: "app/globals.css",
        name: "globals.css",
        type: "file",
        content:
          '@import "tailwindcss";\n\n:root {\n  color-scheme: light dark;\n}\n\nbody {\n  margin: 0;\n  font-family: Arial, sans-serif;\n}\n',
      },
      {
        id: "app/layout.tsx",
        name: "layout.tsx",
        type: "file",
        content:
          'import "./globals.css"\nimport type { ReactNode } from "react"\n\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  )\n}\n',
      },
      {
        id: "app/page.tsx",
        name: "page.tsx",
        type: "file",
        content:
          'export default function Home() {\n  return (\n    <main style={{ padding: "2rem" }}>\n      <h1>My Next.js App</h1>\n      <p>Start building your project here.</p>\n    </main>\n  )\n}\n',
      },
    ],
  },
  {
    id: "components",
    name: "components",
    type: "folder",
    isOpen: true,
    children: [
      {
        id: "components/Hero.tsx",
        name: "Hero.tsx",
        type: "file",
        content:
          'export default function Hero() {\n  return (\n    <section>\n      <h2>Welcome</h2>\n      <p>Ship something great.</p>\n    </section>\n  )\n}\n',
      },
    ],
  },
  {
    id: "package.json",
    name: "package.json",
    type: "file",
    content:
      '{\n  "name": "next-basic",\n  "private": true,\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build",\n    "start": "next start"\n  },\n  "dependencies": {\n    "next": "latest",\n    "react": "latest",\n    "react-dom": "latest"\n  }\n}\n',
  },
  {
    id: "tsconfig.json",
    name: "tsconfig.json",
    type: "file",
    content:
      '{\n  "compilerOptions": {\n    "target": "ES2017",\n    "lib": ["dom", "dom.iterable", "esnext"],\n    "allowJs": true,\n    "skipLibCheck": true,\n    "strict": true,\n    "noEmit": true,\n    "module": "esnext",\n    "moduleResolution": "bundler",\n    "resolveJsonModule": true,\n    "isolatedModules": true,\n    "jsx": "preserve"\n  },\n  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],\n  "exclude": ["node_modules"]\n}\n',
  },
  {
    id: "next.config.ts",
    name: "next.config.ts",
    type: "file",
    content:
      'import type { NextConfig } from "next"\n\nconst nextConfig: NextConfig = {}\n\nexport default nextConfig\n',
  },
]

const NODE_BASIC_TEMPLATE: FileNode[] = [
  {
    id: "src",
    name: "src",
    type: "folder",
    isOpen: true,
    children: [
      {
        id: "src/index.js",
        name: "index.js",
        type: "file",
        content:
          'function main() {\n  console.log("Hello from IUDEX")\n}\n\nmain()\n',
      },
      {
        id: "src/utils",
        name: "utils",
        type: "folder",
        isOpen: false,
        children: [
          {
            id: "src/utils/logger.js",
            name: "logger.js",
            type: "file",
            content:
              'export function log(message) {\n  console.log(`[app] ${message}`)\n}\n',
          },
        ],
      },
    ],
  },
  {
    id: "package.json",
    name: "package.json",
    type: "file",
    content:
      '{\n  "name": "node-basic",\n  "private": true,\n  "type": "module",\n  "scripts": {\n    "dev": "node --watch src/index.js",\n    "start": "node src/index.js"\n  }\n}\n',
  },
  {
    id: ".gitignore",
    name: ".gitignore",
    type: "file",
    content: "node_modules\n.env\n",
  },
  {
    id: "README.md",
    name: "README.md",
    type: "file",
    content:
      "# Node Basic\n\nA small Node.js starter project created inside IUDEX.\n",
  },
]

const PROJECT_TEMPLATE_TREES: Record<ProjectTemplateId, FileNode[]> = {
  empty: [],
  starter: INITIAL_TREE,
  "next-basic": NEXT_BASIC_TEMPLATE,
  "node-basic": NODE_BASIC_TEMPLATE,
}

function cloneFileNodes(nodes: FileNode[]): FileNode[] {
  return nodes.map((node) => ({
    ...node,
    children: node.children ? cloneFileNodes(node.children) : undefined,
  }))
}

export function getProjectTemplate(templateId: ProjectTemplateId): FileNode[] {
  return cloneFileNodes(PROJECT_TEMPLATE_TREES[templateId])
}

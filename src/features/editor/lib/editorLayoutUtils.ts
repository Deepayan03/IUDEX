import type { FileNode } from "@/features/editor/lib/types";
import { flatFiles } from "@/features/editor/lib/utils";

export function updateContent(
  nodes: FileNode[],
  id: string,
  content: string,
): FileNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, content };
    if (n.children) {
      return { ...n, children: updateContent(n.children, id, content) };
    }
    return n;
  });
}

export function getBuildTaskCommand(tree: FileNode[]): string | null {
  const names = new Set(
    flatFiles(tree).map(({ node }) => node.name.toLowerCase()),
  );

  if (names.has("package.json")) return "npm run build";
  if (names.has("cargo.toml")) return "cargo build";
  if (names.has("go.mod")) return "go build";

  return null;
}

export function getRunCommandForFile(file: FileNode): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return `node ${file.name}`;
    case "ts":
    case "tsx":
      return `tsx ${file.name}`;
    case "py":
      return `python ${file.name}`;
    case "sh":
      return `sh ${file.name}`;
    case "php":
      return `php ${file.name}`;
    default:
      return null;
  }
}

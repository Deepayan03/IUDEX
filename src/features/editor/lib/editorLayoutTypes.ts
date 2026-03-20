"use client";

export type EditorOverlay =
  | "command-palette"
  | "quick-open"
  | "open-recent"
  | null;

export interface GitHubImportMeta {
  owner: string;
  repo: string;
  branch: string;
}

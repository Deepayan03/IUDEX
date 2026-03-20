"use client";

export interface CollaborationUserInfo {
  userId: string;
  username: string;
}

export interface ActiveFilePresence {
  id: string;
  name: string;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface GithubMeta {
  owner: string;
  repo: string;
  branch: string;
}

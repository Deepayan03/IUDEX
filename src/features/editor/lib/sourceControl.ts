export interface GitHubRepoRef {
  owner: string
  repo: string
  branch: string
}

export type ScmChangeType = "added" | "modified" | "deleted"

export interface ScmFileChange {
  fileId: string
  path: string
  type: ScmChangeType
  content?: string
}

export interface ScmPublishEvent {
  id: string
  kind: "push" | "pull-request"
  userId: string
  username: string
  branch: string
  fileCount: number
  timestamp: number
  pullRequestUrl?: string
}

export interface GitHubConnectionStatus {
  configured: boolean
  connected: boolean
  source: "session" | "connection" | null
  viewer: {
    login: string
    avatar_url: string
    html_url: string
    name: string | null
  } | null
}

export interface GitHubRepoListItem {
  id: number
  name: string
  full_name: string
  private: boolean
  default_branch: string
  description: string | null
  updated_at: string
  owner: {
    login: string
  }
}

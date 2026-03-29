import type { NextRequest } from "next/server"
import type {
  GitHubRepoRef,
  GitHubRepoListItem,
  ScmFileChange,
} from "@/features/editor/lib/sourceControl"
import {
  githubFetchJson,
  getGitHubAuthContext,
} from "@/shared/auth/github"

interface GitRefResponse {
  object: {
    sha: string
  }
}

interface GitCommitResponse {
  sha: string
  html_url?: string
  tree: {
    sha: string
  }
}

interface GitTreeResponse {
  sha: string
}

interface PullRequestResponse {
  html_url: string
  number: number
}

interface CreateRepositoryResponse {
  html_url: string
  name: string
  default_branch: string
  owner: {
    login: string
  }
}

export interface CommitResult {
  branch: string
  commitSha: string
  commitUrl?: string
}

export interface PullRequestResult extends CommitResult {
  pullRequestUrl: string
  pullRequestNumber: number
}

function encodeRepoPath(value: string): string {
  return encodeURIComponent(value)
}

function encodeGitRef(branch: string): string {
  return encodeURIComponent(`heads/${branch}`)
}

async function getRequiredGitHubAccessToken(
  request: NextRequest,
): Promise<string> {
  const context = await getGitHubAuthContext(request)

  if (!context) {
    throw new Error("Connect GitHub to use source control features.")
  }

  return context.token
}

async function getBranchHeadSha(
  repo: GitHubRepoRef,
  token: string,
): Promise<string> {
  const data = await githubFetchJson<GitRefResponse>(
    `/repos/${encodeRepoPath(repo.owner)}/${encodeRepoPath(repo.repo)}/git/ref/${encodeGitRef(repo.branch)}`,
    token,
  )

  return data.object.sha
}

async function getCommitTreeSha(
  repo: GitHubRepoRef,
  commitSha: string,
  token: string,
): Promise<string> {
  const data = await githubFetchJson<GitCommitResponse>(
    `/repos/${encodeRepoPath(repo.owner)}/${encodeRepoPath(repo.repo)}/git/commits/${encodeRepoPath(commitSha)}`,
    token,
  )

  return data.tree.sha
}

async function createTree(
  repo: GitHubRepoRef,
  baseTreeSha: string,
  changes: ScmFileChange[],
  token: string,
): Promise<string> {
  const data = await githubFetchJson<GitTreeResponse>(
    `/repos/${encodeRepoPath(repo.owner)}/${encodeRepoPath(repo.repo)}/git/trees`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: changes.map((change) =>
          change.type === "deleted"
            ? {
                path: change.path,
                mode: "100644",
                type: "blob",
                sha: null,
              }
            : {
                path: change.path,
                mode: "100644",
                type: "blob",
                content: change.content ?? "",
              },
        ),
      }),
    },
  )

  return data.sha
}

async function createCommit(
  repo: GitHubRepoRef,
  message: string,
  treeSha: string,
  parentSha: string,
  token: string,
): Promise<CommitResult> {
  const data = await githubFetchJson<GitCommitResponse>(
    `/repos/${encodeRepoPath(repo.owner)}/${encodeRepoPath(repo.repo)}/git/commits`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        tree: treeSha,
        parents: [parentSha],
      }),
    },
  )

  return {
    branch: repo.branch,
    commitSha: data.sha,
    commitUrl: data.html_url,
  }
}

async function updateBranchHead(
  repo: GitHubRepoRef,
  commitSha: string,
  token: string,
): Promise<void> {
  await githubFetchJson(
    `/repos/${encodeRepoPath(repo.owner)}/${encodeRepoPath(repo.repo)}/git/refs/${encodeGitRef(repo.branch)}`,
    token,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sha: commitSha,
        force: false,
      }),
    },
  )
}

async function createBranch(
  repo: GitHubRepoRef,
  branchName: string,
  headSha: string,
  token: string,
): Promise<void> {
  await githubFetchJson(
    `/repos/${encodeRepoPath(repo.owner)}/${encodeRepoPath(repo.repo)}/git/refs`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: headSha,
      }),
    },
  )
}

export async function commitToGitHubBranch(options: {
  request: NextRequest
  repo: GitHubRepoRef
  changes: ScmFileChange[]
  message: string
}): Promise<CommitResult> {
  const token = await getRequiredGitHubAccessToken(options.request)
  const headSha = await getBranchHeadSha(options.repo, token)
  const baseTreeSha = await getCommitTreeSha(options.repo, headSha, token)
  const nextTreeSha = await createTree(
    options.repo,
    baseTreeSha,
    options.changes,
    token,
  )
  const commit = await createCommit(
    options.repo,
    options.message,
    nextTreeSha,
    headSha,
    token,
  )
  await updateBranchHead(options.repo, commit.commitSha, token)
  return commit
}

function sanitizeBranchSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/-]+/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/^-+|-+$/g, "")
    .replace(/^\/+|\/+$/g, "")
}

export function buildScmBranchName(
  roomId: string,
  username: string,
): string {
  const roomSegment = sanitizeBranchSegment(roomId).slice(0, 28) || "room"
  const userSegment = sanitizeBranchSegment(username).slice(0, 18) || "user"
  const suffix = Date.now().toString(36)
  return `iudex/${roomSegment}-${userSegment}-${suffix}`
}

export async function createPullRequestFromChanges(options: {
  request: NextRequest
  repo: GitHubRepoRef
  changes: ScmFileChange[]
  message: string
  roomId: string
  username: string
}): Promise<PullRequestResult> {
  const token = await getRequiredGitHubAccessToken(options.request)
  const headSha = await getBranchHeadSha(options.repo, token)
  const branchName = buildScmBranchName(options.roomId, options.username)
  await createBranch(options.repo, branchName, headSha, token)

  const branchRepo: GitHubRepoRef = {
    ...options.repo,
    branch: branchName,
  }

  const baseTreeSha = await getCommitTreeSha(options.repo, headSha, token)
  const nextTreeSha = await createTree(
    branchRepo,
    baseTreeSha,
    options.changes,
    token,
  )
  const commit = await createCommit(
    branchRepo,
    options.message,
    nextTreeSha,
    headSha,
    token,
  )
  await updateBranchHead(branchRepo, commit.commitSha, token)

  const pr = await githubFetchJson<PullRequestResponse>(
    `/repos/${encodeRepoPath(options.repo.owner)}/${encodeRepoPath(options.repo.repo)}/pulls`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: options.message,
        head: branchName,
        base: options.repo.branch,
        body: [
          "Opened from IUDEX.",
          "",
          `Room: ${options.roomId}`,
          `Author: ${options.username}`,
        ].join("\n"),
      }),
    },
  )

  return {
    branch: branchName,
    commitSha: commit.commitSha,
    commitUrl: commit.commitUrl,
    pullRequestUrl: pr.html_url,
    pullRequestNumber: pr.number,
  }
}

export async function listAuthenticatedUserRepositories(
  request: NextRequest,
): Promise<GitHubRepoListItem[]> {
  const token = await getRequiredGitHubAccessToken(request)

  return githubFetchJson<GitHubRepoListItem[]>(
    "/user/repos?sort=updated&direction=desc&per_page=100&affiliation=owner",
    token,
  )
}

export async function createRepositoryFromProject(options: {
  request: NextRequest
  name: string
  description?: string
  isPrivate: boolean
  files: ScmFileChange[]
  initialCommitMessage: string
}): Promise<{
  repo: GitHubRepoRef
  url: string
  commit?: CommitResult
}> {
  const token = await getRequiredGitHubAccessToken(options.request)

  const repo = await githubFetchJson<CreateRepositoryResponse>(
    "/user/repos",
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: options.name,
        description: options.description?.trim() || undefined,
        private: options.isPrivate,
        auto_init: true,
      }),
    },
  )

  const repoRef: GitHubRepoRef = {
    owner: repo.owner.login,
    repo: repo.name,
    branch: repo.default_branch,
  }

  const files = options.files.slice()

  if (!files.some((file) => file.path === "README.md")) {
    files.unshift({
      fileId: "README.md",
      path: "README.md",
      type: "deleted",
    })
  }

  let commit: CommitResult | undefined

  if (files.length > 0) {
    const headSha = await getBranchHeadSha(repoRef, token)
    const baseTreeSha = await getCommitTreeSha(repoRef, headSha, token)
    const nextTreeSha = await createTree(repoRef, baseTreeSha, files, token)
    commit = await createCommit(
      repoRef,
      options.initialCommitMessage,
      nextTreeSha,
      headSha,
      token,
    )
    await updateBranchHead(repoRef, commit.commitSha, token)
  }

  return {
    repo: repoRef,
    url: repo.html_url,
    commit,
  }
}

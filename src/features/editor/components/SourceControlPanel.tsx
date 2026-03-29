"use client"

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"
import type { ActivityAction } from "@/features/editor/activity-log/types"
import { buildFileRealtimeRoomId, resolveRealtimeWsUrl } from "@/features/editor/collaboration/shared"
import { githubTreeToFileNodes } from "@/features/editor/lib/github"
import {
  clearGitHubConnectionStatusCache,
  connectGitHubWithPopup,
  disconnectGitHub,
  getCachedGitHubConnectionStatus,
  getGitHubConnectionStatus,
} from "@/features/editor/lib/githubAuth"
import type {
  GitHubConnectionStatus,
  GitHubRepoListItem,
  ScmChangeType,
  ScmFileChange,
  ScmPublishEvent,
} from "@/features/editor/lib/sourceControl"
import type { FileNode } from "@/features/editor/lib/types"
import { flatFiles } from "@/features/editor/lib/utils"
import { useScmMetaRoom } from "@/features/editor/hooks/useScmMetaRoom"
import { useRenderLogger } from "@/features/editor/hooks/useRenderLogger"
import { useEditorTabsStore } from "@/shared/state/editorTabs"

interface SourceControlPanelProps {
  tree: FileNode[]
  sidebarWidth: number
  roomId?: string
  userInfo?: { userId: string; username: string } | null
  unsavedIds: Set<string>
}

type LoadState =
  | { status: "idle" }
  | { status: "loading"; message: string }
  | { status: "ready" }
  | { status: "error"; message: string }

function getStatusLetter(type: ScmChangeType): "A" | "M" | "D" {
  if (type === "added") return "A"
  if (type === "deleted") return "D"
  return "M"
}

function getStatusColor(type: ScmChangeType): string {
  if (type === "added") return "#4ade80"
  if (type === "deleted") return "#f87171"
  return "#facc15"
}

function sortChanges(changes: ScmFileChange[]): ScmFileChange[] {
  const order: Record<ScmChangeType, number> = {
    added: 0,
    modified: 1,
    deleted: 2,
  }

  return changes
    .slice()
    .sort((left, right) => {
      if (left.type !== right.type) {
        return order[left.type] - order[right.type]
      }

      return left.path.localeCompare(right.path)
    })
}

function formatFileCountLabel(count: number): string {
  return `${count} file${count === 1 ? "" : "s"}`
}

function actionTargetsFile(action: ActivityAction): boolean {
  return action === "edit" || action === "create-file" || action === "delete-file"
}

async function getResponseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string }
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error
    }
  } catch {
    // Ignore JSON parsing issues and fall back to the status text.
  }

  return response.statusText || `Request failed (${response.status})`
}

async function fetchRemoteRepoTree(
  owner: string,
  repo: string,
  branch: string,
): Promise<FileNode[]> {
  const params = new URLSearchParams({ owner, repo, branch })
  const response = await fetch(`/api/github/tree?${params}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(await getResponseError(response))
  }

  const data = (await response.json()) as {
    tree: Array<{
      path: string
      type: "blob" | "tree"
      size?: number
      sha: string
    }>
  }

  return githubTreeToFileNodes(data.tree)
}

async function fetchRemoteFileContent(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<string> {
  const params = new URLSearchParams({
    owner,
    repo,
    branch,
    path,
  })
  const response = await fetch(`/api/github/content?${params}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(await getResponseError(response))
  }

  const data = (await response.json()) as { content: string }
  return data.content
}

async function readRealtimeFileContent(
  roomId: string,
  fileId: string,
): Promise<string> {
  return new Promise((resolve) => {
    const ydoc = new Y.Doc()
    const provider = new WebsocketProvider(
      resolveRealtimeWsUrl(),
      buildFileRealtimeRoomId(roomId, fileId),
      ydoc,
      {
        connect: true,
        params: {},
        resyncInterval: 30000,
        maxBackoffTime: 10000,
      },
    )

    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      provider.off("sync", handleSync)
      provider.disconnect()
      provider.destroy()
      const text = ydoc.getText("content").toString()
      ydoc.destroy()
      resolve(text)
    }

    const handleSync = (isSynced: boolean) => {
      if (isSynced) finish()
    }

    const timeout = window.setTimeout(finish, 1800)

    provider.on("sync", handleSync)
    if (provider.synced) finish()
  })
}

async function resolveLocalFileContent(
  node: FileNode,
  roomId: string,
  options?: {
    preferNodeContent?: boolean
  },
): Promise<string> {
  if (options?.preferNodeContent && node.content !== undefined) {
    return node.content
  }

  if (!node.githubPath) {
    return node.content ?? ""
  }

  const realtimeContent = await readRealtimeFileContent(roomId, node.id)
  if (realtimeContent.length > 0 || node.content === undefined) {
    return realtimeContent
  }

  return node.content
}

function getLoadedFileBaselineContent(node: FileNode): string | null {
  if (typeof node.content !== "string") {
    return null
  }

  return node.content
}

function resolveTrackedPath(
  files: Map<string, FileNode>,
  candidate: string,
): string | null {
  if (files.has(candidate)) {
    return candidate
  }

  for (const [path, node] of files.entries()) {
    if (node.id === candidate) {
      return path
    }
  }

  return null
}

async function fetchGitHubRepositories():
  Promise<GitHubRepoListItem[]> {
  const response = await fetch("/api/github/repos", {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(await getResponseError(response))
  }

  const data = (await response.json()) as {
    repos: GitHubRepoListItem[]
  }

  return data.repos
}

let cachedGitHubRepositories: GitHubRepoListItem[] | null = null
let cachedGitHubRepositoriesPromise: Promise<GitHubRepoListItem[]> | null = null

function getCachedGitHubRepositories(): GitHubRepoListItem[] | null {
  return cachedGitHubRepositories
}

function setCachedGitHubRepositories(repos: GitHubRepoListItem[]): void {
  cachedGitHubRepositories = repos
}

function clearCachedGitHubRepositories(): void {
  cachedGitHubRepositories = null
  cachedGitHubRepositoriesPromise = null
}

async function loadGitHubRepositories(options?: {
  force?: boolean
}): Promise<GitHubRepoListItem[]> {
  const force = options?.force ?? false

  if (!force && cachedGitHubRepositories) {
    return cachedGitHubRepositories
  }

  if (!force && cachedGitHubRepositoriesPromise) {
    return cachedGitHubRepositoriesPromise
  }

  cachedGitHubRepositoriesPromise = fetchGitHubRepositories().then((repos) => {
    cachedGitHubRepositories = repos
    return repos
  })

  try {
    return await cachedGitHubRepositoriesPromise
  } finally {
    cachedGitHubRepositoriesPromise = null
  }
}

export default function SourceControlPanel({
  tree,
  sidebarWidth,
  roomId,
  userInfo,
  unsavedIds,
}: SourceControlPanelProps) {
  const [githubStatus, setGitHubStatus] = useState<GitHubConnectionStatus | null>(
    () => getCachedGitHubConnectionStatus(),
  )
  const [connectionState, setConnectionState] = useState<LoadState>(() =>
    getCachedGitHubConnectionStatus()
      ? { status: "ready" }
      : {
          status: "loading",
          message: "Checking GitHub connection...",
        },
  )
  const [changeState, setChangeState] = useState<LoadState>({ status: "idle" })
  const [repoListState, setRepoListState] = useState<LoadState>(() =>
    getCachedGitHubRepositories()
      ? { status: "ready" }
      : { status: "idle" },
  )
  const [changes, setChanges] = useState<ScmFileChange[]>([])
  const [availableRepos, setAvailableRepos] = useState<GitHubRepoListItem[]>(
    () => getCachedGitHubRepositories() ?? [],
  )
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoListItem | null>(null)
  const [commitMessage, setCommitMessage] = useState("")
  const [newRepoName, setNewRepoName] = useState("")
  const [newRepoDescription, setNewRepoDescription] = useState("")
  const [newRepoPrivate, setNewRepoPrivate] = useState(false)
  const [actionState, setActionState] = useState<LoadState>({ status: "idle" })
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const refreshIdRef = useRef(0)
  const repoNameInitializedForRoomRef = useRef<string | null>(null)

  const {
    githubRepo,
    activityEntries,
    publishEvent,
    importProject,
    setLinkedRepo,
  } = useScmMetaRoom({ roomId })

  const fetchConnectionStatus = useCallback(async (options?: {
    force?: boolean
  }) => {
    const force = options?.force ?? false
    const cachedStatus = force ? null : getCachedGitHubConnectionStatus()

    if (cachedStatus) {
      setGitHubStatus(cachedStatus)
      setConnectionState({ status: "ready" })
      return cachedStatus
    }

    setConnectionState({
      status: "loading",
      message: "Checking GitHub connection...",
    })

    try {
      const nextStatus = await getGitHubConnectionStatus({ force })
      const previousViewerLogin = githubStatus?.viewer?.login ?? null
      const nextViewerLogin = nextStatus.viewer?.login ?? null

      if (
        !nextStatus.connected ||
        (previousViewerLogin && previousViewerLogin !== nextViewerLogin)
      ) {
        clearCachedGitHubRepositories()
      }

      setGitHubStatus(nextStatus)
      setConnectionState({ status: "ready" })
      return nextStatus
    } catch (error) {
      setConnectionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to check GitHub connection.",
      })
      return null
    }
  }, [githubStatus?.viewer?.login])

  useEffect(() => {
    void fetchConnectionStatus()
  }, [fetchConnectionStatus])

  const localFiles = useMemo(() => {
    return new Map(flatFiles(tree).map(({ node, path }) => [path, node]))
  }, [tree])
  const localFilesRef = useRef(localFiles)
  const activityEntriesRef = useRef(activityEntries)
  const unsavedIdsRef = useRef(unsavedIds)

  useEffect(() => {
    if (roomId && repoNameInitializedForRoomRef.current !== roomId) {
      setNewRepoName(`iudex-${roomId.slice(0, 8)}`)
      repoNameInitializedForRoomRef.current = roomId
    }
  }, [roomId])

  const projectFileCount = localFiles.size

  useEffect(() => {
    localFilesRef.current = localFiles
  }, [localFiles])

  useEffect(() => {
    activityEntriesRef.current = activityEntries
  }, [activityEntries])

  useEffect(() => {
    unsavedIdsRef.current = unsavedIds
  }, [unsavedIds])

  const unsavedFileCount = unsavedIds.size
  const trackedActivityCount = activityEntries.filter((entry) =>
    actionTargetsFile(entry.action),
  ).length

  useRenderLogger("source-control-panel", {
    roomId: roomId ?? null,
    sidebarWidth,
    githubRepo: githubRepo ? `${githubRepo.owner}/${githubRepo.repo}@${githubRepo.branch}` : null,
    githubConnected: !!githubStatus?.connected,
    githubAuthSource: githubStatus?.source ?? null,
    connectionState: connectionState.status,
    repoListState: repoListState.status,
    changeState: changeState.status,
    actionState: actionState.status,
    repoCount: availableRepos.length,
    selectedRepo: selectedRepo?.full_name ?? null,
    changeCount: changes.length,
    unsavedFileCount,
    trackedActivityCount,
    projectFileCount,
  })

  const refreshChanges = useCallback(async () => {
    if (!githubRepo || !roomId) {
      setChanges([])
      setChangeState({ status: "idle" })
      return
    }

    const refreshId = ++refreshIdRef.current
    setChangeState({
      status: "loading",
      message: "Inspecting repository changes...",
    })

    try {
      const currentLocalFiles = localFilesRef.current
      const currentActivityEntries = activityEntriesRef.current
      const currentUnsavedIds = unsavedIdsRef.current

      const remoteTree = await fetchRemoteRepoTree(
        githubRepo.owner,
        githubRepo.repo,
        githubRepo.branch,
      )
      const remoteFiles = new Map(
        flatFiles(remoteTree).map(({ node, path }) => [path, node]),
      )

      const addedChanges: ScmFileChange[] = []
      const deletedChanges: ScmFileChange[] = []
      const candidatePaths = new Set<string>()

      for (const path of currentLocalFiles.keys()) {
        if (!remoteFiles.has(path)) {
          const node = currentLocalFiles.get(path)
          if (!node) continue

          addedChanges.push({
            fileId: node.id,
            path,
            type: "added",
            content: await resolveLocalFileContent(node, roomId),
          })
        }
      }

      for (const [path] of remoteFiles) {
        if (currentLocalFiles.has(path)) continue
        deletedChanges.push({
          fileId: path,
          path,
          type: "deleted",
        })
      }

      for (const fileId of currentUnsavedIds) {
        const trackedPath = resolveTrackedPath(currentLocalFiles, fileId)
        if (trackedPath) {
          candidatePaths.add(trackedPath)
        }
      }

      for (const entry of currentActivityEntries) {
        if (!actionTargetsFile(entry.action)) continue
        const trackedPath = resolveTrackedPath(currentLocalFiles, entry.targetFile)
        if (trackedPath) {
          candidatePaths.add(trackedPath)
        }
      }

      const modifiedChanges = (
        await Promise.all(
          Array.from(candidatePaths).map(
            async (path): Promise<ScmFileChange | null> => {
              const localNode = currentLocalFiles.get(path)
              if (!localNode || !remoteFiles.has(path)) return null

              const localContent = await resolveLocalFileContent(localNode, roomId)
              const loadedBaselineContent = getLoadedFileBaselineContent(localNode)
              const isLocallyDirty = currentUnsavedIds.has(localNode.id)

              // Opening a GitHub-backed file lazily hydrates its room/model
              // content, but that alone should not count as a repository edit.
              // Only treat the file as modified once the live room content has
              // diverged from the loaded baseline we already know about.
              if (
                localNode.githubPath &&
                !isLocallyDirty &&
                loadedBaselineContent !== null &&
                localContent === loadedBaselineContent
              ) {
                return null
              }

              const preferredLocalContent = await resolveLocalFileContent(localNode, roomId, {
                preferNodeContent: isLocallyDirty,
              })

              const remoteContent = await fetchRemoteFileContent(
                githubRepo.owner,
                githubRepo.repo,
                githubRepo.branch,
                path,
              )

              if (preferredLocalContent === remoteContent) {
                return null
              }

              return {
                fileId: localNode.id,
                path,
                type: "modified",
                content: preferredLocalContent,
              }
            },
          ),
        )
      ).filter((entry): entry is ScmFileChange => entry !== null)

      if (refreshId !== refreshIdRef.current) return

      startTransition(() => {
        setChanges(
          sortChanges([
            ...addedChanges,
            ...modifiedChanges,
            ...deletedChanges,
          ]),
        )
      })
      setChangeState({ status: "ready" })
    } catch (error) {
      if (refreshId !== refreshIdRef.current) return
      setChangeState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to inspect repository changes.",
      })
    }
  }, [githubRepo, roomId])

  useEffect(() => {
    if (!githubRepo || !roomId || !githubStatus?.connected) {
      setChanges([])
      if (!githubRepo) {
        setChangeState({ status: "idle" })
      }
      return
    }

    const timeout = window.setTimeout(() => {
      void refreshChanges()
    }, 450)

    return () => window.clearTimeout(timeout)
  }, [
    githubRepo,
    githubStatus?.connected,
    refreshChanges,
    roomId,
    unsavedFileCount,
    trackedActivityCount,
    projectFileCount,
  ])

  const loadRepositories = useCallback(async (options?: {
    force?: boolean
  }) => {
    const force = options?.force ?? false
    const cachedRepos = force ? null : getCachedGitHubRepositories()

    if (cachedRepos) {
      setAvailableRepos(cachedRepos)
      setRepoListState({ status: "ready" })
      return cachedRepos
    }

    setRepoListState({
      status: "loading",
      message: "Loading your GitHub repositories...",
    })

    try {
      const repos = await loadGitHubRepositories({ force })
      setAvailableRepos(repos)
      setRepoListState({ status: "ready" })
      return repos
    } catch (error) {
      setRepoListState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load your GitHub repositories.",
      })
      return null
    }
  }, [])

  useEffect(() => {
    if (!roomId || githubRepo || !githubStatus?.connected) {
      setSelectedRepo(null)
      setAvailableRepos([])
      setRepoListState({ status: "idle" })
      return
    }

    void loadRepositories()
  }, [githubRepo, githubStatus?.connected, loadRepositories, roomId])

  const handleConnectGitHub = useCallback(async () => {
    setSuccessMessage(null)
    setActionState({
      status: "loading",
      message: "Opening GitHub connection window...",
    })

    try {
      await connectGitHubWithPopup()
      clearGitHubConnectionStatusCache()
      clearCachedGitHubRepositories()
      await fetchConnectionStatus({ force: true })
      setActionState({ status: "idle" })
      setSuccessMessage("GitHub connected. Source control is ready.")
    } catch (error) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "GitHub connection failed.",
      })
    }
  }, [fetchConnectionStatus])

  const handleDisconnectGitHub = useCallback(async () => {
    setSuccessMessage(null)
    setActionState({
      status: "loading",
      message: "Disconnecting GitHub...",
    })

    try {
      await disconnectGitHub()
      clearGitHubConnectionStatusCache()
      clearCachedGitHubRepositories()
      await fetchConnectionStatus({ force: true })
      setActionState({ status: "idle" })
      setChanges([])
    } catch (error) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to disconnect GitHub.",
      })
    }
  }, [fetchConnectionStatus])

  const handleUnlinkRepository = useCallback(() => {
    if (!githubRepo) return

    setSuccessMessage(null)

    const didUnlink = setLinkedRepo(null)
    if (!didUnlink) {
      setActionState({
        status: "error",
        message: "Unable to unlink this room from the current repository.",
      })
      return
    }

    setSelectedRepo(null)
    setChanges([])
    setCommitMessage("")
    setChangeState({ status: "idle" })
    setActionState({ status: "idle" })
    setSuccessMessage(
      `${githubRepo.owner}/${githubRepo.repo} is no longer linked to this room.`,
    )
  }, [githubRepo, setLinkedRepo])

  const buildProjectFiles = useCallback(async (): Promise<ScmFileChange[]> => {
    if (!roomId) return []

    const files = await Promise.all(
      Array.from(localFiles.entries()).map(async ([path, node]) => ({
        fileId: node.id,
        path,
        type: "added" as const,
        content: await resolveLocalFileContent(node, roomId),
      })),
    )

    return files
  }, [localFiles, roomId])

  const handleImportSelectedRepo = useCallback(async () => {
    if (!selectedRepo) return

    setSuccessMessage(null)
    setActionState({
      status: "loading",
      message: `Importing ${selectedRepo.full_name} into this room...`,
    })

    try {
      const nextTree = await fetchRemoteRepoTree(
        selectedRepo.owner.login,
        selectedRepo.name,
        selectedRepo.default_branch,
      )

      const didImport = importProject(nextTree, {
        owner: selectedRepo.owner.login,
        repo: selectedRepo.name,
        branch: selectedRepo.default_branch,
      })

      if (!didImport) {
        throw new Error("Unable to import the selected repository into this room.")
      }

      setSelectedRepo(null)
      setActionState({ status: "idle" })
      setSuccessMessage(`${selectedRepo.full_name} imported into this room.`)
    } catch (error) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to import the selected repository.",
      })
    }
  }, [importProject, selectedRepo])

  const handleCreateRepository = useCallback(async () => {
    if (!roomId || !userInfo) return

    const name = newRepoName.trim()
    if (!name) {
      setActionState({
        status: "error",
        message: "Enter a repository name first.",
      })
      return
    }

    setSuccessMessage(null)
    setActionState({
      status: "loading",
      message: "Creating the GitHub repository and pushing this project...",
    })

    try {
      const files = await buildProjectFiles()
      const response = await fetch("/api/github/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: newRepoDescription,
          isPrivate: newRepoPrivate,
          files,
          initialCommitMessage: "Initial commit from IUDEX",
        }),
      })

      if (!response.ok) {
        throw new Error(await getResponseError(response))
      }

      const data = (await response.json()) as {
        repo: { owner: string; repo: string; branch: string }
        url: string
      }

      const didLink = setLinkedRepo(data.repo)
      if (!didLink) {
        throw new Error("Repository was created, but this room could not link to it.")
      }

      publishEvent({
        id: crypto.randomUUID(),
        kind: "push",
        userId: userInfo.userId,
        username: userInfo.username,
        branch: data.repo.branch,
        fileCount: files.length,
        timestamp: Date.now(),
      })

      const tabs = useEditorTabsStore.getState()
      for (const file of files) {
        tabs.markClean(file.fileId)
      }

      setActionState({ status: "idle" })
      setSuccessMessage(
        `Created ${data.repo.owner}/${data.repo.repo}, pushed ${formatFileCountLabel(files.length)} to ${data.repo.branch}, and linked it to this room.`,
      )
      setAvailableRepos((prev) => {
        const nextRepos = prev.some(
          (repo) => repo.full_name === `${data.repo.owner}/${data.repo.repo}`,
        )
          ? prev
          : [
              {
                id: Date.now(),
                name: data.repo.repo,
                full_name: `${data.repo.owner}/${data.repo.repo}`,
                private: newRepoPrivate,
                default_branch: data.repo.branch,
                description: newRepoDescription || null,
                updated_at: new Date().toISOString(),
                owner: { login: data.repo.owner },
              },
              ...prev,
            ]

        setCachedGitHubRepositories(nextRepos)
        return nextRepos
      })
    } catch (error) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to create the repository.",
      })
    }
  }, [
    buildProjectFiles,
    newRepoDescription,
    newRepoName,
    newRepoPrivate,
    publishEvent,
    roomId,
    setLinkedRepo,
    userInfo,
  ])

  const runScmAction = useCallback(
    async (kind: "commit" | "pull-request") => {
      if (!githubRepo || !roomId || !userInfo) return

      const message = commitMessage.trim()
      if (!message) {
        setActionState({
          status: "error",
          message:
            kind === "commit"
              ? "Enter a commit message before pushing."
              : "Enter a title before opening a pull request.",
        })
        return
      }

      if (changes.length === 0) {
        setActionState({
          status: "error",
          message: "There are no repository changes to publish.",
        })
        return
      }

      setSuccessMessage(null)
      setActionState({
        status: "loading",
        message:
          kind === "commit"
            ? `Pushing ${changes.length} file${changes.length === 1 ? "" : "s"} to ${githubRepo.branch}...`
            : "Opening pull request...",
      })

      try {
        const response = await fetch(
          kind === "commit"
            ? "/api/github/commit"
            : "/api/github/pull-request",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              repo: githubRepo,
              changes,
              message,
              roomId,
              username: userInfo.username,
            }),
          },
        )

        if (!response.ok) {
          throw new Error(await getResponseError(response))
        }

        const data = (await response.json()) as {
          branch: string
          pullRequestUrl?: string
        }

        const event: ScmPublishEvent = {
          id: crypto.randomUUID(),
          kind: kind === "commit" ? "push" : "pull-request",
          userId: userInfo.userId,
          username: userInfo.username,
          branch: kind === "commit" ? githubRepo.branch : data.branch,
          fileCount: changes.length,
          timestamp: Date.now(),
          pullRequestUrl: data.pullRequestUrl,
        }

        publishEvent(event)

        if (kind === "pull-request" && data.pullRequestUrl) {
          window.open(data.pullRequestUrl, "_blank", "noopener,noreferrer")
        }

        const tabs = useEditorTabsStore.getState()
        for (const change of changes) {
          tabs.markClean(change.fileId)
        }

        setActionState({ status: "idle" })
        setSuccessMessage(
          kind === "commit"
            ? `Pushed ${formatFileCountLabel(changes.length)} to ${githubRepo.branch}.`
            : "Pull request opened in GitHub.",
        )

        if (kind === "commit") {
          setCommitMessage("")
        }

        await refreshChanges()
      } catch (error) {
        setActionState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to publish repository changes.",
        })
      }
    },
    [changes, commitMessage, githubRepo, publishEvent, refreshChanges, roomId, userInfo],
  )

  const connectionViewer = githubStatus?.viewer

  return (
    <div
      className="sidebar-bg flex h-full min-h-0 flex-col overflow-hidden shrink-0"
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        borderRight: "1px solid #0d1525",
      }}
    >
      <div
        className="h-9 min-h-9 flex items-center justify-between px-3 shrink-0"
        style={{ borderBottom: "1px solid #0d1525" }}
      >
        <span
          className="text-[10px] font-semibold tracking-widest uppercase"
          style={{ color: "#3a5080" }}
        >
          Source Control
        </span>
        {githubRepo && (
          <button
            onClick={() => void refreshChanges()}
            className="text-[10px] uppercase tracking-wider transition-colors"
            style={{ color: "#4a6080" }}
            type="button"
          >
            Refresh
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 thin-scrollbar">
        {!roomId && (
          <div
            className="rounded-md p-3 text-[12px]"
            style={{
              background: "#0a1020",
              border: "1px solid #1e2d42",
              color: "#8899b0",
            }}
          >
            Source control is only available inside collaborative editor rooms.
          </div>
        )}

        {roomId && connectionState.status === "loading" && (
          <div
            className="rounded-md p-3 text-[12px]"
            style={{
              background: "#0a1020",
              border: "1px solid #1e2d42",
              color: "#7b9ef7",
            }}
          >
            {connectionState.message}
          </div>
        )}

        {roomId && connectionState.status === "error" && (
          <div
            className="rounded-md p-3 text-[12px]"
            style={{
              background: "rgba(231,76,60,0.08)",
              border: "1px solid rgba(231,76,60,0.24)",
              color: "#fca5a5",
            }}
          >
            {connectionState.message}
          </div>
        )}

        {roomId &&
          connectionState.status === "ready" &&
          !githubRepo && (
            <div
              className="rounded-xl px-4 py-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(10,16,32,0.98) 0%, rgba(8,13,24,0.98) 100%)",
                border: "1px solid #1e2d42",
              }}
            >
              <div
                className="mb-3 break-words text-[11px] font-semibold uppercase leading-5 tracking-[0.18em]"
                style={{ color: "#5c7497" }}
              >
                No Repository
              </div>
              <p className="break-words text-[13px] leading-6" style={{ color: "#c8d6e5" }}>
                Link this room to GitHub by importing one of your repositories or
                by creating a brand new repository from the current project.
              </p>
              <p className="mt-2 break-words text-[12px] leading-5" style={{ color: "#6b82a6" }}>
                File editing and collaboration still work even without a linked
                repository.
              </p>

              {!githubStatus?.configured && (
                <div
                  className="mt-4 rounded-md px-3 py-3"
                  style={{
                    background: "rgba(231,76,60,0.08)",
                    border: "1px solid rgba(231,76,60,0.2)",
                    color: "#fca5a5",
                  }}
                >
                  GitHub OAuth is not configured for this app yet.
                </div>
              )}

              {githubStatus?.configured && !githubStatus.connected && (
                <button
                  onClick={() => void handleConnectGitHub()}
                  className="mt-4 w-full rounded-md px-3 py-2 text-[12px] font-semibold transition-colors"
                  style={{
                    background: "#141925",
                    border: "1px solid #243050",
                    color: "#c8d6e5",
                  }}
                  type="button"
                >
                  Login with GitHub
                </button>
              )}

              {githubStatus?.configured && githubStatus.connected && (
                <div className="mt-5 space-y-4">
                  <div
                    className="rounded-md px-3 py-3"
                    style={{
                      background: "#0a1020",
                      border: "1px solid #1e2d42",
                    }}
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-[12px] font-semibold leading-5" style={{ color: "#c8d6e5" }}>
                          {connectionViewer
                            ? `Signed in as @${connectionViewer.login}`
                            : "GitHub token available"}
                        </div>
                        <div className="mt-1 break-words text-[11px] leading-5" style={{ color: "#6b82a6" }}>
                          {githubStatus.source === "session"
                            ? "Using your GitHub app session"
                            : "Using your connected GitHub account"}
                        </div>
                      </div>

                      {githubStatus.source === "connection" && (
                        <button
                          onClick={() => void handleDisconnectGitHub()}
                          className="shrink-0 text-[11px] transition-colors"
                          style={{ color: "#7b9ef7" }}
                          type="button"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    className="rounded-md px-3 py-3"
                    style={{
                      background: "#0a1020",
                      border: "1px solid #1e2d42",
                    }}
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-[12px] font-semibold leading-5" style={{ color: "#c8d6e5" }}>
                          Import One of Your Repositories
                        </div>
                        <div className="mt-1 break-words text-[11px] leading-5" style={{ color: "#6b82a6" }}>
                          Select a repo to replace the current room contents with it.
                        </div>
                      </div>
                      <button
                        onClick={() => void loadRepositories({ force: true })}
                        className="shrink-0 text-[11px] transition-colors"
                        style={{ color: "#7b9ef7" }}
                        type="button"
                      >
                        Refresh
                      </button>
                    </div>

                    {repoListState.status === "loading" && (
                      <div className="mt-3 text-[12px]" style={{ color: "#7b9ef7" }}>
                        {repoListState.message}
                      </div>
                    )}

                    {repoListState.status === "error" && (
                      <div className="mt-3 text-[12px]" style={{ color: "#fca5a5" }}>
                        {repoListState.message}
                      </div>
                    )}

                    {repoListState.status !== "loading" && availableRepos.length === 0 && (
                      <div className="mt-3 text-[12px]" style={{ color: "#6b82a6" }}>
                        No repositories found on this GitHub account.
                      </div>
                    )}

                    {availableRepos.length > 0 && (
                      <div className="mt-3 max-h-[220px] overflow-y-auto thin-scrollbar rounded-md border border-[#161f30]">
                        {availableRepos.map((repo) => (
                          <button
                            key={repo.id}
                            onClick={() => setSelectedRepo(repo)}
                            className="block w-full min-w-0 px-3 py-2 text-left transition-colors"
                            style={{
                              background:
                                selectedRepo?.id === repo.id ? "#111827" : "transparent",
                              borderBottom: "1px solid #161f30",
                            }}
                            type="button"
                          >
                            <div className="break-all text-[12px] font-semibold leading-5" style={{ color: "#c8d6e5" }}>
                              {repo.full_name}
                            </div>
                            <div className="mt-1 break-words text-[11px] leading-5" style={{ color: "#6b82a6" }}>
                              {repo.private ? "Private" : "Public"} · {repo.default_branch}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedRepo && (
                      <div
                        className="mt-3 rounded-md px-3 py-3"
                        style={{
                          background: "#060c18",
                          border: "1px solid #243050",
                        }}
                      >
                        <div className="break-all text-[12px] font-semibold leading-5" style={{ color: "#c8d6e5" }}>
                          Import {selectedRepo.full_name}?
                        </div>
                        <div className="mt-1 text-[11px] leading-5" style={{ color: "#6b82a6" }}>
                          {projectFileCount > 0
                            ? "This will replace the current files in the room with the selected repository."
                            : "This will load the selected repository into the room."}
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                          <button
                            onClick={() => void handleImportSelectedRepo()}
                            className="w-full rounded-md px-3 py-2 text-[12px] font-semibold"
                            style={{ background: "#3d5afe", color: "#fff" }}
                            type="button"
                          >
                            Import Repository
                          </button>
                          <button
                            onClick={() => setSelectedRepo(null)}
                            className="w-full rounded-md px-3 py-2 text-[12px] font-semibold"
                            style={{
                              background: "#141925",
                              border: "1px solid #243050",
                              color: "#c8d6e5",
                            }}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className="rounded-md px-3 py-3"
                    style={{
                      background: "#0a1020",
                      border: "1px solid #1e2d42",
                    }}
                  >
                    <div className="break-words text-[12px] font-semibold leading-5" style={{ color: "#c8d6e5" }}>
                      Create a New Repository from This Project
                    </div>
                    <div className="mt-1 break-words text-[11px] leading-5" style={{ color: "#6b82a6" }}>
                      Push the current room into a fresh GitHub repository.
                    </div>

                    <input
                      value={newRepoName}
                      onChange={(event) => setNewRepoName(event.target.value)}
                      placeholder="Repository name"
                      className="mt-3 w-full rounded-md px-3 py-2 text-[12px] outline-none"
                      style={{
                        background: "#060c18",
                        border: "1px solid #1e2d42",
                        color: "#c8d6e5",
                      }}
                    />

                    <textarea
                      value={newRepoDescription}
                      onChange={(event) => setNewRepoDescription(event.target.value)}
                      placeholder="Description (optional)"
                      className="mt-2 min-h-[72px] w-full rounded-md px-3 py-2 text-[12px] outline-none resize-none"
                      style={{
                        background: "#060c18",
                        border: "1px solid #1e2d42",
                        color: "#c8d6e5",
                      }}
                    />

                    <label className="mt-3 flex items-start gap-2 text-[12px] leading-5" style={{ color: "#c8d6e5" }}>
                      <input
                        type="checkbox"
                        checked={newRepoPrivate}
                        onChange={(event) => setNewRepoPrivate(event.target.checked)}
                      />
                      Create as a private repository
                    </label>

                    <button
                      onClick={() => void handleCreateRepository()}
                      className="mt-3 w-full rounded-md px-3 py-2 text-[12px] font-semibold"
                      style={{ background: "#3d5afe", color: "#fff" }}
                      type="button"
                    >
                      Create Repo and Push Project
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        {roomId &&
          connectionState.status === "ready" &&
          githubRepo &&
          !githubStatus?.configured && (
            <div
              className="rounded-xl px-4 py-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(10,16,32,0.98) 0%, rgba(8,13,24,0.98) 100%)",
                border: "1px solid #1e2d42",
              }}
            >
              <div className="text-[13px] font-semibold" style={{ color: "#c8d6e5" }}>
                GitHub login is unavailable.
              </div>
              <p className="mt-2 text-[12px] leading-5" style={{ color: "#6b82a6" }}>
                Add <code>GITHUB_CLIENT_ID</code> and{" "}
                <code>GITHUB_CLIENT_SECRET</code> to enable source control
                publishing from the editor.
              </p>
              <button
                disabled
                className="mt-4 rounded-md px-3 py-2 text-[12px] font-semibold"
                style={{
                  background: "#141925",
                  border: "1px solid #243050",
                  color: "#4a6080",
                  cursor: "not-allowed",
                }}
                type="button"
              >
                Login with GitHub
              </button>
              <button
                onClick={handleUnlinkRepository}
                className="mt-2 w-full rounded-md px-3 py-2 text-[12px] font-semibold"
                style={{
                  background: "#141925",
                  border: "1px solid #243050",
                  color: "#c8d6e5",
                }}
                type="button"
              >
                Change Repository
              </button>
              <p className="mt-3 text-[11px] leading-5" style={{ color: "#4a6080" }}>
                This button becomes available after GitHub OAuth is configured.
              </p>
            </div>
          )}

        {roomId &&
          connectionState.status === "ready" &&
          githubRepo &&
          githubStatus?.configured &&
          !githubStatus.connected && (
            <div
              className="rounded-xl px-4 py-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(10,16,32,0.98) 0%, rgba(8,13,24,0.98) 100%)",
                border: "1px solid #1e2d42",
              }}
            >
              <div
                className="flex items-center gap-2 text-[13px] font-semibold"
                style={{ color: "#c8d6e5" }}
              >
                <span>GitHub Features Require a GitHub Account</span>
              </div>
              <p className="mt-3 text-[12px] leading-5" style={{ color: "#6b82a6" }}>
                This room is linked to{" "}
                <span style={{ color: "#c8d6e5" }}>
                  {githubRepo.owner}/{githubRepo.repo}
                </span>
                . Connect GitHub to push commits or open pull requests without
                leaving the editor.
              </p>
              <button
                onClick={() => void handleConnectGitHub()}
                className="mt-4 w-full rounded-md px-3 py-2 text-[12px] font-semibold transition-colors"
                style={{
                  background: "#3d5afe",
                  color: "#fff",
                }}
                type="button"
              >
                Login with GitHub
              </button>
              <button
                onClick={handleUnlinkRepository}
                className="mt-2 w-full rounded-md px-3 py-2 text-[12px] font-semibold"
                style={{
                  background: "#141925",
                  border: "1px solid #243050",
                  color: "#c8d6e5",
                }}
                type="button"
              >
                Change Repository
              </button>
              <p className="mt-3 text-[11px] leading-5" style={{ color: "#4a6080" }}>
                You can still edit files and collaborate in this room.
              </p>
            </div>
          )}

        {roomId &&
          connectionState.status === "ready" &&
          githubRepo &&
          githubStatus?.connected && (
            <div className="space-y-3">
              <div
                className="rounded-md px-3 py-3"
                style={{
                  background: "#0a1020",
                  border: "1px solid #1e2d42",
                }}
              >
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="break-all text-[12px] font-semibold leading-5" style={{ color: "#c8d6e5" }}>
                      {githubRepo.owner}/{githubRepo.repo}
                    </div>
                    <div className="mt-1 break-words text-[11px] leading-5" style={{ color: "#6b82a6" }}>
                      Branch: {githubRepo.branch}
                    </div>
                  </div>

                  {connectionViewer && (
                    <div className="min-w-0">
                      <div className="text-[11px]" style={{ color: "#4ade80" }}>
                        Connected
                      </div>
                      <div className="break-all text-[11px] leading-5" style={{ color: "#6b82a6" }}>
                        @{connectionViewer.login}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-col items-start gap-2">
                  <div className="break-words text-[11px] leading-5" style={{ color: "#4a6080" }}>
                    Publishing uses your GitHub identity, not the room.
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <button
                      onClick={handleUnlinkRepository}
                      className="text-[11px] transition-colors"
                      style={{ color: "#7b9ef7" }}
                      type="button"
                    >
                      Change Repository
                    </button>
                    {githubStatus.source === "connection" ? (
                      <button
                        onClick={() => void handleDisconnectGitHub()}
                        className="text-[11px] transition-colors"
                        style={{ color: "#6b82a6" }}
                        type="button"
                      >
                        Disconnect GitHub
                      </button>
                    ) : (
                      <span className="text-[11px]" style={{ color: "#6b82a6" }}>
                        GitHub sign-in session
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="rounded-md overflow-hidden"
                style={{
                  background: "#0a1020",
                  border: "1px solid #1e2d42",
                }}
              >
                <div
                  className="flex flex-wrap items-center gap-2 px-3 py-2"
                  style={{ borderBottom: "1px solid #161f30" }}
                >
                  <span className="text-[12px] font-semibold" style={{ color: "#c8d6e5" }}>
                    {changes.length === 0
                      ? "Working tree clean"
                      : `${changes.length} changed ${changes.length === 1 ? "file" : "files"}`}
                  </span>
                  {changeState.status === "loading" && (
                    <span className="text-[11px]" style={{ color: "#7b9ef7" }}>
                      Refreshing...
                    </span>
                  )}
                </div>

                {changeState.status === "error" && (
                  <div
                    className="px-3 py-3 text-[12px]"
                    style={{
                      color: "#fca5a5",
                      borderBottom: "1px solid #161f30",
                    }}
                  >
                    {changeState.message}
                  </div>
                )}

                {changes.length > 0 ? (
                  <div className="max-h-[220px] overflow-y-auto thin-scrollbar">
                    {changes.map((change) => (
                      <div
                        key={`${change.type}:${change.path}`}
                        className="flex items-start gap-3 px-3 py-2"
                        style={{ borderBottom: "1px solid #111827" }}
                      >
                        <span
                          className="mt-[1px] text-[11px] font-semibold"
                          style={{ color: getStatusColor(change.type) }}
                        >
                          {getStatusLetter(change.type)}
                        </span>
                        <span
                          className="text-[12px] leading-5 break-all"
                          style={{ color: "#c8d6e5" }}
                        >
                          {change.path}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-[12px]" style={{ color: "#6b82a6" }}>
                    Source control is up to date with {githubRepo.branch}.
                  </div>
                )}
              </div>

              <div
                className="rounded-md p-3"
                style={{
                  background: "#0a1020",
                  border: "1px solid #1e2d42",
                }}
              >
                <label
                  className="block text-[11px] uppercase tracking-wider"
                  style={{ color: "#5c7497" }}
                >
                  Commit Message
                </label>
                <textarea
                  value={commitMessage}
                  onChange={(event) => setCommitMessage(event.target.value)}
                  placeholder="Describe this change..."
                  className="mt-2 min-h-[84px] w-full rounded-md px-3 py-2 text-[12px] outline-none resize-none"
                  style={{
                    background: "#060c18",
                    border: "1px solid #1e2d42",
                    color: "#c8d6e5",
                  }}
                />

                <div className="mt-3 flex flex-col gap-2">
                  <button
                    onClick={() => void runScmAction("commit")}
                    disabled={changes.length === 0 || actionState.status === "loading"}
                    className="w-full rounded-md px-3 py-2 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed"
                    style={{
                      background:
                        changes.length === 0 || actionState.status === "loading"
                          ? "#1e2d42"
                          : "#3d5afe",
                      color:
                        changes.length === 0 || actionState.status === "loading"
                          ? "#4a6080"
                          : "#fff",
                    }}
                    type="button"
                  >
                    Commit to {githubRepo.branch}
                  </button>
                  <button
                    onClick={() => void runScmAction("pull-request")}
                    disabled={changes.length === 0 || actionState.status === "loading"}
                    className="w-full rounded-md px-3 py-2 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed"
                    style={{
                      background: "#141925",
                      border: "1px solid #243050",
                      color:
                        changes.length === 0 || actionState.status === "loading"
                          ? "#4a6080"
                          : "#c8d6e5",
                    }}
                    type="button"
                  >
                    Open Pull Request
                  </button>
                </div>
              </div>
            </div>
          )}

        {actionState.status === "loading" && (
          <div
            className="mt-3 rounded-md px-3 py-2 text-[12px]"
            style={{
              background: "rgba(61,90,254,0.08)",
              border: "1px solid rgba(61,90,254,0.18)",
              color: "#7b9ef7",
            }}
          >
            {actionState.message}
          </div>
        )}

        {actionState.status === "error" && (
          <div
            className="mt-3 rounded-md px-3 py-2 text-[12px]"
            style={{
              background: "rgba(231,76,60,0.08)",
              border: "1px solid rgba(231,76,60,0.24)",
              color: "#fca5a5",
            }}
          >
            {actionState.message}
          </div>
        )}

        {successMessage && (
          <div
            className="mt-3 rounded-md px-3 py-2 text-[12px]"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.24)",
              color: "#86efac",
            }}
          >
            {successMessage}
          </div>
        )}
      </div>
    </div>
  )
}

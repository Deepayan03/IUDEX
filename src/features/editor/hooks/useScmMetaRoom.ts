"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"
import type { ActivityLogEntry } from "@/features/editor/activity-log/types"
import { resolveRealtimeWsUrl } from "@/features/editor/collaboration/shared"
import type {
  GitHubRepoRef,
  ScmPublishEvent,
} from "@/features/editor/lib/sourceControl"
import type { FileNode } from "@/features/editor/lib/types"
import { stripLocalFields } from "@/features/editor/lib/utils"
import {
  logRenderProbe,
  useRenderLogger,
} from "@/features/editor/hooks/useRenderLogger"

interface UseScmMetaRoomOptions {
  roomId?: string | null
  onEvent?: (event: ScmPublishEvent) => void
}

interface UseScmMetaRoomReturn {
  githubRepo: GitHubRepoRef | null
  activityEntries: ActivityLogEntry[]
  publishEvent: (event: ScmPublishEvent) => boolean
  importProject: (tree: FileNode[], repo: GitHubRepoRef) => boolean
  setLinkedRepo: (repo: GitHubRepoRef | null) => boolean
}

export function useScmMetaRoom({
  roomId,
  onEvent,
}: UseScmMetaRoomOptions): UseScmMetaRoomReturn {
  const [githubRepo, setGithubRepo] = useState<GitHubRepoRef | null>(null)
  const [activityEntries, setActivityEntries] = useState<ActivityLogEntry[]>([])
  const ymapRef = useRef<Y.Map<unknown> | null>(null)
  const lastEventIdRef = useRef<string | null>(null)
  const mountedAtRef = useRef(0)
  const lastRepoJsonRef = useRef<string | null>(null)
  const lastActivitySignatureRef = useRef("")

  useRenderLogger("use-scm-meta-room", {
    roomId: roomId ?? null,
    githubRepo: githubRepo ? `${githubRepo.owner}/${githubRepo.repo}@${githubRepo.branch}` : null,
    activityCount: activityEntries.length,
    hasEventHandler: !!onEvent,
  })

  const publishEvent = useCallback((event: ScmPublishEvent) => {
    const ymap = ymapRef.current
    if (!ymap) return false

    logRenderProbe("use-scm-meta-room", "publish-event", {
      roomId: roomId ?? null,
      eventId: event.id,
      kind: event.kind,
    })
    ymap.set("latestScmEvent", JSON.stringify(event))
    return true
  }, [roomId])

  const importProject = useCallback((tree: FileNode[], repo: GitHubRepoRef) => {
    const ymap = ymapRef.current
    const ydoc = ymap?.doc
    if (!ymap || !ydoc) return false

    logRenderProbe("use-scm-meta-room", "import-project", {
      roomId: roomId ?? null,
      repo: `${repo.owner}/${repo.repo}@${repo.branch}`,
      nodeCount: tree.length,
    })
    ydoc.transact(() => {
      ymap.set("tree", JSON.stringify(stripLocalFields(tree)))
      ymap.set("githubRepo", JSON.stringify(repo))
    })

    return true
  }, [roomId])

  const setLinkedRepo = useCallback((repo: GitHubRepoRef | null) => {
    const ymap = ymapRef.current
    if (!ymap) return false

    logRenderProbe("use-scm-meta-room", "set-linked-repo", {
      roomId: roomId ?? null,
      repo: repo ? `${repo.owner}/${repo.repo}@${repo.branch}` : null,
    })
    ymap.set("githubRepo", repo ? JSON.stringify(repo) : "")
    return true
  }, [roomId])

  useEffect(() => {
    if (!roomId) {
      ymapRef.current = null
      return
    }

    mountedAtRef.current = Date.now()
    lastEventIdRef.current = null
    lastRepoJsonRef.current = null
    lastActivitySignatureRef.current = ""

    const ydoc = new Y.Doc()
    const provider = new WebsocketProvider(
      resolveRealtimeWsUrl(),
      `${roomId}:__meta__`,
      ydoc,
      {
        connect: true,
        params: {},
        resyncInterval: 30000,
        maxBackoffTime: 10000,
      },
    )

    const ymap = ydoc.getMap("room")
    const activityArray = ydoc.getArray<ActivityLogEntry>("activityLog")
    ymapRef.current = ymap

    const syncRepoState = () => {
      const rawRepo = ymap.get("githubRepo")
      const rawEvent = ymap.get("latestScmEvent")

      const nextRepoJson = typeof rawRepo === "string" && rawRepo ? rawRepo : null

      if (nextRepoJson === lastRepoJsonRef.current) {
        // Repo metadata has not changed.
      } else if (nextRepoJson) {
        try {
          lastRepoJsonRef.current = nextRepoJson
          logRenderProbe("use-scm-meta-room", "repo-update", {
            roomId,
            repo: nextRepoJson,
          })
          setGithubRepo(JSON.parse(nextRepoJson) as GitHubRepoRef)
        } catch {
          lastRepoJsonRef.current = null
          setGithubRepo(null)
        }
      } else {
        lastRepoJsonRef.current = null
        logRenderProbe("use-scm-meta-room", "repo-cleared", { roomId })
        setGithubRepo(null)
      }

      if (
        onEvent &&
        typeof rawEvent === "string" &&
        rawEvent
      ) {
        try {
          const event = JSON.parse(rawEvent) as ScmPublishEvent
          if (
            event.id &&
            event.id !== lastEventIdRef.current &&
            event.timestamp >= mountedAtRef.current
          ) {
            lastEventIdRef.current = event.id
            logRenderProbe("use-scm-meta-room", "event-received", {
              roomId,
              eventId: event.id,
              kind: event.kind,
            })
            onEvent(event)
          }
        } catch {
          // Ignore malformed room SCM events.
        }
      }
    }

    const syncActivityEntries = () => {
      const nextEntries = activityArray
        .toArray()
        .slice()
        .sort((left, right) => right.timestamp - left.timestamp)

      const signature = nextEntries
        .map((entry) => `${entry.id}:${entry.timestamp}:${entry.undone ? "1" : "0"}`)
        .join("|")

      if (signature === lastActivitySignatureRef.current) {
        return
      }

      lastActivitySignatureRef.current = signature
      logRenderProbe("use-scm-meta-room", "activity-update", {
        roomId,
        count: nextEntries.length,
      })
      setActivityEntries(nextEntries)
    }

    const handleMapChange = (event?: Y.YMapEvent<unknown>) => {
      if (
        event &&
        !event.keysChanged.has("githubRepo") &&
        !event.keysChanged.has("latestScmEvent")
      ) {
        return
      }

      syncRepoState()
    }

    const handleProviderSync = () => {
      syncRepoState()
      syncActivityEntries()
    }

    provider.on("sync", handleProviderSync)
    ymap.observe(handleMapChange)
    activityArray.observe(syncActivityEntries)
    syncRepoState()
    syncActivityEntries()

    return () => {
      provider.off("sync", handleProviderSync)
      ymap.unobserve(handleMapChange)
      activityArray.unobserve(syncActivityEntries)
      provider.disconnect()
      provider.destroy()
      ydoc.destroy()
      ymapRef.current = null
    }
  }, [onEvent, roomId])

  return {
    githubRepo: roomId ? githubRepo : null,
    activityEntries: roomId ? activityEntries : [],
    publishEvent,
    importProject,
    setLinkedRepo,
  }
}

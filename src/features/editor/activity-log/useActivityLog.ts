"use client"

import { useEffect, useRef, useCallback, type MutableRefObject } from "react"
import type { Doc as YDoc } from "yjs"
import { useActivityLogStore } from "@/shared/state/activityLog"
import type { ActivityLogEntry, ActivityAction, ActivityDelta, StructuralDelta } from "./types"
import type { FileNode } from "@/features/editor/lib/types"

const ACTIVITY_LOG_ARRAY_NAME = "activityLog"
const ACTIVITY_LOG_PAGE_SIZE = 50

interface UseActivityLogOptions {
  roomId: string | null
  userInfo: { userId: string; username: string } | null
  syncTree?: (updater: (prev: FileNode[]) => FileNode[]) => void
  metaDocRef?: MutableRefObject<YDoc | null>
  roomConnectionStatus?: "disconnected" | "connecting" | "connected"
}

interface UseActivityLogReturn {
  logActivity: (
    action: ActivityAction,
    targetFile: string,
    targetFileName: string,
    lineNumber?: number,
    delta?: ActivityDelta
  ) => void
  undoEntry: (entryId: string) => void
  loadMore: () => void
}

// Helpers for tree manipulation used by undo
function addNodeToTree(
  nodes: FileNode[],
  parentId: string | null,
  node: FileNode
): FileNode[] {
  if (!parentId) return [...nodes, node]
  return nodes.map((n) => {
    if (n.id === parentId && n.children) {
      return { ...n, children: [...n.children, node] }
    }
    if (n.children) {
      return { ...n, children: addNodeToTree(n.children, parentId, node) }
    }
    return n
  })
}

function deleteNodeFromTree(nodes: FileNode[], id: string): FileNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => {
      if (n.children) {
        return { ...n, children: deleteNodeFromTree(n.children, id) }
      }
      return n
    })
}

function buildAccumulatedEditEntry(
  roomId: string,
  userInfo: { userId: string; username: string },
  fileId: string,
  fileName: string,
  startLine: number,
  endLine: number
): ActivityLogEntry {
  return {
    id: crypto.randomUUID(),
    roomId,
    userId: userInfo.userId,
    username: userInfo.username,
    action: "edit",
    targetFile: fileId,
    targetFileName: fileName,
    lineNumber: startLine,
    delta: {
      type: "insert",
      startLineNumber: startLine,
      endLineNumber: endLine,
      text: "",
    },
    timestamp: Date.now(),
  }
}

export function useActivityLog({
  roomId,
  userInfo,
  syncTree,
  metaDocRef,
  roomConnectionStatus,
}: UseActivityLogOptions): UseActivityLogReturn {
  const store = useActivityLogStore
  const pendingRef = useRef<ActivityLogEntry[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editAccumulatorRef = useRef<{
    fileId: string
    fileName: string
    startLine: number
    endLine: number
    timer: ReturnType<typeof setTimeout> | null
  } | null>(null)
  const visibleLimitRef = useRef(ACTIVITY_LOG_PAGE_SIZE)
  const persistenceDisabledRef = useRef(false)
  const queuedRealtimeEntriesRef = useRef<ActivityLogEntry[]>([])

  const disablePersistence = useCallback((message: string) => {
    if (persistenceDisabledRef.current) return
    persistenceDisabledRef.current = true
    console.warn(
      "[activity-log]",
      `${message}. Live updates will continue over collaboration sync, but Supabase activity-log persistence is disabled.`
    )
  }, [])

  const getResponseError = useCallback(async (res: Response) => {
    try {
      const data = await res.json()
      if (typeof data?.error === "string" && data.error.trim()) {
        return data.error
      }
    } catch {
      // Ignore JSON parse failures and fall back to status text.
    }

    return res.statusText || `Request failed (${res.status})`
  }, [])

  const getActivityArray = useCallback(() => {
    return metaDocRef?.current?.getArray<ActivityLogEntry>(ACTIVITY_LOG_ARRAY_NAME) ?? null
  }, [metaDocRef])

  const syncEntriesFromRealtime = useCallback(() => {
    const activityArray = getActivityArray()
    if (!activityArray) return false

    const allEntries = activityArray
      .toArray()
      .sort((a, b) => b.timestamp - a.timestamp)

    store.getState().setEntries(allEntries.slice(0, visibleLimitRef.current))
    store.getState().setHasMore(allEntries.length > visibleLimitRef.current)
    return true
  }, [getActivityArray, store])

  const flushQueuedRealtimeEntries = useCallback(() => {
    const activityArray = getActivityArray()
    if (!activityArray) return false

    const queued = queuedRealtimeEntriesRef.current.splice(0)
    if (queued.length > 0) {
      activityArray.push(queued)
    }

    return true
  }, [getActivityArray])

  const appendEntryToRealtime = useCallback(
    (entry: ActivityLogEntry) => {
      const activityArray = getActivityArray()
      if (!activityArray) {
        queuedRealtimeEntriesRef.current.push(entry)
        store.getState().addEntry(entry)
        return
      }

      activityArray.push([entry])
    },
    [getActivityArray, store]
  )

  const markEntryUndoneInRealtime = useCallback(
    (entryId: string) => {
      const queuedIndex = queuedRealtimeEntriesRef.current.findIndex((entry) => entry.id === entryId)
      if (queuedIndex >= 0) {
        queuedRealtimeEntriesRef.current[queuedIndex] = {
          ...queuedRealtimeEntriesRef.current[queuedIndex],
          undone: true,
        }
        store.getState().markUndone(entryId)
        return true
      }

      const activityArray = getActivityArray()
      if (!activityArray) return false

      const entries = activityArray.toArray()
      const index = entries.findIndex((entry) => entry.id === entryId)
      if (index < 0) return false

      const nextEntry: ActivityLogEntry = {
        ...entries[index],
        undone: true,
      }

      metaDocRef?.current?.transact(() => {
        activityArray.delete(index, 1)
        activityArray.insert(index, [nextEntry])
      })

      return true
    },
    [getActivityArray, metaDocRef, store]
  )

  // ── Flush pending entries to server (best-effort persistence) ───────
  const flushToServer = useCallback(async () => {
    if (persistenceDisabledRef.current) return

    const batch = pendingRef.current.splice(0)
    if (batch.length === 0) return

    try {
      const res = await fetch("/api/activity-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: batch }),
      })
      if (!res.ok) {
        const message = await getResponseError(res)
        if (res.status === 503) {
          disablePersistence(message)
          return
        }
        throw new Error(message)
      }
    } catch (err) {
      console.error("[activity-log] Failed to flush:", err)
      pendingRef.current.unshift(...batch)
    }
  }, [disablePersistence, getResponseError])

  const scheduleFlush = useCallback(() => {
    if (persistenceDisabledRef.current || flushTimerRef.current) return
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null
      void flushToServer()
    }, 2000)
  }, [flushToServer])

  const flushPendingOnExit = useCallback(() => {
    if (persistenceDisabledRef.current) return

    const batch = pendingRef.current.splice(0)
    if (batch.length === 0) return

    const body = JSON.stringify({ entries: batch })

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(
        "/api/activity-log",
        new Blob([body], { type: "application/json" })
      )
      return
    }

    void fetch("/api/activity-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch((err) => {
      console.error("[activity-log] Final flush error:", err)
      pendingRef.current.unshift(...batch)
    })
  }, [])

  const enqueueEntry = useCallback(
    (entry: ActivityLogEntry) => {
      appendEntryToRealtime(entry)
      pendingRef.current.push(entry)
      scheduleFlush()
    },
    [appendEntryToRealtime, scheduleFlush]
  )

  // ── Reset state when switching rooms ────────────────────────────────
  useEffect(() => {
    visibleLimitRef.current = ACTIVITY_LOG_PAGE_SIZE
    queuedRealtimeEntriesRef.current = []
    persistenceDisabledRef.current = false

    if (!roomId) {
      store.getState().clear()
      return
    }

    store.getState().clear()
    store.getState().setLoading(true)
  }, [roomId, store])

  // ── Hydrate + observe the shared Y.Array for live updates ───────────
  useEffect(() => {
    if (!roomId) return

    const activityArray = getActivityArray()
    if (!activityArray) {
      if (roomConnectionStatus === "disconnected") {
        store.getState().setLoading(false)
        store.getState().setHasMore(false)
      }
      return
    }

    flushQueuedRealtimeEntries()

    const syncFromArray = () => {
      syncEntriesFromRealtime()
      store.getState().setLoading(false)
    }

    syncFromArray()
    activityArray.observe(syncFromArray)

    return () => {
      activityArray.unobserve(syncFromArray)
    }
  }, [
    roomId,
    roomConnectionStatus,
    store,
    getActivityArray,
    flushQueuedRealtimeEntries,
    syncEntriesFromRealtime,
  ])

  // ── Cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return

    const handlePageHide = () => {
      flushPendingOnExit()
    }

    window.addEventListener("pagehide", handlePageHide)

    return () => {
      window.removeEventListener("pagehide", handlePageHide)
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
      if (editAccumulatorRef.current?.timer) clearTimeout(editAccumulatorRef.current.timer)
      flushPendingOnExit()
    }
  }, [flushPendingOnExit])

  // ── Log an activity ─────────────────────────────────────────────────
  const logActivity = useCallback(
    (
      action: ActivityAction,
      targetFile: string,
      targetFileName: string,
      lineNumber?: number,
      delta?: ActivityDelta
    ) => {
      if (!roomId || !userInfo) return

      // Debounce edit actions: accumulate consecutive edits to the same file
      if (action === "edit") {
        const acc = editAccumulatorRef.current
        if (acc && acc.fileId === targetFile && lineNumber !== undefined) {
          acc.startLine = Math.min(acc.startLine, lineNumber)
          acc.endLine = Math.max(acc.endLine, lineNumber)
          if (acc.timer) clearTimeout(acc.timer)
          acc.timer = setTimeout(() => {
            enqueueEntry(
              buildAccumulatedEditEntry(
                roomId,
                userInfo,
                acc.fileId,
                acc.fileName,
                acc.startLine,
                acc.endLine
              )
            )
            editAccumulatorRef.current = null
          }, 2000)
          return
        }

        if (acc) {
          if (acc.timer) clearTimeout(acc.timer)
          enqueueEntry(
            buildAccumulatedEditEntry(
              roomId,
              userInfo,
              acc.fileId,
              acc.fileName,
              acc.startLine,
              acc.endLine
            )
          )
        }

        editAccumulatorRef.current = {
          fileId: targetFile,
          fileName: targetFileName,
          startLine: lineNumber ?? 1,
          endLine: lineNumber ?? 1,
          timer: setTimeout(() => {
            const cur = editAccumulatorRef.current
            if (!cur) return
            enqueueEntry(
              buildAccumulatedEditEntry(
                roomId,
                userInfo,
                cur.fileId,
                cur.fileName,
                cur.startLine,
                cur.endLine
              )
            )
            editAccumulatorRef.current = null
          }, 2000),
        }
        return
      }

      enqueueEntry({
        id: crypto.randomUUID(),
        roomId,
        userId: userInfo.userId,
        username: userInfo.username,
        action,
        targetFile,
        targetFileName,
        lineNumber,
        delta,
        timestamp: Date.now(),
      })
    },
    [roomId, userInfo, enqueueEntry]
  )

  // ── Load more from the shared Y.Array ───────────────────────────────
  const loadMore = useCallback(() => {
    if (!roomId) return

    const activityArray = getActivityArray()
    if (!activityArray) return

    store.getState().setLoading(true)
    visibleLimitRef.current += ACTIVITY_LOG_PAGE_SIZE
    syncEntriesFromRealtime()
    store.getState().setLoading(false)
  }, [roomId, store, getActivityArray, syncEntriesFromRealtime])

  // ── Undo a structural entry ────────────────────────────────────────
  const undoEntry = useCallback(
    async (entryId: string) => {
      const entry = store.getState().entries.find((e) => e.id === entryId)
      if (!entry || entry.undone || !entry.delta || !syncTree) return

      const delta = entry.delta as StructuralDelta

      if (
        (entry.action === "create-file" || entry.action === "create-folder") &&
        delta.type === "create"
      ) {
        syncTree((t) => deleteNodeFromTree(t, delta.filePath))
      } else if (
        (entry.action === "delete-file" || entry.action === "delete-folder") &&
        delta.type === "delete"
      ) {
        const node: FileNode = {
          id: delta.filePath,
          name: delta.filePath.split("/").pop() ?? delta.filePath,
          type: delta.fileType,
          ...(delta.fileType === "file"
            ? { content: delta.fileContent ?? "", language: delta.language }
            : { children: [], isOpen: true }),
        }
        syncTree((t) => addNodeToTree(t, delta.parentId, node))
      } else {
        return
      }

      if (!markEntryUndoneInRealtime(entryId)) {
        store.getState().markUndone(entryId)
      }

      if (persistenceDisabledRef.current) return

      try {
        const res = await fetch("/api/activity-log/undo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId }),
        })
        if (!res.ok) {
          const message = await getResponseError(res)
          if (res.status === 503) {
            disablePersistence(message)
            return
          }
          throw new Error(message)
        }
      } catch (err) {
        console.error("[activity-log] Undo persist error:", err)
      }
    },
    [syncTree, store, markEntryUndoneInRealtime, disablePersistence, getResponseError]
  )

  return { logActivity, undoEntry, loadMore }
}

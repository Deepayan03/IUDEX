"use client"

import { useEffect, useRef, useCallback } from "react"
import { useActivityLogStore } from "@/shared/state/activityLog"
import type { ActivityLogEntry, ActivityAction, ActivityDelta, StructuralDelta } from "./types"
import type { FileNode } from "@/features/editor/lib/types"

interface UseActivityLogOptions {
  roomId: string | null
  userInfo: { userId: string; username: string } | null
  syncTree?: (updater: (prev: FileNode[]) => FileNode[]) => void
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

export function useActivityLog({
  roomId,
  userInfo,
  syncTree,
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
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const latestTimestampRef = useRef<number>(0)

  // ── Flush pending entries to server ─────────────────────────────────
  const flushToServer = useCallback(async () => {
    const batch = pendingRef.current.splice(0)
    if (batch.length === 0) return
    try {
      await fetch("/api/activity-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: batch }),
      })
    } catch (err) {
      console.error("[activity-log] Failed to flush:", err)
      // Put them back for retry
      pendingRef.current.unshift(...batch)
    }
  }, [])

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null
      flushToServer()
    }, 2000)
  }, [flushToServer])

  const flushPendingOnExit = useCallback(() => {
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

  // ── Fetch initial entries ───────────────────────────────────────────
  useEffect(() => {
    if (!roomId) {
      store.getState().clear()
      return
    }

    let cancelled = false
    store.getState().setLoading(true)

    fetch(`/api/activity-log?roomId=${encodeURIComponent(roomId)}&limit=50`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const entries: ActivityLogEntry[] = data.entries ?? []
        store.getState().setEntries(entries)
        store.getState().setHasMore(entries.length >= 50)
        if (entries.length > 0) {
          latestTimestampRef.current = entries[0].timestamp
        }
      })
      .catch((err) => console.error("[activity-log] Fetch error:", err))
      .finally(() => {
        if (!cancelled) store.getState().setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [roomId, store])

  // ── Poll for new entries ────────────────────────────────────────────
  // Track IDs of entries we created locally so the poll skips them
  const localIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!roomId) return

    pollTimerRef.current = setInterval(async () => {
      try {
        const after = latestTimestampRef.current
        const res = await fetch(
          `/api/activity-log?roomId=${encodeURIComponent(roomId)}&limit=20&after=${after}`
        )
        const data = await res.json()
        const entries: ActivityLogEntry[] = data.entries ?? []
        // Filter out entries we created locally to avoid feedback loop
        const remote = entries.filter((e) => !localIdsRef.current.has(e.id))
        if (entries.length > 0) {
          // Always advance the timestamp cursor to avoid re-fetching the same window
          latestTimestampRef.current = Math.max(
            latestTimestampRef.current,
            ...entries.map((e) => e.timestamp)
          )
        }
        if (remote.length > 0) {
          store.getState().addEntries(remote)
        }
      } catch {
        // Silently ignore poll failures
      }
    }, 10000)

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [roomId, store])

  // ── Cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
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

      // Helper: queue a local entry for flush and track its ID
      const queueEntry = (entry: ActivityLogEntry) => {
        localIdsRef.current.add(entry.id)
        store.getState().addEntry(entry)
        pendingRef.current.push(entry)
        latestTimestampRef.current = Math.max(latestTimestampRef.current, entry.timestamp)
      }

      // Debounce edit actions: accumulate consecutive edits to the same file
      if (action === "edit") {
        const acc = editAccumulatorRef.current
        if (acc && acc.fileId === targetFile && lineNumber !== undefined) {
          // Extend the accumulated range
          acc.startLine = Math.min(acc.startLine, lineNumber)
          acc.endLine = Math.max(acc.endLine, lineNumber)
          // Reset the timer
          if (acc.timer) clearTimeout(acc.timer)
          acc.timer = setTimeout(() => {
            // Flush the accumulated edit
            const entry: ActivityLogEntry = {
              id: crypto.randomUUID(),
              roomId: roomId!,
              userId: userInfo!.userId,
              username: userInfo!.username,
              action: "edit",
              targetFile: acc.fileId,
              targetFileName: acc.fileName,
              lineNumber: acc.startLine,
              delta: {
                type: "insert",
                startLineNumber: acc.startLine,
                endLineNumber: acc.endLine,
                text: "",
              },
              timestamp: Date.now(),
            }
            queueEntry(entry)
            scheduleFlush()
            editAccumulatorRef.current = null
          }, 2000)
          return
        }

        // Flush previous accumulator if it was for a different file
        if (acc) {
          if (acc.timer) clearTimeout(acc.timer)
          const entry: ActivityLogEntry = {
            id: crypto.randomUUID(),
            roomId: roomId!,
            userId: userInfo!.userId,
            username: userInfo!.username,
            action: "edit",
            targetFile: acc.fileId,
            targetFileName: acc.fileName,
            lineNumber: acc.startLine,
            delta: {
              type: "insert",
              startLineNumber: acc.startLine,
              endLineNumber: acc.endLine,
              text: "",
            },
            timestamp: Date.now(),
          }
          queueEntry(entry)
        }

        // Start new accumulator
        editAccumulatorRef.current = {
          fileId: targetFile,
          fileName: targetFileName,
          startLine: lineNumber ?? 1,
          endLine: lineNumber ?? 1,
          timer: setTimeout(() => {
            const cur = editAccumulatorRef.current
            if (!cur) return
            const entry: ActivityLogEntry = {
              id: crypto.randomUUID(),
              roomId: roomId!,
              userId: userInfo!.userId,
              username: userInfo!.username,
              action: "edit",
              targetFile: cur.fileId,
              targetFileName: cur.fileName,
              lineNumber: cur.startLine,
              delta: {
                type: "insert",
                startLineNumber: cur.startLine,
                endLineNumber: cur.endLine,
                text: "",
              },
              timestamp: Date.now(),
            }
            queueEntry(entry)
            scheduleFlush()
            editAccumulatorRef.current = null
          }, 2000),
        }
        return
      }

      // Non-edit actions: log immediately
      const entry: ActivityLogEntry = {
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
      }

      queueEntry(entry)
      scheduleFlush()
    },
    [roomId, userInfo, store, scheduleFlush]
  )

  // ── Load more (pagination) ─────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!roomId) return
    const entries = store.getState().entries
    if (entries.length === 0) return

    const oldest = entries[entries.length - 1]
    store.getState().setLoading(true)

    try {
      const res = await fetch(
        `/api/activity-log?roomId=${encodeURIComponent(roomId)}&limit=50&before=${oldest.timestamp}`
      )
      const data = await res.json()
      const older: ActivityLogEntry[] = data.entries ?? []
      store.getState().appendOlderEntries(older)
      store.getState().setHasMore(older.length >= 50)
    } catch (err) {
      console.error("[activity-log] Load more error:", err)
    } finally {
      store.getState().setLoading(false)
    }
  }, [roomId, store])

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
        // Undo creation = delete the file/folder
        syncTree((t) => deleteNodeFromTree(t, delta.filePath))
      } else if (
        (entry.action === "delete-file" || entry.action === "delete-folder") &&
        delta.type === "delete"
      ) {
        // Undo deletion = recreate with saved content
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

      // Mark as undone locally and on server
      store.getState().markUndone(entryId)
      try {
        await fetch("/api/activity-log/undo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId }),
        })
      } catch (err) {
        console.error("[activity-log] Undo persist error:", err)
      }
    },
    [syncTree, store]
  )

  return { logActivity, undoEntry, loadMore }
}

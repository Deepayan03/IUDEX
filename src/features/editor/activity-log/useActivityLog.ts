"use client"

import { useEffect, useRef, useCallback, type MutableRefObject } from "react"
import type { Doc as YDoc } from "yjs"
import { useActivityLogStore } from "@/shared/state/activityLog"
import type { ActivityLogEntry, ActivityAction, ActivityDelta, StructuralDelta } from "./types"
import type { FileNode } from "@/features/editor/lib/types"

const ACTIVITY_LOG_ARRAY_NAME = "activityLog"
const ACTIVITY_LOG_PAGE_SIZE = 50
const ACTIVITY_LOG_MAX_ENTRIES = 300
const EDIT_ACTIVITY_DEBOUNCE_MS = 2000

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

function trimToRecentEntries(entries: ActivityLogEntry[]): ActivityLogEntry[] {
  return entries.slice(-ACTIVITY_LOG_MAX_ENTRIES)
}

export function useActivityLog({
  roomId,
  userInfo,
  syncTree,
  metaDocRef,
  roomConnectionStatus,
}: UseActivityLogOptions): UseActivityLogReturn {
  const store = useActivityLogStore
  const editAccumulatorRef = useRef<{
    fileId: string
    fileName: string
    startLine: number
    endLine: number
    timer: ReturnType<typeof setTimeout> | null
  } | null>(null)
  const visibleLimitRef = useRef(ACTIVITY_LOG_PAGE_SIZE)
  const queuedRealtimeEntriesRef = useRef<ActivityLogEntry[]>([])

  const getActivityArray = useCallback(() => {
    return metaDocRef?.current?.getArray<ActivityLogEntry>(ACTIVITY_LOG_ARRAY_NAME) ?? null
  }, [metaDocRef])

  const syncEntriesIntoStore = useCallback(
    (entries: ActivityLogEntry[]) => {
      const allEntries = trimToRecentEntries(entries)
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)

      store.getState().setEntries(allEntries.slice(0, visibleLimitRef.current))
      store.getState().setHasMore(allEntries.length > visibleLimitRef.current)
      store.getState().setLoading(false)
    },
    [store]
  )

  const syncEntriesFromRealtime = useCallback(() => {
    const activityArray = getActivityArray()
    if (!activityArray) return false

    syncEntriesIntoStore(activityArray.toArray())
    return true
  }, [getActivityArray, syncEntriesIntoStore])

  const pushEntriesToRealtime = useCallback(
    (entries: ActivityLogEntry[]) => {
      if (entries.length === 0) return

      const activityArray = getActivityArray()
      if (!activityArray) {
        queuedRealtimeEntriesRef.current = trimToRecentEntries([
          ...queuedRealtimeEntriesRef.current,
          ...entries,
        ])
        syncEntriesIntoStore(queuedRealtimeEntriesRef.current)
        return
      }

      const ydoc = metaDocRef?.current
      const applyEntries = () => {
        activityArray.push(entries)
        const overflow = activityArray.length - ACTIVITY_LOG_MAX_ENTRIES
        if (overflow > 0) {
          activityArray.delete(0, overflow)
        }
      }

      if (ydoc) {
        ydoc.transact(applyEntries)
      } else {
        applyEntries()
      }
    },
    [getActivityArray, metaDocRef, syncEntriesIntoStore]
  )

  const flushQueuedRealtimeEntries = useCallback(() => {
    const activityArray = getActivityArray()
    if (!activityArray) return false

    const queued = queuedRealtimeEntriesRef.current.splice(0)
    if (queued.length > 0) {
      pushEntriesToRealtime(queued)
    }

    return true
  }, [getActivityArray, pushEntriesToRealtime])

  const appendEntryToRealtime = useCallback(
    (entry: ActivityLogEntry) => {
      pushEntriesToRealtime([entry])
    },
    [pushEntriesToRealtime]
  )

  const markEntryUndoneInRealtime = useCallback(
    (entryId: string) => {
      const queuedIndex = queuedRealtimeEntriesRef.current.findIndex((entry) => entry.id === entryId)
      if (queuedIndex >= 0) {
        queuedRealtimeEntriesRef.current[queuedIndex] = {
          ...queuedRealtimeEntriesRef.current[queuedIndex],
          undone: true,
        }
        syncEntriesIntoStore(queuedRealtimeEntriesRef.current)
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
    [getActivityArray, metaDocRef, syncEntriesIntoStore]
  )

  const enqueueEntry = useCallback(
    (entry: ActivityLogEntry) => {
      appendEntryToRealtime(entry)
    },
    [appendEntryToRealtime]
  )

  useEffect(() => {
    visibleLimitRef.current = ACTIVITY_LOG_PAGE_SIZE
    queuedRealtimeEntriesRef.current = []

    if (!roomId) {
      store.getState().clear()
      return
    }

    store.getState().clear()
    store.getState().setLoading(true)
  }, [roomId, store])

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
    }

    syncFromArray()
    activityArray.observe(syncFromArray)

    return () => {
      activityArray.unobserve(syncFromArray)
    }
  }, [
    roomId,
    roomConnectionStatus,
    getActivityArray,
    flushQueuedRealtimeEntries,
    syncEntriesFromRealtime,
    store,
  ])

  useEffect(() => {
    return () => {
      if (editAccumulatorRef.current?.timer) clearTimeout(editAccumulatorRef.current.timer)
    }
  }, [])

  const logActivity = useCallback(
    (
      action: ActivityAction,
      targetFile: string,
      targetFileName: string,
      lineNumber?: number,
      delta?: ActivityDelta
    ) => {
      if (!roomId || !userInfo) return

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
          }, EDIT_ACTIVITY_DEBOUNCE_MS)
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
          }, EDIT_ACTIVITY_DEBOUNCE_MS),
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

  const loadMore = useCallback(() => {
    if (!roomId) return

    const activityArray = getActivityArray()
    if (!activityArray) return

    store.getState().setLoading(true)
    visibleLimitRef.current += ACTIVITY_LOG_PAGE_SIZE
    syncEntriesFromRealtime()
    store.getState().setLoading(false)
  }, [roomId, store, getActivityArray, syncEntriesFromRealtime])

  const undoEntry = useCallback(
    (entryId: string) => {
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
    },
    [syncTree, store, markEntryUndoneInRealtime]
  )

  return { logActivity, undoEntry, loadMore }
}

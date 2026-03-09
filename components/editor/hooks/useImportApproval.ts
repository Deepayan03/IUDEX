"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { FileNode } from "../types"
import type { ImportRequestData } from "../ImportApprovalModal"
import type { WebsocketProvider } from "y-websocket"
import { useEditorTabsStore } from "@/store/editorTabs"

interface UseImportApprovalOptions {
  providerRef: React.MutableRefObject<WebsocketProvider | null>
  crdtEnabled: boolean
  isCreator: boolean
  userInfo: { userId: string; username: string } | null
  importProject: (
    tree: FileNode[],
    meta: { owner: string; repo: string; branch: string }
  ) => void
  connectionStatus: "disconnected" | "connecting" | "connected"
}

interface UseImportApprovalReturn {
  approvalModalData: ImportRequestData | null
  importToast: string | null
  clearImportToast: () => void
  handleGitHubImport: (
    tree: FileNode[],
    meta: { owner: string; repo: string; branch: string }
  ) => void
  handleApproveImport: () => void
  handleRejectImport: () => void
}

export function useImportApproval({
  providerRef,
  crdtEnabled,
  isCreator,
  userInfo,
  importProject,
  connectionStatus,
}: UseImportApprovalOptions): UseImportApprovalReturn {
  const [approvalModalData, setApprovalModalData] =
    useState<ImportRequestData | null>(null)
  const [importToast, setImportToast] = useState<string | null>(null)

  const pendingRequestRef = useRef<{
    id: string
    tree: FileNode[]
    meta: { owner: string; repo: string; branch: string }
  } | null>(null)
  const handledRequestIds = useRef<Set<string>>(new Set())
  const handledResponseIds = useRef<Set<string>>(new Set())

  const clearImportToast = useCallback(() => setImportToast(null), [])

  // ── GitHub import handler ─────────────────────────────────────────────
  const handleGitHubImport = useCallback(
    (
      importedTree: FileNode[],
      meta: { owner: string; repo: string; branch: string }
    ) => {
      if (!crdtEnabled || isCreator) {
        // Creator (or non-CRDT mode) can import directly
        importProject(importedTree, meta)
        useEditorTabsStore.getState().closeAllTabs()
        useEditorTabsStore.getState().setLoadingFileId(null)
      } else {
        // Non-creator: send request via awareness
        const provider = providerRef.current
        if (!provider || !userInfo) return

        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        pendingRequestRef.current = {
          id: requestId,
          tree: importedTree,
          meta,
        }

        provider.awareness.setLocalStateField("importRequest", {
          id: requestId,
          fromUserId: userInfo.userId,
          fromUsername: userInfo.username,
          repoOwner: meta.owner,
          repoName: meta.repo,
          repoBranch: meta.branch,
        })

        setImportToast("Import request sent. Waiting for room owner...")
      }
    },
    [crdtEnabled, isCreator, importProject, providerRef, userInfo]
  )

  // ── Import approval (creator only) ────────────────────────────────────
  const handleApproveImport = useCallback(() => {
    const provider = providerRef.current
    if (!provider || !approvalModalData) return

    provider.awareness.setLocalStateField("importResponse", {
      id: approvalModalData.id,
      approved: true,
    })

    setApprovalModalData(null)

    setTimeout(() => {
      provider.awareness.setLocalStateField("importResponse", null)
    }, 5000)
  }, [providerRef, approvalModalData])

  // ── Import rejection (creator only) ───────────────────────────────────
  const handleRejectImport = useCallback(() => {
    const provider = providerRef.current
    if (!provider || !approvalModalData) return

    provider.awareness.setLocalStateField("importResponse", {
      id: approvalModalData.id,
      approved: false,
    })

    setApprovalModalData(null)

    setTimeout(() => {
      provider.awareness.setLocalStateField("importResponse", null)
    }, 5000)
  }, [providerRef, approvalModalData])

  // ── Awareness listener for import request/response signaling ──────────
  useEffect(() => {
    const provider = providerRef.current
    if (!provider || !crdtEnabled || !userInfo) return

    const handler = () => {
      const states = provider.awareness.getStates()

      states.forEach((state, clientId) => {
        if (clientId === provider.doc.clientID) return

        // If I am the creator, watch for incoming import requests
        if (isCreator && state.importRequest) {
          const req = state.importRequest as {
            id: string
            fromUserId: string
            fromUsername: string
            repoOwner: string
            repoName: string
            repoBranch: string
          }
          if (!handledRequestIds.current.has(req.id)) {
            handledRequestIds.current.add(req.id)
            setApprovalModalData({
              id: req.id,
              fromUserId: req.fromUserId,
              fromUsername: req.fromUsername,
              repoOwner: req.repoOwner,
              repoName: req.repoName,
              repoBranch: req.repoBranch,
            })
          }
        }

        // If I am a requester, watch for import responses from the creator
        if (
          !isCreator &&
          state.importResponse &&
          pendingRequestRef.current
        ) {
          const resp = state.importResponse as {
            id: string
            approved: boolean
          }
          if (
            resp.id === pendingRequestRef.current.id &&
            !handledResponseIds.current.has(resp.id)
          ) {
            handledResponseIds.current.add(resp.id)
            if (resp.approved) {
              const { tree: reqTree, meta: reqMeta } =
                pendingRequestRef.current
              importProject(reqTree, reqMeta)
              useEditorTabsStore.getState().closeAllTabs()
              useEditorTabsStore.getState().setLoadingFileId(null)
              setImportToast("Import approved! Project updated.")
            } else {
              setImportToast(
                "Import request was rejected by the room owner."
              )
            }
            pendingRequestRef.current = null
            provider.awareness.setLocalStateField("importRequest", null)
          }
        }
      })
    }

    provider.awareness.on("change", handler)
    return () => {
      provider.awareness.off("change", handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus, crdtEnabled, isCreator, userInfo, importProject])

  return {
    approvalModalData,
    importToast,
    clearImportToast,
    handleGitHubImport,
    handleApproveImport,
    handleRejectImport,
  }
}

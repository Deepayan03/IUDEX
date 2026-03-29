"use client"

import type { GitHubConnectionStatus } from "@/features/editor/lib/sourceControl"

const POPUP_FEATURES =
  "popup=yes,width=640,height=760,resizable=yes,scrollbars=yes"

let githubConnectionStatusCache: GitHubConnectionStatus | null = null
let githubConnectionStatusPromise: Promise<GitHubConnectionStatus> | null = null

interface GitHubAuthMessage {
  type: "iudex:github-auth"
  success: boolean
  error?: string
}

export function getCachedGitHubConnectionStatus():
  GitHubConnectionStatus | null {
  return githubConnectionStatusCache
}

export function clearGitHubConnectionStatusCache(): void {
  githubConnectionStatusCache = null
  githubConnectionStatusPromise = null
}

export async function getGitHubConnectionStatus(options?: {
  force?: boolean
}): Promise<GitHubConnectionStatus> {
  const force = options?.force ?? false

  if (!force && githubConnectionStatusCache) {
    return githubConnectionStatusCache
  }

  if (!force && githubConnectionStatusPromise) {
    return githubConnectionStatusPromise
  }

  githubConnectionStatusPromise = (async () => {
    const response = await fetch("/api/github/auth/status", {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to check GitHub connection (${response.status})`)
    }

    const status = (await response.json()) as GitHubConnectionStatus
    githubConnectionStatusCache = status
    return status
  })()

  try {
    return await githubConnectionStatusPromise
  } finally {
    githubConnectionStatusPromise = null
  }
}

export function connectGitHubWithPopup(): Promise<void> {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      "/api/github/auth/start",
      "iudex-github-connect",
      POPUP_FEATURES,
    )

    if (!popup) {
      reject(new Error("The GitHub popup was blocked by the browser."))
      return
    }

    const cleanup = () => {
      window.removeEventListener("message", handleMessage)
      window.clearInterval(closePoll)
    }

    const handleMessage = (event: MessageEvent<GitHubAuthMessage>) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== "iudex:github-auth") return

      cleanup()

      if (event.data.success) {
        resolve()
        return
      }

      reject(new Error(event.data.error || "GitHub connection failed."))
    }

    const closePoll = window.setInterval(() => {
      if (!popup.closed) return
      cleanup()
      reject(new Error("The GitHub connection window was closed."))
    }, 300)

    window.addEventListener("message", handleMessage)
  })
}

export async function disconnectGitHub(): Promise<void> {
  const response = await fetch("/api/github/auth/disconnect", {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error(`Failed to disconnect GitHub (${response.status})`)
  }
}

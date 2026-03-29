"use client"

import { useCallback, useState } from "react"
import Toast from "@/features/editor/components/titlebar/Toast"
import { useScmMetaRoom } from "@/features/editor/hooks/useScmMetaRoom"
import { useRenderLogger } from "@/features/editor/hooks/useRenderLogger"
import type { ScmPublishEvent } from "@/features/editor/lib/sourceControl"

interface ScmRoomNotificationsProps {
  roomId?: string
  userInfo?: { userId: string; username: string } | null
}

function buildToastMessage(event: ScmPublishEvent): string {
  if (event.kind === "pull-request") {
    return `${event.username} opened a pull request from ${event.branch}`
  }

  return `${event.username} pushed ${event.fileCount} ${event.fileCount === 1 ? "file" : "files"} to ${event.branch}`
}

export default function ScmRoomNotifications({
  roomId,
  userInfo,
}: ScmRoomNotificationsProps) {
  const [toast, setToast] = useState<string | null>(null)

  useRenderLogger("scm-room-notifications", {
    roomId: roomId ?? null,
    hasUser: !!userInfo,
    toastVisible: !!toast,
  })

  const handleEvent = useCallback(
    (event: ScmPublishEvent) => {
      if (!userInfo || event.userId === userInfo.userId) return
      setToast(buildToastMessage(event))
    },
    [userInfo],
  )

  useScmMetaRoom({
    roomId,
    onEvent: handleEvent,
  })

  if (!toast) return null

  return <Toast message={toast} onDone={() => setToast(null)} />
}

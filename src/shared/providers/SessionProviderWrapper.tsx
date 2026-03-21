"use client"

import { SessionProvider } from "next-auth/react"

export default function SessionProviderWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider
      basePath="/api/auth"
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  )
}

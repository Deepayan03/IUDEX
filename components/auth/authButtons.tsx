"use client"

import { signIn, signOut, useSession } from "next-auth/react"

export default function AuthButtons() {
  const { data: session, status } = useSession()

  if (status === "loading") return null

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm">
          {session.user?.name}
        </span>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-600 rounded-md text-white"
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="px-4 py-2 bg-blue-600 rounded-md text-white"
    >
      Login with Google
    </button>
  )
}
"use client"

import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function AuthButtons() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") return null

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm">
          {`Hello ${session.user?.name} !`}
        </span>
         <button
          onClick={() => router.push("/rooms")}
          className="px-4 py-2 bg-blue-600 rounded-md text-white"
        >
          Go to My Rooms
        </button>
        
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
      onClick={() => router.push("/auth/signin?callbackUrl=/rooms")}
      className="px-4 py-2 bg-blue-600 rounded-md text-white"
    >
      Sign in
    </button>
  )
}

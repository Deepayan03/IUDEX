import { NextResponse } from "next/server"
import { clearGitHubAccessToken } from "@/shared/auth/github"

export async function DELETE() {
  await clearGitHubAccessToken()
  return NextResponse.json({ ok: true })
}

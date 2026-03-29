import { NextRequest, NextResponse } from "next/server"
import {
  clearGitHubAccessToken,
  getGitHubAuthContext,
  getGitHubOAuthConfig,
  getGitHubViewer,
} from "@/shared/auth/github"

export async function GET(request: NextRequest) {
  const context = await getGitHubAuthContext(request)
  let viewer = null as Awaited<ReturnType<typeof getGitHubViewer>> | null

  if (context) {
    try {
      viewer = await getGitHubViewer(context.token)
    } catch {
      if (context.source === "connection") {
        await clearGitHubAccessToken()
      }
    }
  }

  return NextResponse.json({
    configured: !!getGitHubOAuthConfig(),
    connected: !!context,
    source: context?.source ?? null,
    viewer: viewer
      ? {
          login: viewer.login,
          avatar_url: viewer.avatar_url,
          html_url: viewer.html_url,
          name: viewer.name,
        }
      : null,
  })
}

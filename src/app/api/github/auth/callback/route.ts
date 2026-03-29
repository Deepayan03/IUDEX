import { NextRequest, NextResponse } from "next/server"
import {
  clearGitHubOAuthState,
  exchangeGitHubCodeForToken,
  getGitHubOAuthState,
  getGitHubViewer,
  setGitHubAccessToken,
} from "@/shared/auth/github"

function popupResultHtml(payload: {
  success: boolean
  error?: string
  viewer?: { login: string; avatar_url: string; html_url: string; name: string | null }
}) {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="font-family: ui-sans-serif, system-ui; background:#060c18; color:#c8d6e5; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0;">
    <div style="text-align:center; max-width:320px; line-height:1.5;">
      <h1 style="font-size:18px; margin:0 0 12px;">${payload.success ? "GitHub connected" : "GitHub connection failed"}</h1>
      <p style="margin:0; color:#8899b0;">${payload.success ? "You can close this window." : payload.error ?? "Something went wrong."}</p>
    </div>
    <script>
      const payload = ${JSON.stringify(payload)};
      if (window.opener) {
        window.opener.postMessage({ type: "iudex:github-auth", ...payload }, window.location.origin);
      }
      window.close();
    </script>
  </body>
</html>`
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const oauthState = await getGitHubOAuthState()

  if (!code || !state || !oauthState || state !== oauthState) {
    await clearGitHubOAuthState()
    return new NextResponse(
      popupResultHtml({
        success: false,
        error: "GitHub OAuth state did not match. Please try again.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    )
  }

  try {
    const redirectUri = new URL("/api/github/auth/callback", request.nextUrl.origin)
    const token = await exchangeGitHubCodeForToken(code, redirectUri.toString())
    const viewer = await getGitHubViewer(token)
    await setGitHubAccessToken(token)
    await clearGitHubOAuthState()

    return new NextResponse(
      popupResultHtml({
        success: true,
        viewer,
      }),
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    )
  } catch (error) {
    await clearGitHubOAuthState()
    return new NextResponse(
      popupResultHtml({
        success: false,
        error: error instanceof Error ? error.message : "Unable to connect GitHub.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import {
  getGitHubOAuthConfig,
  setGitHubOAuthState,
} from "@/shared/auth/github"

function popupErrorResponse(message: string, status = 500) {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
  <body style="font-family: ui-sans-serif, system-ui; background:#060c18; color:#c8d6e5; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0;">
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: "iudex:github-auth", success: false, error: ${JSON.stringify(message)} }, window.location.origin);
      }
      window.close();
    </script>
    <p>${message}</p>
  </body>
</html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  )
}

export async function GET(request: NextRequest) {
  const config = getGitHubOAuthConfig()

  if (!config) {
    return popupErrorResponse("GitHub OAuth is not configured.", 503)
  }

  const state = crypto.randomUUID()
  await setGitHubOAuthState(state)

  const redirectUri = new URL("/api/github/auth/callback", request.nextUrl.origin)
  const githubUrl = new URL("https://github.com/login/oauth/authorize")
  githubUrl.searchParams.set("client_id", config.clientId)
  githubUrl.searchParams.set("redirect_uri", redirectUri.toString())
  githubUrl.searchParams.set("scope", "repo read:user")
  githubUrl.searchParams.set("state", state)
  githubUrl.searchParams.set("allow_signup", "true")

  return NextResponse.redirect(githubUrl)
}

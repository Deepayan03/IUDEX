import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { getToken } from "next-auth/jwt"

export const GITHUB_ACCESS_TOKEN_COOKIE = "iudex_github_access_token"
export const GITHUB_OAUTH_STATE_COOKIE = "iudex_github_oauth_state"

const GITHUB_API_BASE_URL = "https://api.github.com"
const GITHUB_ACCEPT_HEADER = "application/vnd.github+json"
const GITHUB_API_VERSION = "2022-11-28"

export interface GitHubOAuthConfig {
  clientId: string
  clientSecret: string
}

export interface GitHubViewer {
  login: string
  avatar_url: string
  html_url: string
  name: string | null
}

export type GitHubAuthSource = "session" | "connection"

export interface GitHubAuthContext {
  token: string
  source: GitHubAuthSource
}

function getAuthSecret(): string | null {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? null
}

export function getGitHubOAuthConfig(): GitHubOAuthConfig | null {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return null
  }

  return { clientId, clientSecret }
}

export async function getGitHubAccessToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(GITHUB_ACCESS_TOKEN_COOKIE)?.value ?? null
}

export async function getGitHubAuthContext(
  request?: NextRequest,
): Promise<GitHubAuthContext | null> {
  const authSecret = getAuthSecret()

  if (request && authSecret) {
    const sessionToken = await getToken({
      req: request,
      secret: authSecret,
    })

    if (
      typeof sessionToken?.githubAccessToken === "string" &&
      sessionToken.githubAccessToken
    ) {
      return {
        token: sessionToken.githubAccessToken,
        source: "session",
      }
    }
  }

  const token = await getGitHubAccessToken()
  if (!token) return null

  return {
    token,
    source: "connection",
  }
}

export async function setGitHubAccessToken(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(GITHUB_ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearGitHubAccessToken(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(GITHUB_ACCESS_TOKEN_COOKIE)
}

export async function setGitHubOAuthState(state: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(GITHUB_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  })
}

export async function getGitHubOAuthState(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(GITHUB_OAUTH_STATE_COOKIE)?.value ?? null
}

export async function clearGitHubOAuthState(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(GITHUB_OAUTH_STATE_COOKIE)
}

function buildGitHubHeaders(token: string, init?: HeadersInit): Headers {
  const headers = new Headers(init)
  headers.set("Accept", GITHUB_ACCEPT_HEADER)
  headers.set("Authorization", `Bearer ${token}`)
  headers.set("X-GitHub-Api-Version", GITHUB_API_VERSION)
  headers.set("User-Agent", "iudex")
  return headers
}

export async function githubFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
    ...init,
    headers: buildGitHubHeaders(token, init?.headers),
    cache: "no-store",
  })

  return response
}

export async function githubFetchJson<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await githubFetch(path, token, init)

  if (!response.ok) {
    const message = await getGitHubErrorMessage(response)
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export async function getGitHubViewer(
  token: string,
): Promise<GitHubViewer> {
  return githubFetchJson<GitHubViewer>("/user", token)
}

export async function exchangeGitHubCodeForToken(
  code: string,
  redirectUri: string,
): Promise<string> {
  const config = getGitHubOAuthConfig()

  if (!config) {
    throw new Error("GitHub OAuth is not configured")
  }

  const response = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    },
  )

  const data = (await response.json()) as {
    access_token?: string
    error?: string
    error_description?: string
  }

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        `GitHub OAuth exchange failed (${response.status})`,
    )
  }

  return data.access_token
}

export async function getGitHubErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const data = (await response.json()) as {
      message?: string
      errors?: Array<{ message?: string }>
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message
    }
    const nestedMessage = data.errors?.find(
      (entry) => typeof entry.message === "string" && entry.message.trim(),
    )?.message
    if (nestedMessage) {
      return nestedMessage
    }
  } catch {
    // Ignore JSON parsing issues and fall back to the status text.
  }

  return response.statusText || `GitHub request failed (${response.status})`
}

export async function getConnectedGitHubViewer():
  Promise<GitHubViewer | null> {
  const token = await getGitHubAccessToken()
  if (!token) return null

  try {
    return await getGitHubViewer(token)
  } catch {
    await clearGitHubAccessToken()
    return null
  }
}

export async function getAuthenticatedGitHubViewer(
  request?: NextRequest,
): Promise<(GitHubViewer & { source: GitHubAuthSource }) | null> {
  const context = await getGitHubAuthContext(request)
  if (!context) return null

  try {
    const viewer = await getGitHubViewer(context.token)
    return {
      ...viewer,
      source: context.source,
    }
  } catch {
    if (context.source === "connection") {
      await clearGitHubAccessToken()
    }
    return null
  }
}

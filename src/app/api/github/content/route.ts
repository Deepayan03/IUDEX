import { NextRequest, NextResponse } from "next/server"
import { logEditorFlow } from "@/features/editor/lib/debug"
import { getGitHubAuthContext, githubFetch } from "@/shared/auth/github"

const MAX_SIZE = 100_000 // 100KB

function encodeGitHubContentPath(value: string): string {
  return value
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const owner = searchParams.get("owner")
  const repo = searchParams.get("repo")
  const branch = searchParams.get("branch")
  const path = searchParams.get("path")

  if (!owner || !repo || !branch || !path) {
    return NextResponse.json(
      { error: "Missing required parameters: owner, repo, branch, path" },
      { status: 400 }
    )
  }

  try {
    const authContext = await getGitHubAuthContext(req)
    logEditorFlow("github-content-api", "request:start", {
      owner,
      repo,
      branch,
      path,
    })
    const res = authContext
      ? await githubFetch(
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeGitHubContentPath(path)}?ref=${encodeURIComponent(branch)}`,
          authContext.token,
        )
      : await fetch(
          `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${path}`
        )

    if (res.status === 404) {
      logEditorFlow("github-content-api", "request:not-found", {
        owner,
        repo,
        branch,
        path,
      })
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    if (!res.ok) {
      logEditorFlow("github-content-api", "request:upstream-error", {
        owner,
        repo,
        branch,
        path,
        status: res.status,
      })
      return NextResponse.json(
        { error: `Failed to fetch file: ${res.status}` },
        { status: 502 }
      )
    }

    const content = authContext
      ? (() => {
          return res.json().then((data: { content?: string; encoding?: string }) => {
            if (data.encoding !== "base64" || typeof data.content !== "string") {
              throw new Error("GitHub returned an unsupported file payload.")
            }

            return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8")
          })
        })()
      : res.text()

    const resolvedContent = await content

    if (resolvedContent.length > MAX_SIZE) {
      logEditorFlow("github-content-api", "request:too-large", {
        owner,
        repo,
        branch,
        path,
        size: resolvedContent.length,
      })
      return NextResponse.json(
        { error: "File too large (>100KB)" },
        { status: 413 }
      )
    }

    logEditorFlow("github-content-api", "request:success", {
      owner,
      repo,
      branch,
      path,
      size: resolvedContent.length,
    })
    return NextResponse.json({ content: resolvedContent })
  } catch (err) {
    logEditorFlow("github-content-api", "request:error", {
      owner,
      repo,
      branch,
      path,
      message: (err as Error).message,
    })
    return NextResponse.json(
      { error: `Failed to fetch file: ${(err as Error).message}` },
      { status: 502 }
    )
  }
}

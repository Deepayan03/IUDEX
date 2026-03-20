import { NextRequest, NextResponse } from "next/server"
import { logEditorFlow } from "@/features/editor/lib/debug"

const MAX_SIZE = 100_000 // 100KB

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
    logEditorFlow("github-content-api", "request:start", {
      owner,
      repo,
      branch,
      path,
    })
    const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${path}`
    const res = await fetch(url)

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

    const content = await res.text()

    if (content.length > MAX_SIZE) {
      logEditorFlow("github-content-api", "request:too-large", {
        owner,
        repo,
        branch,
        path,
        size: content.length,
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
      size: content.length,
    })
    return NextResponse.json({ content })
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

import { NextRequest, NextResponse } from "next/server"
import { logEditorFlow } from "@/features/editor/lib/debug"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const owner = searchParams.get("owner")
  const repo = searchParams.get("repo")
  let branch = searchParams.get("branch")

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "Missing required parameters: owner, repo" },
      { status: 400 }
    )
  }

  try {
    logEditorFlow("github-tree-api", "request:start", {
      owner,
      repo,
      branch: branch ?? "default-branch",
    })
    // If no branch provided, fetch the default branch
    if (!branch) {
      const repoRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
        { headers: { Accept: "application/vnd.github.v3+json" } }
      )
      if (repoRes.status === 404) {
        return NextResponse.json(
          { error: "Repository not found. Make sure it exists and is public." },
          { status: 404 }
        )
      }
      if (repoRes.status === 403) {
        return NextResponse.json(
          { error: "GitHub API rate limit exceeded. Try again in a few minutes." },
          { status: 429 }
        )
      }
      if (!repoRes.ok) {
        logEditorFlow("github-tree-api", "repo:upstream-error", {
          owner,
          repo,
          status: repoRes.status,
        })
        return NextResponse.json(
          { error: `GitHub API error: ${repoRes.status}` },
          { status: 502 }
        )
      }
      const repoData = await repoRes.json()
      branch = repoData.default_branch
    }

    // Fetch the full recursive tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch!)}?recursive=1`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    )

    if (treeRes.status === 404) {
      return NextResponse.json(
        { error: "Repository or branch not found." },
        { status: 404 }
      )
    }
    if (treeRes.status === 403) {
      return NextResponse.json(
        { error: "GitHub API rate limit exceeded. Try again in a few minutes." },
        { status: 429 }
      )
    }
    if (!treeRes.ok) {
      logEditorFlow("github-tree-api", "tree:upstream-error", {
        owner,
        repo,
        branch,
        status: treeRes.status,
      })
      return NextResponse.json(
        { error: `GitHub API error: ${treeRes.status}` },
        { status: 502 }
      )
    }

    const treeData = await treeRes.json()

    logEditorFlow("github-tree-api", "request:success", {
      owner,
      repo,
      branch,
      itemCount: Array.isArray(treeData.tree) ? treeData.tree.length : 0,
      truncated: !!treeData.truncated,
    })

    return NextResponse.json({
      tree: treeData.tree,
      truncated: treeData.truncated,
      owner,
      repo,
      branch,
    })
  } catch (err) {
    logEditorFlow("github-tree-api", "request:error", {
      owner,
      repo,
      branch: branch ?? "unknown",
      message: (err as Error).message,
    })
    return NextResponse.json(
      { error: `Failed to fetch repository: ${(err as Error).message}` },
      { status: 502 }
    )
  }
}

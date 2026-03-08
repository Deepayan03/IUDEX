import { NextRequest, NextResponse } from "next/server"

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
      return NextResponse.json(
        { error: `GitHub API error: ${treeRes.status}` },
        { status: 502 }
      )
    }

    const treeData = await treeRes.json()

    return NextResponse.json({
      tree: treeData.tree,
      truncated: treeData.truncated,
      owner,
      repo,
      branch,
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch repository: ${(err as Error).message}` },
      { status: 502 }
    )
  }
}

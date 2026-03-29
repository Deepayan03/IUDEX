import { NextRequest, NextResponse } from "next/server"
import type {
  GitHubRepoRef,
  ScmFileChange,
} from "@/features/editor/lib/sourceControl"
import { commitToGitHubBranch } from "@/shared/github/scm"

interface CommitRequestBody {
  repo?: GitHubRepoRef
  changes?: ScmFileChange[]
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CommitRequestBody
    const repo = body.repo
    const changes = body.changes
    const message = body.message?.trim()

    if (!repo?.owner || !repo.repo || !repo.branch) {
      return NextResponse.json(
        { error: "A repository owner, name, and branch are required." },
        { status: 400 },
      )
    }

    if (!message) {
      return NextResponse.json(
        { error: "A commit message is required." },
        { status: 400 },
      )
    }

    if (!changes || changes.length === 0) {
      return NextResponse.json(
        { error: "There are no file changes to commit." },
        { status: 400 },
      )
    }

    const result = await commitToGitHubBranch({
      request,
      repo,
      changes,
      message,
    })

    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to commit changes.",
      },
      { status: 500 },
    )
  }
}

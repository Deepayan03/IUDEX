import { NextRequest, NextResponse } from "next/server"
import type {
  GitHubRepoRef,
  ScmFileChange,
} from "@/features/editor/lib/sourceControl"
import { createPullRequestFromChanges } from "@/shared/github/scm"

interface PullRequestBody {
  repo?: GitHubRepoRef
  changes?: ScmFileChange[]
  message?: string
  roomId?: string
  username?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PullRequestBody
    const repo = body.repo
    const changes = body.changes
    const message = body.message?.trim()
    const roomId = body.roomId?.trim()
    const username = body.username?.trim()

    if (!repo?.owner || !repo.repo || !repo.branch) {
      return NextResponse.json(
        { error: "A repository owner, name, and branch are required." },
        { status: 400 },
      )
    }

    if (!message) {
      return NextResponse.json(
        { error: "A pull request title is required." },
        { status: 400 },
      )
    }

    if (!roomId || !username) {
      return NextResponse.json(
        { error: "Room and user information are required." },
        { status: 400 },
      )
    }

    if (!changes || changes.length === 0) {
      return NextResponse.json(
        { error: "There are no file changes to open in a pull request." },
        { status: 400 },
      )
    }

    const result = await createPullRequestFromChanges({
      request,
      repo,
      changes,
      message,
      roomId,
      username,
    })

    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to open a pull request.",
      },
      { status: 500 },
    )
  }
}

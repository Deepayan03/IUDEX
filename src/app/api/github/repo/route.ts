import { NextRequest, NextResponse } from "next/server"
import type { ScmFileChange } from "@/features/editor/lib/sourceControl"
import { createRepositoryFromProject } from "@/shared/github/scm"

interface CreateRepositoryBody {
  name?: string
  description?: string
  isPrivate?: boolean
  files?: ScmFileChange[]
  initialCommitMessage?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateRepositoryBody
    const name = body.name?.trim()
    const files = body.files ?? []
    const initialCommitMessage =
      body.initialCommitMessage?.trim() || "Initial commit from IUDEX"

    if (!name) {
      return NextResponse.json(
        { error: "A repository name is required." },
        { status: 400 },
      )
    }

    const result = await createRepositoryFromProject({
      request,
      name,
      description: body.description,
      isPrivate: !!body.isPrivate,
      files,
      initialCommitMessage,
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
            : "Unable to create the repository.",
      },
      { status: 500 },
    )
  }
}

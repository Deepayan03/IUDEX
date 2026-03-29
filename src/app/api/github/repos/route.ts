import { NextRequest, NextResponse } from "next/server"
import { listAuthenticatedUserRepositories } from "@/shared/github/scm"

export async function GET(request: NextRequest) {
  try {
    const repos = await listAuthenticatedUserRepositories(request)
    return NextResponse.json({ repos })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load GitHub repositories.",
      },
      { status: 500 },
    )
  }
}

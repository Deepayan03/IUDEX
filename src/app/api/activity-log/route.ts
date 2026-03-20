import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/shared/supabase/client"
import type { ActivityLogEntry } from "@/features/editor/activity-log/types"


function activityLogErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error"

  if (message.includes("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")) {
    return NextResponse.json(
      { error: "Activity log backend is not configured" },
      { status: 503 }
    )
  }

  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get("roomId")
  const limit = parseInt(searchParams.get("limit") ?? "50", 10)
  const before = searchParams.get("before")
  const after = searchParams.get("after")

  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 })
  }

  try {
    const supabase = getSupabaseClient()
    let query = supabase
      .from("activity_logs")
      .select("*")
      .eq("room_id", roomId)
      .order("timestamp", { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt("timestamp", parseInt(before, 10))
    }
    if (after) {
      query = query.gt("timestamp", parseInt(after, 10))
    }

    const { data, error } = await query

    if (error) {
      console.error("[activity-log] Fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
    }

    const entries: ActivityLogEntry[] = (data ?? []).map((row) => ({
      id: row.id,
      roomId: row.room_id,
      userId: row.user_id,
      username: row.username,
      action: row.action,
      targetFile: row.target_file,
      targetFileName: row.target_file_name,
      lineNumber: row.line_number ?? undefined,
      delta: row.delta ?? undefined,
      timestamp: row.timestamp,
      undone: row.undone ?? false,
    }))

    return NextResponse.json({ entries })
  } catch (err) {
    console.error("[activity-log] Error:", err)
    return activityLogErrorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entries: ActivityLogEntry[] = body.entries

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "entries array required" }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    const rows = entries.map((e) => ({
      id: e.id,
      room_id: e.roomId,
      user_id: e.userId,
      username: e.username,
      action: e.action,
      target_file: e.targetFile,
      target_file_name: e.targetFileName,
      line_number: e.lineNumber ?? null,
      delta: e.delta ?? null,
      timestamp: e.timestamp,
      undone: e.undone ?? false,
    }))

    const { error } = await supabase.from("activity_logs").insert(rows)

    if (error) {
      console.error("[activity-log] Insert error:", error)
      return NextResponse.json({ error: "Failed to save logs" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[activity-log] Error:", err)
    return activityLogErrorResponse(err)
  }
}

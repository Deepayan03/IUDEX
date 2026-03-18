import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/shared/supabase/client"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { entryId } = body

    if (!entryId) {
      return NextResponse.json({ error: "entryId required" }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from("activity_logs")
      .update({ undone: true })
      .eq("id", entryId)

    if (error) {
      console.error("[activity-log] Undo error:", error)
      return NextResponse.json({ error: "Failed to undo" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[activity-log] Error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

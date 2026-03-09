"use client"

import { useState, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { Plus, LogIn, Clock, Trash2, ArrowLeft, ArrowRight } from "lucide-react"
import { C, stagger, fadeUp } from "@/components/landing/constants"
import {
  getRoomHistory,
  addRoomToHistory,
  removeRoomFromHistory,
  generateRoomId,
  extractRoomIdFromInput,
  type RoomHistoryEntry,
} from "@/lib/roomHistory"

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

interface RoomsPageProps {
  userInfo: { username: string; email: string }
}

export default function RoomsPage({ userInfo }: RoomsPageProps) {
  const [roomName, setRoomName] = useState("")
  const [joinInput, setJoinInput] = useState("")
  const [joinError, setJoinError] = useState("")
  const [history, setHistory] = useState<RoomHistoryEntry[]>([])
  const router = useRouter()

  useEffect(() => {
    setHistory(getRoomHistory())
  }, [])

  const handleCreate = useCallback(() => {
    const id = generateRoomId()
    addRoomToHistory(id, roomName.trim() || "")
    router.push(`/editor/${id}`)
  }, [roomName, router])

  const handleJoin = useCallback(() => {
    setJoinError("")
    const id = extractRoomIdFromInput(joinInput)
    if (!id) {
      setJoinError("Enter a valid room ID or a link like /editor/abc123")
      return
    }
    addRoomToHistory(id)
    router.push(`/editor/${id}`)
  }, [joinInput, router])

  const handleDelete = useCallback((roomId: string) => {
    removeRoomFromHistory(roomId)
    setHistory(getRoomHistory())
  }, [])

  const handleRejoin = useCallback((entry: RoomHistoryEntry) => {
    addRoomToHistory(entry.roomId, entry.name)
    router.push(`/editor/${entry.roomId}`)
  }, [router])

  return (
    <div className="min-h-screen" style={{ background: C.bgDeepest, color: C.textBody }}>
      {/* Dot grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(61,90,254,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top bar */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 h-15"
        style={{
          background: "rgba(6,12,24,0.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(21,32,64,0.5)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-md"
            style={{ width: 28, height: 28, background: C.gradient }}
          >
            <span className="ui-font text-[11px] font-bold text-white leading-none tracking-tight">IX</span>
          </div>
          <span className="ui-font text-[15px] font-bold text-white tracking-tight">IUDEX</span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="ui-font text-[13px]" style={{ color: C.textMuted }}>
            {userInfo.username}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="ui-font text-[12px] px-3 py-1.5 rounded-lg cursor-pointer transition-colors duration-200"
            style={{ border: `1px solid ${C.borderMid}`, color: C.textMuted, background: "transparent" }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <motion.div
        className="relative z-10 max-w-2xl mx-auto px-6 py-16"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Back link */}
        <motion.div variants={fadeUp}>
          <Link
            href="/"
            className="ui-font text-[13px] inline-flex items-center gap-1.5 mb-10 transition-colors duration-200 hover:text-white"
            style={{ color: C.textMuted }}
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </motion.div>

        {/* Page title */}
        <motion.h1
          variants={fadeUp}
          className="ui-font text-3xl md:text-4xl font-bold mb-12"
          style={{ color: C.textPrimary }}
        >
          Your Rooms
        </motion.h1>

        {/* Create Room card */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl p-8 mb-5"
          style={{
            background: "linear-gradient(165deg, rgba(13,16,32,0.8), rgba(8,13,24,0.6))",
            border: `1px solid ${C.borderMid}`,
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: C.gradient }}
            >
              <Plus size={20} color="#fff" />
            </div>
            <h2 className="ui-font text-lg font-semibold" style={{ color: C.textPrimary }}>
              Create a New Room
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Room name (optional)"
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              className="ui-font text-[13px] flex-1 px-4 py-3 rounded-xl outline-none transition-colors duration-200"
              style={{
                background: C.bgSurface,
                border: `1px solid ${C.borderMid}`,
                color: C.textPrimary,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = C.primary }}
              onBlur={e => { e.currentTarget.style.borderColor = C.borderMid }}
            />
            <motion.button
              onClick={handleCreate}
              className="ui-font text-[14px] font-semibold px-6 py-3 rounded-xl text-white flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              style={{
                background: C.gradient,
                boxShadow: "0 0 30px rgba(61,90,254,0.3)",
              }}
              whileHover={{ scale: 1.03, boxShadow: "0 0 50px rgba(61,90,254,0.5)" }}
              whileTap={{ scale: 0.98 }}
            >
              Create Room <ArrowRight size={15} />
            </motion.button>
          </div>
        </motion.div>

        {/* Join Room card */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl p-8 mb-12"
          style={{
            background: "linear-gradient(165deg, rgba(13,16,32,0.8), rgba(8,13,24,0.6))",
            border: `1px solid ${C.borderMid}`,
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: C.gradient }}
            >
              <LogIn size={20} color="#fff" />
            </div>
            <h2 className="ui-font text-lg font-semibold" style={{ color: C.textPrimary }}>
              Join an Existing Room
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Room ID or link (e.g. abc123 or /editor/abc123)"
              value={joinInput}
              onChange={e => { setJoinInput(e.target.value); setJoinError("") }}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              className="editor-font text-[13px] flex-1 px-4 py-3 rounded-xl outline-none transition-colors duration-200"
              style={{
                background: C.bgSurface,
                border: `1px solid ${joinError ? "#ef4444" : C.borderMid}`,
                color: C.textPrimary,
              }}
              onFocus={e => { if (!joinError) e.currentTarget.style.borderColor = C.primary }}
              onBlur={e => { if (!joinError) e.currentTarget.style.borderColor = C.borderMid }}
            />
            <motion.button
              onClick={handleJoin}
              className="ui-font text-[14px] font-semibold px-6 py-3 rounded-xl text-white flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              style={{
                background: C.gradient,
                boxShadow: "0 0 30px rgba(61,90,254,0.3)",
              }}
              whileHover={{ scale: 1.03, boxShadow: "0 0 50px rgba(61,90,254,0.5)" }}
              whileTap={{ scale: 0.98 }}
            >
              Join Room <ArrowRight size={15} />
            </motion.button>
          </div>
          {joinError && (
            <p className="ui-font text-[12px] mt-2" style={{ color: "#ef4444" }}>
              {joinError}
            </p>
          )}
        </motion.div>

        {/* Recent Rooms */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 mb-6">
            <Clock size={16} style={{ color: C.textMuted }} />
            <h2 className="ui-font text-lg font-semibold" style={{ color: C.textPrimary }}>
              Recent Rooms
            </h2>
          </div>

          {history.length === 0 ? (
            <p className="ui-font text-[14px]" style={{ color: C.textDim }}>
              No rooms visited yet. Create or join a room to get started.
            </p>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(165deg, rgba(13,16,32,0.8), rgba(8,13,24,0.6))",
                border: `1px solid ${C.borderMid}`,
              }}
            >
              {history.map((entry, i) => (
                <div
                  key={entry.roomId}
                  className="flex items-center gap-4 px-6 py-4 transition-colors duration-200"
                  style={{
                    borderBottom: i < history.length - 1 ? `1px solid ${C.borderDark}` : "none",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="ui-font text-[14px] font-medium truncate"
                        style={{ color: C.textPrimary }}
                      >
                        {entry.name || entry.roomId}
                      </span>
                      {entry.name && (
                        <span
                          className="editor-font text-[11px] px-2 py-0.5 rounded"
                          style={{ background: C.bgSurface, color: C.textDim }}
                        >
                          {entry.roomId}
                        </span>
                      )}
                    </div>
                    <span className="ui-font text-[12px]" style={{ color: C.textDim }}>
                      {timeAgo(entry.lastVisited)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <motion.button
                      onClick={() => handleRejoin(entry)}
                      className="ui-font text-[12px] font-semibold px-4 py-1.5 rounded-lg text-white cursor-pointer"
                      style={{ background: C.gradient }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Join
                    </motion.button>
                    <motion.button
                      onClick={() => handleDelete(entry.roomId)}
                      className="p-1.5 rounded-lg cursor-pointer transition-colors duration-200"
                      style={{ color: C.textDim, background: "transparent" }}
                      whileHover={{ color: "#ef4444" }}
                      whileTap={{ scale: 0.9 }}
                      title="Remove from history"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}

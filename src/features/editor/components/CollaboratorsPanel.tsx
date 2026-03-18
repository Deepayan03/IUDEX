"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { Users, X, ChevronRight, FileCode2, Mail, Circle } from "lucide-react"
import { useCollaborationStore } from "@/shared/state/collaboration"

interface CollaboratorsPanelProps {
  roomCreatorId?: string | null
  isRoomCreator?: boolean
  userInfo?: { userId: string; username: string } | null
  activeFileName?: string
  cursorPosition?: { lineNumber: number; column: number } | null
  onReconnect?: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("")
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Animation variants ───────────────────────────────────────────────────

const panelVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
    y: 20,
    borderRadius: "24px",
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    borderRadius: "16px",
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
      mass: 0.8,
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 16,
    borderRadius: "24px",
    transition: {
      type: "spring" as const,
      stiffness: 500,
      damping: 35,
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, x: 24, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 400, damping: 28 },
  },
  exit: {
    opacity: 0,
    x: -16,
    filter: "blur(4px)",
    transition: { duration: 0.15 },
  },
}

const detailVariants: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { type: "spring" as const, stiffness: 400, damping: 32 },
      opacity: { duration: 0.2, delay: 0.05 },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { height: { duration: 0.2 }, opacity: { duration: 0.1 } },
  },
}

const fabVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.92 },
}

const pulseRing: Variants = {
  initial: { scale: 1, opacity: 0.6 },
  animate: {
    scale: [1, 1.8, 1],
    opacity: [0.6, 0, 0.6],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const },
  },
}

// ── Component ────────────────────────────────────────────────────────────

export default function CollaboratorsPanel({
  roomCreatorId,
  isRoomCreator,
  userInfo,
  activeFileName,
  cursorPosition,
  onReconnect,
}: CollaboratorsPanelProps) {
  const collaborators = useCollaborationStore(s => s.collaborators)
  const connectionStatus = useCollaborationStore(s => s.connectionStatus)
  const syncStatus = useCollaborationStore(s => s.syncStatus)
  const reconnectAttempt = useCollaborationStore(s => s.reconnectAttempt)
  const lastDisconnectReason = useCollaborationStore(s => s.lastDisconnectReason)
  const [isOpen, setIsOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen])

  const sortedCollaborators = useMemo(() => {
    return [...collaborators].sort((a, b) => {
      const aIsOwner = roomCreatorId != null && a.userId === roomCreatorId
      const bIsOwner = roomCreatorId != null && b.userId === roomCreatorId

      if (aIsOwner !== bIsOwner) {
        return aIsOwner ? -1 : 1
      }

      if (!!a.activeFile !== !!b.activeFile) {
        return a.activeFile ? -1 : 1
      }

      return a.username.localeCompare(b.username)
    })
  }, [collaborators, roomCreatorId])

  const visibleExpandedId = expandedId !== null &&
    sortedCollaborators.some(collab => collab.clientId === expandedId)
      ? expandedId
      : null

  const onlineCount = collaborators.length + 1 // +1 for self
  const isConnected = connectionStatus === "connected" && syncStatus === "synced"
  const isSyncing = connectionStatus === "connected" && syncStatus === "syncing"
  const isRecovering = connectionStatus === "connecting" || isSyncing
  const selfLabel = userInfo?.username ?? "You"
  const selfInitials = getInitials(selfLabel) || "Y"
  const connectionMessage = isConnected
    ? `${onlineCount} online`
    : isSyncing
      ? "Syncing room..."
      : connectionStatus === "connecting"
        ? reconnectAttempt > 0
          ? `Reconnecting${reconnectAttempt > 1 ? ` (${reconnectAttempt})` : ""}...`
          : "Connecting..."
        : lastDisconnectReason ?? "Offline"
  const footerMessage = isConnected
    ? "Room participants are synced in real-time"
    : isRecovering
      ? "Rejoining the room and restoring live presence..."
      : "Changes stay in your editor and will sync again once the room reconnects."
  const connectionTone = isConnected
    ? "#4ade80"
    : isSyncing
      ? "#60a5fa"
      : connectionStatus === "connecting"
        ? "#f59e0b"
        : "#ef4444"

  return (
    <div
      ref={panelRef}
      className="fixed z-50"
      style={{ bottom: 36, right: 16 }}
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          /* ── Expanded panel ─────────────────────────────────────── */
          <motion.div
            key="panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              width: 320,
              maxHeight: "min(480px, calc(100vh - 120px))",
              background: "linear-gradient(165deg, #0b1222 0%, #0a0f1c 50%, #080d18 100%)",
              border: "1px solid #152040",
              boxShadow:
                "0 0 0 1px rgba(61,90,254,0.08), 0 8px 40px rgba(0,0,0,0.55), 0 2px 12px rgba(61,90,254,0.10)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <motion.div
              style={{
                padding: "14px 16px 12px",
                borderBottom: "1px solid #152040",
                background: "linear-gradient(135deg, rgba(61,90,254,0.06) 0%, transparent 100%)",
              }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #3d5afe 0%, #651fff 100%)",
                      boxShadow: "0 2px 8px rgba(61,90,254,0.3)",
                    }}
                  >
                    <Users size={14} color="#fff" strokeWidth={2.5} />
                  </div>
                  <div>
                    <span
                      className="ui-font"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#e2e8f0",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Collaborators
                    </span>
                    <div style={{ fontSize: 10.5, color: "#5a7099", marginTop: 1 }}>
                      {isConnected ? (
                        <span className="flex items-center gap-1">
                          <motion.span
                            style={{ color: connectionTone }}
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            {"\u25CF"}
                          </motion.span>
                          {connectionMessage}
                        </span>
                      ) : (
                        <span style={{ color: connectionTone }}>{connectionMessage}</span>
                      )}
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.15, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  onClick={() => setIsOpen(false)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "none",
                    background: "rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#5a7099",
                  }}
                  aria-label="Close collaborators panel"
                >
                  <X size={14} />
                </motion.button>
              </div>
            </motion.div>

            {/* User list */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "6px 8px",
              }}
              className="collab-scrollbar"
            >
              {/* Self (always first) */}
              <motion.div
                variants={itemVariants}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  marginBottom: 2,
                  background: "rgba(61,90,254,0.06)",
                  border: "1px solid rgba(61,90,254,0.10)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      background: "linear-gradient(135deg, #3d5afe 0%, #651fff 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {selfInitials}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#e2e8f0",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {selfLabel}
                      {isRoomCreator && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#4ade80",
                            background: "rgba(74,222,128,0.10)",
                            borderRadius: 4,
                            padding: "1px 5px",
                            letterSpacing: "0.02em",
                            lineHeight: "16px",
                          }}
                        >
                          Owner
                        </span>
                      )}
                    </div>
                    {activeFileName ? (
                      <div
                        className="flex items-center gap-1"
                        style={{ fontSize: 10.5, color: "#5a7099", marginTop: 1 }}
                      >
                        <FileCode2 size={10} />
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {activeFileName}
                        </span>
                        {cursorPosition && (
                          <span style={{ color: "#7b93b8" }}>
                            Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 10.5, color: "#5a7099" }}>
                        Browsing the workspace
                      </div>
                    )}
                  </div>
                  <Circle
                    size={8}
                    fill={isConnected ? "#4ade80" : isRecovering ? "#60a5fa" : "#f59e0b"}
                    stroke="none"
                    style={{ flexShrink: 0 }}
                  />
                </div>
              </motion.div>

              {/* Remote collaborators */}
              <AnimatePresence>
                {sortedCollaborators.map(collab => {
                  const isExpanded = visibleExpandedId === collab.clientId

                  return (
                    <motion.div
                      key={collab.clientId}
                      variants={itemVariants}
                      layout
                      style={{
                        borderRadius: 10,
                        marginBottom: 2,
                        cursor: "pointer",
                        overflow: "hidden",
                        background: isExpanded
                          ? hexToRgba(collab.color, 0.06)
                          : "transparent",
                        border: isExpanded
                          ? `1px solid ${hexToRgba(collab.color, 0.15)}`
                          : "1px solid transparent",
                        transition: "background 0.2s, border-color 0.2s",
                      }}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : collab.clientId)
                      }
                    >
                      {/* User row */}
                      <motion.div
                        style={{ padding: "8px 10px" }}
                        whileHover={{
                          backgroundColor: hexToRgba(collab.color, 0.04),
                        }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Avatar */}
                          <div
                            style={{
                              position: "relative",
                              width: 30,
                              height: 30,
                              flexShrink: 0,
                            }}
                          >
                            <motion.div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 10,
                                background: `linear-gradient(135deg, ${collab.color} 0%, ${hexToRgba(collab.color, 0.6)} 100%)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#fff",
                              }}
                              whileHover={{ scale: 1.08 }}
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            >
                              {getInitials(collab.username)}
                            </motion.div>
                            {/* Online dot */}
                            <motion.div
                              style={{
                                position: "absolute",
                                bottom: -1,
                                right: -1,
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                background: "#4ade80",
                                border: "2px solid #0b1222",
                              }}
                              animate={{ scale: [1, 1.15, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </div>

                          {/* Name + file */}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              className="ui-font"
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#e2e8f0",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              {collab.username}
                              {roomCreatorId && collab.userId === roomCreatorId && (
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: "#4ade80",
                                    background: "rgba(74,222,128,0.10)",
                                    borderRadius: 4,
                                    padding: "1px 5px",
                                    letterSpacing: "0.02em",
                                    lineHeight: "16px",
                                    flexShrink: 0,
                                  }}
                                >
                                  Owner
                                </span>
                              )}
                            </div>
                            {collab.activeFile && (
                              <div
                                className="flex items-center gap-1"
                                style={{
                                  fontSize: 10.5,
                                  color: "#5a7099",
                                  marginTop: 1,
                                }}
                              >
                                <FileCode2 size={10} />
                                <span
                                  style={{
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {collab.activeFile}
                                </span>
                              </div>
                            )}
                            {!collab.activeFile && (
                              <div style={{ fontSize: 10.5, color: "#5a7099", marginTop: 1 }}>
                                Browsing the workspace
                              </div>
                            )}
                          </div>

                          {/* Expand chevron */}
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            style={{ color: "#3a5080", flexShrink: 0 }}
                          >
                            <ChevronRight size={14} />
                          </motion.div>
                        </div>
                      </motion.div>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            key="detail"
                            variants={detailVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            style={{ overflow: "hidden" }}
                          >
                            <div
                              style={{
                                padding: "0 10px 10px 46px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                              }}
                            >
                              {/* Email */}
                              <div
                                className="flex items-center gap-2"
                                style={{ fontSize: 11, color: "#8899b0" }}
                              >
                                <Mail size={12} style={{ color: collab.color, flexShrink: 0 }} />
                                <span
                                  style={{
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {collab.userId}
                                </span>
                              </div>

                              {/* File being edited */}
                              {collab.activeFile && (
                                <div
                                  className="flex items-center gap-2"
                                  style={{ fontSize: 11, color: "#8899b0" }}
                                >
                                  <FileCode2 size={12} style={{ color: collab.color, flexShrink: 0 }} />
                                  <span
                                    style={{
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    Editing&nbsp;
                                    <span style={{ color: "#c8d6e5", fontWeight: 500 }}>
                                      {collab.activeFile}
                                    </span>
                                  </span>
                                </div>
                              )}
                              {!collab.activeFile && (
                                <div
                                  className="flex items-center gap-2"
                                  style={{ fontSize: 11, color: "#8899b0" }}
                                >
                                  <FileCode2 size={12} style={{ color: collab.color, flexShrink: 0 }} />
                                  <span>Browsing the workspace</span>
                                </div>
                              )}

                              {/* Cursor position */}
                              {collab.cursor && (
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    color: "#3a5080",
                                    paddingLeft: 20,
                                  }}
                                >
                                  Ln {collab.cursor.lineNumber}, Col {collab.cursor.column}
                                </div>
                              )}
                              {!collab.cursor && (
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    color: "#3a5080",
                                    paddingLeft: 20,
                                  }}
                                >
                                  Cursor not shared yet
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* Empty state */}
              {collaborators.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    textAlign: "center",
                    padding: "24px 16px",
                    color: "#3a5080",
                    fontSize: 12,
                  }}
                >
                  <Users
                    size={28}
                    style={{ margin: "0 auto 10px", opacity: 0.3 }}
                  />
                  <div style={{ fontWeight: 500, color: "#5a7099", marginBottom: 4 }}>
                    {isRecovering
                      ? "Restoring collaborator presence..."
                      : connectionStatus === "disconnected"
                        ? "Room connection offline"
                        : "No one else here yet"}
                  </div>
                  <div style={{ fontSize: 11 }}>
                    {isRecovering || connectionStatus === "disconnected"
                      ? "We will refresh this list as soon as the room reconnects."
                      : "Share your room link to invite collaborators"}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.15 } }}
              style={{
                padding: "8px 16px",
                borderTop: "1px solid #152040",
                fontSize: 10.5,
                color: "#2a3a5a",
                textAlign: "center",
                background: "rgba(0,0,0,0.15)",
              }}
            >
              <div>{footerMessage}</div>
              {!isConnected && onReconnect && (
                <button
                  type="button"
                  onClick={onReconnect}
                  style={{
                    marginTop: 8,
                    borderRadius: 8,
                    border: "1px solid rgba(96,165,250,0.25)",
                    background: "rgba(96,165,250,0.08)",
                    color: "#93c5fd",
                    padding: "5px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Retry now
                </button>
              )}
            </motion.div>
          </motion.div>
        ) : (
          /* ── Collapsed FAB ──────────────────────────────────────── */
          <motion.button
            key="fab"
            variants={fabVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            onClick={() => setIsOpen(true)}
            style={{
              position: "relative",
              width: 48,
              height: 48,
              borderRadius: 14,
              border: `1px solid ${
                isConnected
                  ? "#1a2a5e"
                  : isRecovering
                    ? "#1d4ed8"
                    : "#7f1d1d"
              }`,
              background: isConnected
                ? "linear-gradient(135deg, #0f1833 0%, #0b1222 100%)"
                : isRecovering
                  ? "linear-gradient(135deg, #0f1f4d 0%, #0b1630 100%)"
                  : "linear-gradient(135deg, #2a1116 0%, #14090d 100%)",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(61,90,254,0.12), inset 0 1px 0 rgba(255,255,255,0.03)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7b93b8",
            }}
            aria-label="Open collaborators panel"
          >
            {/* Animated ring when users are online */}
            {isConnected && collaborators.length > 0 && (
              <motion.div
                variants={pulseRing}
                initial="initial"
                animate="animate"
                style={{
                  position: "absolute",
                  inset: -3,
                  borderRadius: 17,
                  border: "2px solid rgba(61,90,254,0.25)",
                  pointerEvents: "none",
                }}
              />
            )}

            <Users size={20} />

            {/* Badge */}
            {isConnected && collaborators.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  background: "linear-gradient(135deg, #3d5afe 0%, #651fff 100%)",
                  border: "2px solid #0b1222",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#fff",
                  padding: "0 4px",
                  boxShadow: "0 2px 8px rgba(61,90,254,0.4)",
                }}
              >
                {collaborators.length}
              </motion.div>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

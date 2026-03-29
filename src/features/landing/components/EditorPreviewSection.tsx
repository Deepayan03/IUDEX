"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  FileCode2,
  FileText,
  FolderOpen,
  LayoutTemplate,
  Palette,
  Users,
} from "lucide-react"
import { C, scaleIn } from "@/features/landing/constants"
import { Section } from "@/features/landing/components/Section"

type TabId = "code" | "scm" | "code2"

type CodeTab = {
  label: string
  path: string[]
  lines: ReactNode[]
  cursorLine?: number
}

function Line({ n, children }: { n: number; children?: ReactNode }) {
  return (
    <div className="flex">
      <span
        className="mr-4 inline-block w-8 shrink-0 select-none text-right"
        style={{ color: "#253550" }}
      >
        {n}
      </span>
      <span>{children}</span>
    </div>
  )
}

function Kw({ children }: { children: ReactNode }) {
  return <span style={{ color: "#7b9ef7" }}>{children}</span>
}

function Fn({ children }: { children: ReactNode }) {
  return <span style={{ color: "#a78bfa" }}>{children}</span>
}

function Str({ children }: { children: ReactNode }) {
  return <span style={{ color: "#4ade80" }}>{children}</span>
}

function Cmt({ children }: { children: ReactNode }) {
  return <span style={{ color: "#2e4060", fontStyle: "italic" }}>{children}</span>
}

function Op({ children }: { children: ReactNode }) {
  return <span style={{ color: "#e2e8f0" }}>{children}</span>
}

const ROOM_PAGE_LINES: ReactNode[] = [
  <Cmt key="room-1">{"// iudex collaborative room page"}</Cmt>,
  <>
    <Kw>import</Kw> <Op>{"{ useEffect, useState }"}</Op> <Kw>from</Kw>{" "}
    <Str>{'"react"'}</Str>
  </>,
  <>
    <Kw>import</Kw> <Op>* as Y</Op> <Kw>from</Kw> <Str>{'"yjs"'}</Str>
  </>,
  <>
    <Kw>import</Kw> <Op>{"{ WebsocketProvider }"}</Op> <Kw>from</Kw>{" "}
    <Str>{'"y-websocket"'}</Str>
  </>,
  <>
    <Kw>import</Kw> <Op>{"{ MonacoEditor }"}</Op> <Kw>from</Kw>{" "}
    <Str>{'"@monaco-editor/react"'}</Str>
  </>,
  null,
  <>
    <Kw>export default function</Kw> <Fn>RoomPage</Fn>
    <Op>{"({ roomId }: { roomId: string }) {"}</Op>
  </>,
  <>
    {"  "}
    <Kw>const</Kw> <Op>[doc] = useState(() =&gt; </Op>
    <Kw>new</Kw> <Fn>Y.Doc</Fn>
    <Op>())</Op>
  </>,
  <>
    {"  "}
    <Kw>const</Kw> <Op>[ready, setReady] = useState(</Op>
    <Kw>false</Kw>
    <Op>)</Op>
  </>,
  null,
  <>
    {"  "}
    <Fn>useEffect</Fn>
    <Op>{"(() => {"}</Op>
  </>,
  <>
    {"    "}
    <Kw>const</Kw> <Op>provider = </Op>
    <Kw>new</Kw> <Fn>WebsocketProvider</Fn>
    <Op>(</Op>
  </>,
  <>
    {"      "}
    <Str>{'`wss://iudex.app/rooms/${roomId}`'}</Str>
    <Op>, doc</Op>
  </>,
  <>
    {"    "}
    <Op>)</Op>
  </>,
  <>
    {"    "}
    <Op>provider.on(</Op>
    <Str>{'"status"'}</Str>
    <Op>, {"({ status }) =>"} setReady(status === </Op>
    <Str>{'"connected"'}</Str>
    <Op>))</Op>
  </>,
  <>
    {"    "}
    <Kw>return</Kw> <Op>() =&gt; provider.</Op>
    <Fn>destroy</Fn>
    <Op>()</Op>
  </>,
  <>
    {"  "}
    <Op>{"}, [roomId, doc])"}</Op>
  </>,
  null,
  <>
    {"  "}
    <Kw>return</Kw> <Op>{" <"}</Op>
    <Fn>MonacoEditor</Fn>
    <Op>{" model={doc."}</Op>
    <Fn>getText</Fn>
    <Op>(</Op>
    <Str>{'"content"'}</Str>
    <Op>{")} />"}</Op>
  </>,
]

const YJS_LINES: ReactNode[] = [
  <>
    <Kw>import</Kw> <Op>* as Y</Op> <Kw>from</Kw> <Str>{'"yjs"'}</Str>
  </>,
  <>
    <Kw>import</Kw> <Op>{"{ WebsocketProvider }"}</Op> <Kw>from</Kw>{" "}
    <Str>{'"y-websocket"'}</Str>
  </>,
  null,
  <>
    <Kw>export function</Kw> <Fn>createRoomBinding</Fn>
    <Op>{"(roomId: string) {"}</Op>
  </>,
  <>
    {"  "}
    <Kw>const</Kw> <Op>doc = </Op>
    <Kw>new</Kw> <Fn>Y.Doc</Fn>
    <Op>()</Op>
  </>,
  <>
    {"  "}
    <Kw>const</Kw> <Op>provider = </Op>
    <Kw>new</Kw> <Fn>WebsocketProvider</Fn>
    <Op>(</Op>
    <Str>{'`wss://iudex.app/rooms/${roomId}`'}</Str>
    <Op>, doc)</Op>
  </>,
  <>
    {"  "}
    <Kw>const</Kw> <Op>text = doc.</Op>
    <Fn>getText</Fn>
    <Op>(</Op>
    <Str>{'"content"'}</Str>
    <Op>)</Op>
  </>,
  null,
  <>
    {"  "}
    <Kw>return</Kw> <Op>{"{ doc, provider, text }"}</Op>
  </>,
  <Op key="yjs-end">{"}"}</Op>,
]

const TAB_CONTENT: Record<TabId, CodeTab> = {
  code: {
    label: "page.tsx",
    path: ["app", "page.tsx"],
    lines: ROOM_PAGE_LINES,
    cursorLine: 19,
  },
  scm: {
    label: "page.tsx",
    path: ["app", "page.tsx"],
    lines: ROOM_PAGE_LINES,
    cursorLine: 19,
  },
  code2: {
    label: "lib/yjs.ts",
    path: ["lib", "yjs.ts"],
    lines: YJS_LINES,
  },
}

const ACTIVITY_ROWS = [
  { time: "now", who: "deepayan", what: "edited", file: "page.tsx" },
  { time: "1m", who: "arjun", what: "created", file: "lib/github.ts" },
  { time: "4m", who: "kavya", what: "opened", file: "api/rooms.ts" },
  { time: "9m", who: "deepayan", what: "committed", file: '"add websocket auth"' },
] as const

export default function EditorPreviewSection() {
  const [activeTab, setActiveTab] = useState<TabId>("code")
  const [showActivity, setShowActivity] = useState(true)

  const activeContent = TAB_CONTENT[activeTab]
  const showScm = activeTab === "scm"
  const activeTreeFile = activeTab === "code2" ? "yjs" : "page"

  return (
    <Section
      id="features"
      className="px-6 pb-24 md:px-12 md:pb-28"
      style={{ background: C.bgDeepest }}
    >
      <div id="editor-preview" className="mx-auto max-w-[980px]">
        <motion.div
          variants={scaleIn}
          className="overflow-hidden rounded-[18px]"
          style={{
            border: `1px solid ${C.borderMid}`,
            boxShadow: "0 0 0 1px rgba(61,90,254,0.07), 0 48px 96px rgba(0,0,0,0.65)",
          }}
        >
          <div
            className="flex h-[42px] items-center bg-[#070c1a]"
            style={{ borderBottom: `1px solid ${C.borderDark}` }}
          >
            <div className="flex gap-1.5 px-4">
              <span className="h-[11px] w-[11px] rounded-full" style={{ background: "#ff5f56" }} />
              <span className="h-[11px] w-[11px] rounded-full" style={{ background: "#febc2e" }} />
              <span className="h-[11px] w-[11px] rounded-full" style={{ background: "#27c93f" }} />
            </div>

            <div className="flex h-full border-l" style={{ borderColor: C.borderDark }}>
              {(
                [
                  { id: "code", label: "page.tsx" },
                  { id: "scm", label: "Source Control" },
                  { id: "code2", label: "lib/yjs.ts" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="editor-font hidden h-full cursor-pointer items-center border-r px-4 text-[11px] sm:flex"
                  style={{
                    borderColor: C.borderDark,
                    color: activeTab === tab.id ? C.textBody : C.textDim,
                    background: activeTab === tab.id ? "rgba(61,90,254,0.08)" : "transparent",
                    borderBottom:
                      activeTab === tab.id ? `1px solid ${C.primary}` : "1px solid transparent",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2.5 pr-4">
              <div className="flex">
                {[
                  { label: "D", bg: "linear-gradient(135deg,#3d5afe,#651fff)" },
                  { label: "A", bg: "linear-gradient(135deg,#0d8a5c,#1de9b6)" },
                  { label: "K", bg: "linear-gradient(135deg,#f59e0b,#ef4444)" },
                ].map((avatar, index) => (
                  <div
                    key={avatar.label}
                    className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 text-[8px] font-extrabold text-white"
                    style={{
                      background: avatar.bg,
                      borderColor: "#070c1a",
                      marginLeft: index === 0 ? 0 : -6,
                    }}
                  >
                    {avatar.label}
                  </div>
                ))}
              </div>

              <div
                className="editor-font hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] sm:flex"
                style={{
                  background: "rgba(74,222,128,0.1)",
                  borderColor: "rgba(74,222,128,0.25)",
                  color: C.green,
                }}
              >
                <span
                  className="inline-block h-[5px] w-[5px] rounded-full"
                  style={{ background: C.green }}
                />
                3 live
              </div>
            </div>
          </div>

          <div className="flex" style={{ height: 380, background: C.bgDeepest }}>
            <div
              className="hidden w-[195px] shrink-0 bg-[#060b16] py-2 md:block"
              style={{ borderRight: `1px solid ${C.borderDark}` }}
            >
              {!showScm ? (
                <>
                  <div
                    className="editor-font px-3.5 pb-1 pt-2 text-[9.5px] uppercase tracking-[0.1em]"
                    style={{ color: C.textDim }}
                  >
                    Explorer
                  </div>
                  {[
                    { key: "page", label: "page.tsx", icon: FileCode2, active: activeTreeFile === "page" },
                    { key: "layout", label: "layout.tsx", icon: LayoutTemplate, active: false },
                    { key: "styles", label: "globals.css", icon: Palette, active: false },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="editor-font flex items-center gap-2 px-3.5 py-1 text-[11px]"
                      style={{
                        color: item.active ? "#7b9ef7" : C.textMuted,
                        background: item.active ? "rgba(61,90,254,0.09)" : "transparent",
                      }}
                    >
                      <item.icon size={12} />
                      {item.label}
                    </div>
                  ))}

                  <div
                    className="editor-font px-3.5 pb-1 pt-3 text-[9.5px] uppercase tracking-[0.1em]"
                    style={{ color: C.textDim }}
                  >
                    api
                  </div>
                  {["rooms.ts", "auth.ts"].map((label) => (
                    <div
                      key={label}
                      className="editor-font flex items-center gap-2 px-6 py-1 text-[11px]"
                      style={{ color: C.textMuted }}
                    >
                      <FileText size={12} />
                      {label}
                    </div>
                  ))}

                  <div
                    className="editor-font px-3.5 pb-1 pt-3 text-[9.5px] uppercase tracking-[0.1em]"
                    style={{ color: C.textDim }}
                  >
                    lib
                  </div>
                  {[
                    { key: "yjs", label: "yjs.ts", active: activeTreeFile === "yjs" },
                    { key: "github", label: "github.ts", active: false },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="editor-font flex items-center gap-2 px-6 py-1 text-[11px]"
                      style={{
                        color: item.active ? "#7b9ef7" : C.textMuted,
                        background: item.active ? "rgba(61,90,254,0.09)" : "transparent",
                      }}
                    >
                      <FileCode2 size={12} />
                      {item.label}
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div
                    className="editor-font px-3.5 pb-2 pt-2 text-[9.5px] uppercase tracking-[0.1em]"
                    style={{ color: C.textDim }}
                  >
                    Source Control
                  </div>
                  <div
                    className="mx-3 mb-3 rounded-[10px] border px-3 py-3 text-center"
                    style={{
                      background: "rgba(61,90,254,0.07)",
                      borderColor: "rgba(61,90,254,0.2)",
                    }}
                  >
                    <div
                      className="editor-font mb-1.5 text-[10px]"
                      style={{ color: "#7b9ef7" }}
                    >
                      Connect GitHub to publish
                    </div>
                    <button
                      type="button"
                      className="ui-font w-full rounded-[7px] py-2 text-[11px] font-bold text-white"
                      style={{ background: C.gradient }}
                    >
                      Connect GitHub
                    </button>
                  </div>

                  <div
                    className="editor-font px-3.5 pb-1 text-[9.5px] uppercase tracking-[0.1em]"
                    style={{ color: C.textDim }}
                  >
                    After connecting
                  </div>
                  {[
                    "Import a repository",
                    "Create repo from room",
                    "Commit changes",
                    "Open a pull request",
                  ].map((step) => (
                    <div
                      key={step}
                      className="editor-font px-3.5 py-1.5 text-[10.5px]"
                      style={{ color: C.textDim }}
                    >
                      {step}
                    </div>
                  ))}
                  <div
                    className="editor-font mx-3 mt-2 inline-flex rounded-md border px-2 py-1 text-[10px]"
                    style={{
                      background: "rgba(74,222,128,0.1)",
                      borderColor: "rgba(74,222,128,0.2)",
                      color: C.green,
                    }}
                  >
                    main
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 overflow-hidden">
              <div
                className="flex h-[30px] items-center bg-[#04080f]"
                style={{ borderBottom: `1px solid ${C.borderDark}` }}
              >
                <div
                  className="editor-font flex h-full items-center gap-1.5 border-r px-3 text-[11px]"
                  style={{
                    borderColor: C.borderDark,
                    background: C.bgDeepest,
                    borderTop: `1.5px solid ${C.primary}`,
                    color: C.textSecondary,
                  }}
                >
                  <FileCode2 size={11} color="#3178C6" />
                  {activeContent.label}
                </div>
              </div>

              <div
                className="ui-font flex h-[28px] items-center justify-between px-4 text-[10px]"
                style={{
                  borderBottom: `1px solid ${C.borderDark}`,
                  color: "#5a7099",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <FolderOpen size={11} color="#7b9ef7" />
                  {activeContent.path.map((segment, index) => (
                    <span key={segment}>
                      {index > 0 ? " / " : ""}
                      <span
                        style={{
                          color:
                            index === activeContent.path.length - 1
                              ? C.textSecondary
                              : "#5a7099",
                        }}
                      >
                        {segment}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5" style={{ color: C.green }}>
                  <CheckCircle2 size={11} />
                  <span>Room synced</span>
                </div>
              </div>

              <div className="relative h-[280px] overflow-hidden bg-[#060c18] px-6 py-5">
                <div
                  className="editor-font text-[12.5px] leading-[1.85]"
                  style={{ color: "#eeffff" }}
                >
                  {activeContent.lines.map((line, index) => (
                    <Line key={`line-${index + 1}`} n={index + 1}>
                      {line}
                      {activeContent.cursorLine === index + 1 ? (
                        <span
                          className="ml-0.5 inline-block h-[13px] w-[2px] animate-pulse align-middle"
                          style={{ background: C.primary }}
                        />
                      ) : null}
                    </Line>
                  ))}
                </div>

                <div
                  className="ui-font absolute right-4 top-4 flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px]"
                  style={{
                    background: "rgba(8,13,24,0.88)",
                    borderColor: C.borderMid,
                    color: C.textBody,
                  }}
                >
                  <Users size={11} color={C.green} />
                  3 collaborators live
                </div>
              </div>
            </div>
          </div>

          <div
            className="editor-font flex items-center bg-[#070c1a]"
            style={{ borderTop: `1px solid ${C.borderDark}` }}
          >
            <button
              onClick={() => setShowActivity((current) => !current)}
              className="flex cursor-pointer items-center gap-1.5 border-r px-5 py-2 text-[11px]"
              style={{
                borderColor: C.borderDark,
                color: showActivity ? "#7b9ef7" : C.textDim,
                background: showActivity ? "rgba(61,90,254,0.06)" : "transparent",
              }}
            >
              Activity Log
            </button>
            <div
              className="flex items-center gap-1.5 border-r px-5 py-2 text-[11px]"
              style={{ borderColor: C.borderDark, color: C.green }}
            >
              <span
                className="inline-block h-[6px] w-[6px] rounded-full"
                style={{ background: C.green }}
              />
              Connected · next-app-room
            </div>
            <div className="ml-auto px-5 py-2 text-[11px]" style={{ color: C.textDim }}>
              Git: <span style={{ color: C.green }}>main</span>
            </div>
          </div>

          {showActivity ? (
            <div
              className="editor-font border-t bg-[#060c18] px-4 py-3 text-[11px]"
              style={{ borderColor: C.borderDark }}
            >
              {ACTIVITY_ROWS.map((row, index) => (
                <div
                  key={`${row.time}-${row.who}-${row.file}`}
                  className="flex items-center gap-3 py-1.5"
                  style={{
                    borderBottom:
                      index === ACTIVITY_ROWS.length - 1
                        ? "none"
                        : "1px solid rgba(21,32,64,0.4)",
                  }}
                >
                  <span style={{ color: C.textDim, width: 44, flexShrink: 0 }}>{row.time}</span>
                  <span style={{ color: "#7b9ef7", width: 60, flexShrink: 0 }}>{row.who}</span>
                  <span style={{ color: C.textMuted }}>{row.what}</span>
                  <span style={{ color: C.green }}>{row.file}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div
            className="editor-font flex items-center justify-between bg-[#070c1a] px-4 py-1.5 text-[10px]"
            style={{
              borderTop: `1px solid ${C.borderDark}`,
              color: C.textDim,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-[5px] w-[5px] rounded-full"
                style={{ background: C.green, boxShadow: `0 0 5px ${C.green}` }}
              />
              Yjs synced · 3 collaborators
            </div>
            <div className="flex items-center gap-4">
              <span style={{ color: "#7b9ef7" }}>TypeScript</span>
              <span>UTF-8</span>
              <span>{activeContent.cursorLine ? "Ln 19, Col 42" : "Ln 10, Col 18"}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  )
}

"use client"

import { motion } from "framer-motion"
import {
  Users, FileCode2, Folder, FolderOpen,
  Terminal, GitBranch,
} from "lucide-react"
import { C, fadeUp, scaleIn } from "./constants"
import { Section } from "./Section"

/* Syntax highlight helpers */
function Line({ n, children }: { n: number; children?: React.ReactNode }) {
  return (
    <div className="flex">
      <span className="w-8 shrink-0 text-right mr-4 select-none" style={{ color: "#3a5080" }}>{n}</span>
      <span>{children}</span>
    </div>
  )
}
function K({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#c792ea" }}>{children}</span>
}
function S({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#c3e88d" }}>{children}</span>
}
function F({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#82aaff" }}>{children}</span>
}
function T({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#ffcb6b" }}>{children}</span>
}

export default function EditorPreviewSection() {
  return (
    <Section
      id="editor-preview"
      className="py-24 md:py-32 px-6"
      style={{ background: C.bgDeep }}
    >
      <div className="max-w-5xl mx-auto">
        <motion.div variants={fadeUp} className="text-center mb-14">
          <span
            className="ui-font text-[12px] font-semibold tracking-[0.2em] uppercase block mb-3"
            style={{ color: C.primary }}
          >
            Editor Preview
          </span>
          <h2 className="ui-font text-3xl md:text-4xl font-bold mb-4" style={{ color: C.textPrimary }}>
            A real IDE in your browser
          </h2>
          <p className="ui-font text-base" style={{ color: C.textMuted }}>
            Full-featured development environment with real-time collaboration built in
          </p>
        </motion.div>

        {/* Mockup */}
        <motion.div
          variants={scaleIn}
          className="rounded-2xl overflow-hidden mx-auto"
          style={{
            border: `1px solid ${C.borderMid}`,
            boxShadow: "0 20px 80px rgba(0,0,0,0.5), 0 0 120px rgba(61,90,254,0.08)",
            maxWidth: 960,
          }}
        >
          {/* Titlebar */}
          <div
            className="flex items-center px-4 h-8.5"
            style={{ background: C.bgSurface, borderBottom: `1px solid ${C.borderDark}` }}
          >
            <div className="flex gap-1.5 mr-4">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
            </div>
            <div className="flex items-center gap-2 ml-2">
              <div className="flex items-center justify-center rounded" style={{ width: 18, height: 18, background: C.gradient }}>
                <span className="text-[7px] font-bold text-white leading-none">IX</span>
              </div>
              <span className="ui-font text-[11px]" style={{ color: C.textMuted }}>
                collab.ts &mdash; IUDEX Editor
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: "#e91e63" }}>A</div>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: C.green }}>B</div>
            </div>
          </div>

          {/* Body */}
          <div className="flex" style={{ height: 340, background: C.bgDeepest }}>
            {/* Activity bar */}
            <div
              className="hidden sm:flex flex-col items-center gap-4 py-3 shrink-0"
              style={{ width: 42, background: "#060b14", borderRight: `1px solid ${C.borderDark}` }}
            >
              <FileCode2 size={18} color={C.primary} />
              <Folder size={18} color="#3a4a62" />
              <Terminal size={18} color="#3a4a62" />
              <Users size={18} color="#3a4a62" />
            </div>

            {/* Sidebar */}
            <div
              className="hidden md:block shrink-0 py-2 overflow-hidden"
              style={{ width: 180, background: "#080d18", borderRight: `1px solid ${C.borderDark}` }}
            >
              <div className="px-3 mb-2">
                <span className="ui-font text-[10px] font-semibold tracking-wider uppercase" style={{ color: "#3a5080" }}>
                  Explorer
                </span>
              </div>
              <div className="editor-font text-[11px] leading-5.5 px-2" style={{ color: C.textMuted }}>
                <div className="flex items-center gap-1" style={{ color: "#7b9ef7" }}>
                  <FolderOpen size={12} /> <span>src</span>
                </div>
                <div className="pl-4 flex items-center gap-1" style={{ color: "#7b9ef7" }}>
                  <FolderOpen size={12} /> <span>components</span>
                </div>
                <div className="pl-8 flex items-center gap-1">
                  <FileCode2 size={11} color="#61DAFB" /> <span>Editor.tsx</span>
                </div>
                <div className="pl-8 flex items-center gap-1">
                  <FileCode2 size={11} color="#61DAFB" /> <span>Sidebar.tsx</span>
                </div>
                <div className="pl-4 flex items-center gap-1" style={{ color: "#7b9ef7" }}>
                  <FolderOpen size={12} /> <span>lib</span>
                </div>
                <div className="pl-8 flex items-center gap-1" style={{ background: "#1e2d4a", borderRadius: 3, padding: "0 4px" }}>
                  <FileCode2 size={11} color="#3178C6" /> <span style={{ color: C.textSecondary }}>collab.ts</span>
                </div>
                <div className="pl-8 flex items-center gap-1">
                  <FileCode2 size={11} color="#3178C6" /> <span>sync.ts</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileCode2 size={11} color="#61DAFB" /> <span>App.tsx</span>
                </div>
              </div>
            </div>

            {/* Code area */}
            <div className="flex-1 overflow-hidden relative">
              {/* Tab bar */}
              <div className="flex h-7.5" style={{ background: "#04080f", borderBottom: `1px solid ${C.borderDark}` }}>
                <div
                  className="flex items-center gap-1.5 px-3 text-[11px] editor-font"
                  style={{ background: C.bgDeepest, borderTop: `1.5px solid ${C.primary}`, color: C.textSecondary }}
                >
                  <FileCode2 size={11} color="#3178C6" /> collab.ts
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 text-[11px] editor-font"
                  style={{ color: "#4a5568" }}
                >
                  <FileCode2 size={11} color="#61DAFB" /> Editor.tsx
                </div>
              </div>

              {/* Code */}
              <pre className="editor-font text-[12px] leading-5 p-4 pr-8 overflow-hidden" style={{ color: "#eeffff" }}>
                <code>
                  <Line n={1}><K>import</K> {"{"} useYjs {"}"} <K>from</K> <S>&quot;./lib/crdt&quot;</S></Line>
                  <Line n={2}><K>import</K> {"{"} useState, useEffect {"}"} <K>from</K> <S>&quot;react&quot;</S></Line>
                  <Line n={3} />
                  <Line n={4}><K>export function</K> <F>CollabEditor</F>{"("}<T>{"{ roomId }"}</T>{") {"}</Line>
                  <Line n={5}>{"  "}<K>const</K> {"{"} doc, provider {"}"} = <F>useYjs</F>(roomId)</Line>
                  <Line n={6}>{"  "}<K>const</K> [users, setUsers] = <F>useState</F>{"<"}<T>User[]</T>{">"}([])</Line>
                  <Line n={7} />
                  <Line n={8}>{"  "}<F>useEffect</F>{"(() => {"}</Line>
                  <Line n={9}>{"    "}provider.awareness.<F>on</F>(<S>&quot;change&quot;</S>, () =&gt; {"{"}</Line>
                  <Line n={10}>{"      "}<F>setUsers</F>(<F>getConnected</F>(provider))</Line>
                  <Line n={11}>{"    "}{"}"}{"}"}{")"}</Line>
                  <Line n={12}>{"  }"}, [provider])</Line>
                  <Line n={13} />
                  <Line n={14}>{"  "}<K>return</K> {"<"}<T>Monaco</T> doc={"{"}doc{"}"} /{">"}</Line>
                  <Line n={15}>{"}"}</Line>
                </code>
              </pre>

              {/* Fake cursor: Alice */}
              <div className="absolute pointer-events-none" style={{ top: 127, left: 230 }}>
                <div className="w-[1.5px] h-4.5 rounded-full animate-pulse" style={{ background: "#e91e63" }} />
                <span
                  className="ui-font text-[9px] px-1 rounded-sm text-white whitespace-nowrap"
                  style={{ background: "#e91e63", position: "relative", top: -1 }}
                >
                  Alice
                </span>
              </div>

              {/* Fake cursor: Bob */}
              <div className="absolute pointer-events-none" style={{ top: 187, left: 310 }}>
                <div className="w-[1.5px] h-4.5 rounded-full animate-pulse" style={{ background: C.green }} />
                <span
                  className="ui-font text-[9px] px-1 rounded-sm text-white whitespace-nowrap"
                  style={{ background: "#16a34a", position: "relative", top: -1 }}
                >
                  Bob
                </span>
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div
            className="flex items-center justify-between px-3 h-5.5 text-[10px] editor-font"
            style={{
              background: "linear-gradient(90deg, #1a237e 0%, #0d1257 100%)",
              borderTop: "1px solid #1a2a6e",
              color: C.textMuted,
            }}
          >
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><GitBranch size={10} /> main</span>
              <span>0 errors</span>
              <span>0 warnings</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Ln 5, Col 38</span>
              <span>TypeScript</span>
              <span>UTF-8</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.green }} />
                2 online
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  )
}

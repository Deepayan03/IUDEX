"use client"

import { motion } from "framer-motion"
import {
  Boxes,
  Github,
  Globe,
  Monitor,
  Wifi,
} from "lucide-react"
import { C, fadeUp } from "@/features/landing/constants"
import { Section } from "@/features/landing/components/Section"

function Pill({
  label,
  color,
}: {
  label: string
  color: string
}) {
  return (
    <span
      className="editor-font inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px]"
      style={{
        background: "rgba(13,21,37,0.8)",
        borderColor: C.borderMid,
        color: C.textMuted,
      }}
    >
      <span
        className="inline-block h-[5px] w-[5px] rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  )
}

const TECH_CARDS = [
  {
    icon: Boxes,
    title: "Yjs CRDT conflict-free by design",
    desc:
      "Each file gets its own Y.Doc while shared room state stays in a meta doc for presence, activity, and file structure. Concurrent edits merge without operational transforms.",
    pills: [
      { label: "Yjs", color: C.green },
      { label: "y-websocket", color: "#7b9ef7" },
      { label: "Monaco binding", color: "#a78bfa" },
    ],
  },
  {
    icon: Monitor,
    title: "Monaco Editor for the real browser IDE feel",
    desc:
      "Full VS Code-style editing with syntax highlighting, language tooling hooks, and collaborative bindings that turn every keystroke into CRDT state instead of diffs.",
    pills: [
      { label: "Monaco Editor", color: "#7b9ef7" },
      { label: "TypeScript", color: C.amber },
      { label: "y-monaco", color: "#a78bfa" },
    ],
  },
  {
    icon: Wifi,
    title: "WebSocket server with room-focused sync",
    desc:
      "One connection handles editor CRDT updates and another carries room metadata like activity, file tree, and presence, keeping the collaborative system responsive under load.",
    pills: [
      { label: "AWS EC2", color: C.amber },
      { label: "y-websocket", color: "#7b9ef7" },
      { label: "Room isolation", color: C.green },
    ],
  },
  {
    icon: Globe,
    title: "Next.js plus Vercel for the application shell",
    desc:
      "The app runs on Next.js App Router with NextAuth powering Google and GitHub sign-in, while the persistent collaborative socket layer lives separately for always-on room state.",
    pills: [
      { label: "Next.js 16", color: "#ffffff" },
      { label: "Vercel", color: C.amber },
      { label: "NextAuth", color: "#7b9ef7" },
      { label: "App Router", color: C.green },
    ],
  },
] as const

export default function FeaturesSection() {
  return (
    <Section
      id="architecture"
      className="px-6 py-24 md:px-12 md:py-28"
      style={{ background: C.bgDeep }}
    >
      <div className="mx-auto max-w-[1060px]">
        <motion.div variants={fadeUp} className="max-w-[560px]">
          <span
            className="ui-font mb-3 block text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: C.primary }}
          >
            Under the hood
          </span>
          <h2
            className="ui-font mb-4 text-[clamp(28px,4vw,40px)] font-extrabold leading-[1.15] tracking-[-0.04em]"
            style={{ color: C.textPrimary }}
          >
            Built on the right stack for real-time systems
          </h2>
          <p
            className="ui-font max-w-[500px] text-[15.5px] leading-[1.65]"
            style={{ color: C.textMuted }}
          >
            No shortcuts. Every architectural decision in iudex was made to
            handle concurrent editing at scale, from CRDT selection to
            WebSocket room state.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {TECH_CARDS.map((card) => (
            <motion.div
              key={card.title}
              variants={fadeUp}
              className="rounded-[18px] border bg-[rgba(10,16,32,0.95)] p-8 transition-all duration-300"
              style={{
                borderColor: C.borderDark,
              }}
              whileHover={{
                y: -3,
                borderColor: "rgba(61,90,254,0.3)",
              }}
            >
              <div
                className="mb-5 flex h-11 w-11 items-center justify-center rounded-[11px]"
                style={{ background: C.gradient }}
              >
                <card.icon size={20} color="#fff" />
              </div>

              <h3
                className="ui-font mb-2 text-[17px] font-bold tracking-[-0.02em]"
                style={{ color: C.textPrimary }}
              >
                {card.title}
              </h3>
              <p
                className="ui-font mb-4 text-[13.5px] leading-[1.65]"
                style={{ color: C.textBody }}
              >
                {card.desc}
              </p>
              <div className="flex flex-wrap gap-2">
                {card.pills.map((pill) => (
                  <Pill key={pill.label} label={pill.label} color={pill.color} />
                ))}
              </div>
            </motion.div>
          ))}

          <motion.div
            variants={fadeUp}
            className="rounded-[18px] border bg-[rgba(10,16,32,0.95)] p-8 md:col-span-2"
            style={{ borderColor: C.borderDark }}
            whileHover={{ y: -3, borderColor: "rgba(61,90,254,0.3)" }}
          >
            <div className="flex flex-wrap gap-10">
              <div className="min-w-[220px] flex-1">
                <div
                  className="mb-5 flex h-11 w-11 items-center justify-center rounded-[11px]"
                  style={{ background: C.gradient }}
                >
                  <Github size={20} color="#fff" />
                </div>
                <h3
                  className="ui-font mb-2 text-[17px] font-bold tracking-[-0.02em]"
                  style={{ color: C.textPrimary }}
                >
                  GitHub SCM gated, not forced
                </h3>
                <p
                  className="ui-font text-[13.5px] leading-[1.65]"
                  style={{ color: C.textBody }}
                >
                  GitHub OAuth is optional at sign-in. The source control
                  sidebar stays locked until a user connects GitHub, then the
                  full import, create repo, commit, and pull request flow
                  unlocks inside the editor.
                </p>
              </div>

              <div className="min-w-[220px] flex-1">
                <div className="ui-font mb-3 text-[12px] font-semibold" style={{ color: C.textMuted }}>
                  SCM Flow
                </div>
                <div className="space-y-2.5">
                  {[
                    { step: "1", text: "Google sign-in gives room access", color: "#7b9ef7" },
                    { step: "2", text: "Open SCM sidebar in locked state", color: "#7b9ef7" },
                    { step: "3", text: "Connect GitHub through popup OAuth", color: "#7b9ef7" },
                    { step: "4", text: "Import, commit, and PR actions unlock", color: C.green },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="editor-font flex items-center gap-2.5 text-[11.5px]"
                      style={{ color: C.textBody }}
                    >
                      <span
                        className="flex h-[22px] w-[22px] items-center justify-center rounded-md border text-[10px]"
                        style={{
                          background:
                            item.color === C.green
                              ? "rgba(74,222,128,0.15)"
                              : "rgba(61,90,254,0.15)",
                          borderColor:
                            item.color === C.green
                              ? "rgba(74,222,128,0.3)"
                              : "rgba(61,90,254,0.3)",
                          color: item.color,
                        }}
                      >
                        {item.step}
                      </span>
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { label: "GitHub OAuth", color: "#ffffff" },
                { label: "Gated SCM flow", color: C.green },
                { label: "Popup auth", color: "#7b9ef7" },
                { label: "Repo import", color: C.amber },
                { label: "Pull requests", color: "#a78bfa" },
              ].map((pill) => (
                <Pill key={pill.label} label={pill.label} color={pill.color} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  )
}

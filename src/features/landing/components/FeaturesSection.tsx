"use client"

import { motion } from "framer-motion"
import { Users, Code2, GitBranch, Zap } from "lucide-react"
import { C, fadeUp } from "@/features/landing/constants"
import { Section } from "@/features/landing/components/Section"

const FEATURES = [
  {
    icon: Users,
    title: "Real-time Collaboration",
    desc: "See cursors, selections, and edits from every collaborator as they happen. Powered by Yjs CRDTs for conflict-free merging.",
    detail: "Zero-conflict merging",
    detailColor: C.green,
  },
  {
    icon: Code2,
    title: "VS Code Experience",
    desc: "Full Monaco editor with syntax highlighting, IntelliSense, file tree, tabs, terminal, and keyboard shortcuts you already know.",
    detail: "100+ languages supported",
    detailColor: C.primary,
  },
  {
    icon: GitBranch,
    title: "GitHub Import",
    desc: "Import any public repository directly into your session. Browse the file tree, lazy-load contents, and start collaborating instantly.",
    detail: "Any public repository",
    detailColor: C.primary,
  },
  {
    icon: Zap,
    title: "Instant Rooms",
    desc: "Create a room, share the link, and start coding together. No setup, no configuration. WebSocket-powered real-time sync.",
    detail: "< 50ms latency",
    detailColor: "#f59e0b",
  },
]

export default function FeaturesSection() {
  return (
    <Section
      id="features"
      className="py-24 md:py-32 px-6"
      style={{ background: C.bgDeep }}
    >
      <div className="max-w-5xl mx-auto">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <span
            className="ui-font text-[12px] font-semibold tracking-[0.2em] uppercase block mb-3"
            style={{ color: C.primary }}
          >
            Features
          </span>
          <h2
            className="ui-font text-3xl md:text-4xl font-bold mb-4"
            style={{ color: C.textPrimary }}
          >
            Everything you need to code collaboratively
          </h2>
          <p className="ui-font text-base" style={{ color: C.textMuted }}>
            Built for developers who ship together
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="rounded-2xl p-8 transition-all duration-300"
              style={{
                background: "linear-gradient(165deg, rgba(13,16,32,0.8), rgba(8,13,24,0.6))",
                border: `1px solid ${C.borderMid}`,
              }}
              whileHover={{
                y: -4,
                boxShadow: "0 0 40px rgba(61,90,254,0.08)",
                borderColor: "rgba(61,90,254,0.3)",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: C.gradient }}
              >
                <f.icon size={22} color="#fff" />
              </div>

              <h3 className="ui-font text-lg font-semibold mb-2" style={{ color: C.textPrimary }}>
                {f.title}
              </h3>
              <p className="ui-font text-[14px] leading-relaxed mb-4" style={{ color: C.textBody }}>
                {f.desc}
              </p>
              <span className="flex items-center gap-2 text-[13px] ui-font" style={{ color: f.detailColor }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: f.detailColor }} />
                {f.detail}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  )
}

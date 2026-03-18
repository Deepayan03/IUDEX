"use client"

import { motion } from "framer-motion"
import { LogIn, Plus, Code2, ChevronRight } from "lucide-react"
import { C, fadeUp } from "@/features/landing/constants"
import { Section } from "@/features/landing/components/Section"

const STEPS = [
  {
    num: "01",
    icon: LogIn,
    title: "Sign In",
    desc: "Sign in with Google in one click. Your identity is used for cursor labels and room ownership.",
  },
  {
    num: "02",
    icon: Plus,
    title: "Create or Join",
    desc: "Create a new room or join an existing one via link. Each room gets a unique URL you can share.",
  },
  {
    num: "03",
    icon: Code2,
    title: "Code Together",
    desc: "Start editing in a full VS Code-like environment. Every keystroke syncs in real-time via CRDTs.",
  },
]

export default function HowItWorksSection() {
  return (
    <Section
      id="how-it-works"
      className="py-24 md:py-32 px-6"
      style={{ background: C.bgDeepest }}
    >
      <div className="max-w-5xl mx-auto">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <span
            className="ui-font text-[12px] font-semibold tracking-[0.2em] uppercase block mb-3"
            style={{ color: C.primary }}
          >
            How it works
          </span>
          <h2
            className="ui-font text-3xl md:text-4xl font-bold mb-4"
            style={{ color: C.textPrimary }}
          >
            Up and running in seconds
          </h2>
          <p className="ui-font text-base" style={{ color: C.textMuted }}>
            No installations. No configuration. Just code.
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row items-stretch gap-6 md:gap-0">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex flex-col md:flex-row items-center flex-1">
              <motion.div
                variants={fadeUp}
                className="rounded-2xl p-8 text-center flex-1"
                style={{ border: `1px solid ${C.borderDark}` }}
              >
                <span
                  className="ui-font text-4xl font-extrabold block mb-4"
                  style={{
                    background: C.gradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {s.num}
                </span>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(61,90,254,0.1)", border: "1px solid rgba(61,90,254,0.2)" }}
                >
                  <s.icon size={22} color={C.primary} />
                </div>
                <h3 className="ui-font text-[16px] font-semibold mb-2" style={{ color: C.textPrimary }}>
                  {s.title}
                </h3>
                <p className="ui-font text-[14px] leading-relaxed" style={{ color: C.textBody }}>
                  {s.desc}
                </p>
              </motion.div>

              {i < STEPS.length - 1 && (
                <motion.div
                  variants={fadeUp}
                  className="hidden md:flex items-center justify-center px-2"
                >
                  <ChevronRight size={20} color={C.primary} style={{ opacity: 0.5 }} />
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

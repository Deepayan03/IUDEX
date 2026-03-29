"use client"

import { motion } from "framer-motion"
import { FolderOpen, GitBranch, LogIn, Users } from "lucide-react"
import { C, fadeUp } from "@/features/landing/constants"
import { Section } from "@/features/landing/components/Section"

const STEPS = [
  {
    num: "01",
    icon: LogIn,
    title: "Sign In",
    desc: "Use Google or GitHub from the branded sign-in screen. Your account powers room access, presence, and ownership.",
    note: "Google or GitHub",
  },
  {
    num: "02",
    icon: FolderOpen,
    title: "Pick a Template",
    desc: "Create from Empty, Starter, Next Basic, or Node Basic, or reopen a room from history when you want to jump back in.",
    note: "4 templates",
  },
  {
    num: "03",
    icon: Users,
    title: "Build Together",
    desc: "Live cursors, search, activity log, and shared tabs keep the whole room in sync while everyone works from the same workspace.",
    note: "Presence · log · search",
  },
  {
    num: "04",
    icon: GitBranch,
    title: "Publish",
    desc: "Connect GitHub when ready. Import, create a repo, commit, or open a PR without ever leaving the editor.",
    note: "Commit · PR",
  },
] as const

export default function HowItWorksSection() {
  return (
    <Section
      id="how-it-works"
      className="px-6 py-24 md:px-12 md:py-32"
      style={{ background: C.bgDeepest }}
    >
      <div className="mx-auto max-w-[1060px]">
        <motion.div variants={fadeUp} className="mx-auto mb-16 max-w-[880px] text-center">
          <span
            className="ui-font mb-3 block text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: C.primary }}
          >
            Workflow
          </span>
          <h2
            className="ui-font mb-5 px-2 pt-2 text-[clamp(38px,6vw,72px)] font-extrabold leading-[1.12] tracking-[-0.055em]"
            style={{ color: C.textPrimary }}
          >
            From sign-in to first commit in minutes
          </h2>
          <p className="ui-font mx-auto max-w-[760px] text-[15.5px] md:text-[17px]" style={{ color: C.textMuted }}>
            Room-first. Template-first. GitHub only when you need it.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4 xl:gap-0">
          {STEPS.map((step) => (
            <div key={step.num} className="px-0 xl:px-5">
              <motion.div
                variants={fadeUp}
                className="flex h-full flex-col items-center text-center"
                style={{
                  position: "relative",
                }}
              >
                <span
                  className="ui-font mb-3 block text-[38px] font-extrabold tracking-[-0.08em]"
                  style={{
                    background: C.gradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {step.num}
                </span>
                <div
                  className="mb-4 flex h-[54px] w-[54px] items-center justify-center rounded-[14px]"
                  style={{
                    background: "rgba(61,90,254,0.1)",
                    border: "1px solid rgba(61,90,254,0.18)",
                  }}
                >
                  <step.icon size={22} color={C.primary} />
                </div>
                <h3
                  className="ui-font mb-2 text-[15px] font-bold"
                  style={{ color: C.textPrimary }}
                >
                  {step.title}
                </h3>
                <p
                  className="ui-font mb-3 text-[12.5px] leading-[1.6]"
                  style={{ color: C.textBody }}
                >
                  {step.desc}
                </p>
                <span
                  className="ui-font text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "#7b9ef7" }}
                >
                  {step.note}
                </span>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

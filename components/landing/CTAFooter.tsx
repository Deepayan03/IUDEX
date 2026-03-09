"use client"

import { motion } from "framer-motion"
import { useSession, signIn } from "next-auth/react"
import { ArrowRight } from "lucide-react"
import { C, fadeUp } from "./constants"
import { Section } from "./Section"

export default function CTAFooter() {
  const { data: session } = useSession()

  const handleStart = () => {
    if (session) {
      window.location.href = "/rooms"
    } else {
      signIn("google", { callbackUrl: "/rooms" })
    }
  }

  return (
    <Section
      className="py-24 md:py-32 px-6"
      style={{ background: C.bgDeepest }}
    >
      <div className="max-w-2xl mx-auto">
        {/* CTA block */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl p-px mb-20"
          style={{ background: C.gradient }}
        >
          <div
            className="rounded-[15px] text-center py-14 px-8"
            style={{ background: C.bgDeepest }}
          >
            <h2
              className="ui-font text-2xl md:text-3xl font-bold mb-4"
              style={{ color: C.textPrimary }}
            >
              Ready to code together?
            </h2>
            <p className="ui-font text-[15px] mb-8" style={{ color: C.textBody }}>
              Create a free room and invite your team in seconds.
            </p>
            <motion.button
              onClick={handleStart}
              className="ui-font text-[15px] font-semibold px-8 py-3.5 rounded-xl text-white inline-flex items-center gap-2 cursor-pointer"
              style={{
                background: C.gradient,
                boxShadow: "0 0 30px rgba(61,90,254,0.3)",
              }}
              whileHover={{ scale: 1.03, boxShadow: "0 0 50px rgba(61,90,254,0.5)" }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started Free <ArrowRight size={16} />
            </motion.button>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.footer
          variants={fadeUp}
          className="pt-10 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ borderTop: `1px solid ${C.borderDark}` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center rounded-md"
              style={{ width: 22, height: 22, background: C.gradient }}
            >
              <span className="ui-font text-[8px] font-bold text-white leading-none">IX</span>
            </div>
            <span className="ui-font text-[13px] font-semibold" style={{ color: C.textMuted }}>
              IUDEX
            </span>
            <span className="ui-font text-[11px]" style={{ color: C.textDim }}>
              &copy; 2026
            </span>
          </div>

          <div className="flex items-center gap-6">
            {[
              { label: "GitHub", href: "https://github.com/Deepayan03/IUDEX" },
              { label: "Features", href: "#features" },
              { label: "How it Works", href: "#how-it-works" },
            ].map(l => (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="ui-font text-[12px] transition-colors duration-200 hover:text-white"
                style={{ color: C.textMuted }}
              >
                {l.label}
              </a>
            ))}
          </div>

          <span className="editor-font text-[11px]" style={{ color: "#3a5080" }}>
            Built with Next.js, Yjs &amp; Monaco
          </span>
        </motion.footer>
      </div>
    </Section>
  )
}

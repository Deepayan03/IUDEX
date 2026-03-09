"use client"

import { motion } from "framer-motion"
import { useSession, signIn } from "next-auth/react"
import { ArrowRight, ExternalLink } from "lucide-react"
import { C, stagger, fadeUp } from "./constants"

export default function HeroSection() {
  const { data: session } = useSession()

  const handleStart = () => {
    if (session) {
      window.location.href = "/rooms"
    } else {
      signIn("google", { callbackUrl: "/rooms" })
    }
  }

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-15"
      style={{ background: C.bgDeepest }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(61,90,254,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Static gradient orbs (no animation = no repaints) */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600, height: 600, top: "-10%", right: "-10%",
          background: "radial-gradient(circle, rgba(61,90,254,0.12), transparent 70%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 500, height: 500, bottom: "-5%", left: "-8%",
          background: "radial-gradient(circle, rgba(101,31,255,0.10), transparent 70%)",
        }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 text-center px-6 max-w-3xl mx-auto"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div variants={fadeUp} className="flex justify-center mb-8">
          <span
            className="ui-font inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px]"
            style={{
              background: "rgba(61,90,254,0.1)",
              border: "1px solid rgba(61,90,254,0.3)",
              color: "#7b9ef7",
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: C.green, boxShadow: `0 0 6px ${C.green}` }}
            />
            CRDT-Powered Collaboration
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="ui-font text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] mb-6"
          style={{ color: C.textPrimary }}
        >
          Code{" "}
          <span
            style={{
              background: C.gradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Together.
          </span>
          <br />
          In Real Time.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          className="ui-font text-base sm:text-lg mx-auto max-w-xl mb-10"
          style={{ color: C.textBody }}
        >
          A VS Code-like collaborative editor powered by CRDTs. Create a room,
          share the link, and start building together — no setup required.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <motion.button
            onClick={handleStart}
            className="ui-font text-[15px] font-semibold px-8 py-3.5 rounded-xl text-white flex items-center gap-2 cursor-pointer"
            style={{
              background: C.gradient,
              boxShadow: "0 0 30px rgba(61,90,254,0.3)",
            }}
            whileHover={{ scale: 1.03, boxShadow: "0 0 50px rgba(61,90,254,0.5)" }}
            whileTap={{ scale: 0.98 }}
          >
            Start Coding <ArrowRight size={16} />
          </motion.button>

          <motion.a
            href="https://github.com/Deepayan03/IUDEX"
            target="_blank"
            rel="noopener noreferrer"
            className="ui-font text-[15px] font-semibold px-8 py-3.5 rounded-xl flex items-center gap-2 transition-colors duration-200"
            style={{ border: `1px solid ${C.borderMid}`, color: C.textMuted }}
            whileHover={{ borderColor: C.primary, color: "#fff" }}
            whileTap={{ scale: 0.98 }}
          >
            View on GitHub <ExternalLink size={15} />
          </motion.a>
        </motion.div>

        {/* Tech badges */}
        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
          {["Yjs / CRDT", "Monaco Editor", "WebSocket", "Next.js"].map(t => (
            <span
              key={t}
              className="editor-font text-[11px] px-3 py-1 rounded-full"
              style={{
                background: "rgba(13,21,37,0.8)",
                border: `1px solid ${C.borderMid}`,
                color: C.textDim,
              }}
            >
              {t}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}

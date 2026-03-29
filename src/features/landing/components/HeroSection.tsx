"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ArrowRight, Github } from "lucide-react"
import { C, stagger, fadeUp } from "@/features/landing/constants"

type ProviderId = "google" | "github"

const HIGHLIGHTS = [
  {
    title: "4 Templates",
    description:
      "Empty, Starter, Next Basic, Node Basic. Skip setup and start building.",
  },
  {
    title: "Live CRDT Sync",
    description:
      "Yjs keeps every cursor and keystroke in sync with sub-100ms latency.",
  },
  {
    title: "GitHub Built-in",
    description:
      "Import, create repo, commit, or PR directly from the editor sidebar.",
  },
] as const

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.8-5.5 3.8-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.9 2.9 14.7 2 12 2 6.9 2 2.8 6.3 2.8 11.7S6.9 21.4 12 21.4c6.1 0 9.1-4.3 9.1-6.5 0-.4 0-.7-.1-1H12Z"
      />
      <path
        fill="#34A853"
        d="M2.8 11.7c0 1.7.6 3.2 1.6 4.4l3-2.3c-.4-.6-.7-1.3-.7-2.1s.2-1.5.7-2.1l-3-2.3c-1 1.2-1.6 2.8-1.6 4.4Z"
      />
      <path
        fill="#4A90E2"
        d="M12 21.4c2.7 0 4.9-.9 6.5-2.4l-3.1-2.4c-.8.6-1.9 1-3.4 1-2.5 0-4.6-1.7-5.4-4l-3.1 2.3c1.6 3.2 4.8 5.5 9 5.5Z"
      />
      <path
        fill="#FBBC05"
        d="M6.6 13.6c-.2-.6-.4-1.2-.4-1.9s.1-1.3.4-1.9l-3.1-2.3C2.9 8.6 2.8 10.1 2.8 11.7s.1 3.1.7 4.2l3.1-2.3Z"
      />
    </svg>
  )
}

export default function HeroSection() {
  const { data: session } = useSession()
  const router = useRouter()
  const [pendingProvider, setPendingProvider] = useState<ProviderId | null>(null)

  const handleProviderSignIn = (provider: ProviderId) => {
    setPendingProvider(provider)
    void signIn(provider, { callbackUrl: "/rooms" })
  }

  return (
    <section
      id="hero"
      className="relative flex min-h-[calc(100vh-62px)] items-center justify-center overflow-hidden px-6 pb-24 pt-20 md:px-12 md:pb-28 md:pt-24"
      style={{ background: C.bgDeepest }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(61,90,254,0.06) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage:
            "radial-gradient(ellipse 85% 90% at 50% 40%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 90% at 50% 40%, black 30%, transparent 100%)",
        }}
      />

      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 720,
          height: 720,
          top: "-18%",
          right: "-10%",
          background: "radial-gradient(circle, rgba(61,90,254,0.13), transparent 68%)",
        }}
        animate={{ scale: [1, 1.08, 1], x: [0, 10, 0], y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 580,
          height: 580,
          bottom: "-12%",
          left: "-8%",
          background: "radial-gradient(circle, rgba(101,31,255,0.1), transparent 68%)",
        }}
        animate={{ scale: [1, 1.08, 1], x: [0, -10, 0], y: [0, 10, 0] }}
        transition={{
          duration: 9,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
          delay: 3,
        }}
      />

      <motion.div
        className="relative z-10 mx-auto w-full max-w-[820px] text-center"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="mb-8 flex justify-center md:mb-10">
          <span
            className="ui-font inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-semibold tracking-[0.04em] md:text-[13px]"
            style={{
              background: "rgba(61,90,254,0.1)",
              borderColor: "rgba(61,90,254,0.28)",
              color: "#7b9ef7",
            }}
          >
            <span
              className="h-[7px] w-[7px] rounded-full animate-pulse"
              style={{ background: C.green, boxShadow: `0 0 8px ${C.green}` }}
            />
            Real-time collaboration · Yjs CRDT · GitHub native
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="ui-font mb-6 text-[clamp(44px,7.5vw,82px)] font-extrabold leading-[1.04] tracking-[-0.05em] text-white md:mb-7"
        >
          Code together.
          <br />
          <span
            style={{
              background: C.gradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Ship without friction.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="ui-font mx-auto mb-10 max-w-[560px] text-[16px] leading-[1.72] md:mb-11 md:text-[17px]"
          style={{ color: C.textPrimary }}
        >
          iudex is a shared coding workspace with live editing, room templates,
          activity logs, and GitHub source control built for teams that move fast.
        </motion.p>

        {session ? (
          <motion.div
            variants={fadeUp}
            className="mx-auto mb-14 max-w-[380px] rounded-[20px] border px-7 pb-6 pt-7"
            style={{
              background: "rgba(10,16,32,0.9)",
              borderColor: C.borderMid,
              boxShadow: "0 0 0 1px rgba(61,90,254,0.08), 0 32px 64px rgba(0,0,0,0.5)",
            }}
          >
            <div className="ui-font mb-4 text-[14px] font-semibold" style={{ color: C.textMuted }}>
              Your account is ready
            </div>
            <button
              onClick={() => router.push("/rooms")}
              className="ui-font flex w-full cursor-pointer items-center justify-center gap-2 rounded-[11px] px-4 py-3 text-[14px] font-semibold text-white"
              style={{
                background: C.gradient,
                boxShadow: "0 0 24px rgba(61,90,254,0.25)",
              }}
            >
              Open My Rooms
              <ArrowRight size={16} />
            </button>
            <p className="ui-font mt-4 text-center text-[11px] leading-6" style={{ color: C.textDim }}>
              Reopen a room, invite collaborators, and publish through GitHub when you are ready.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={fadeUp}
            className="mx-auto mb-14 max-w-[380px] rounded-[20px] border px-7 pb-6 pt-7"
            style={{
              background: "rgba(10,16,32,0.9)",
              borderColor: C.borderMid,
              boxShadow: "0 0 0 1px rgba(61,90,254,0.08), 0 32px 64px rgba(0,0,0,0.5)",
            }}
          >
            <div className="ui-font mb-4 text-[14px] font-semibold" style={{ color: C.textMuted }}>
              Sign in to open your rooms
            </div>

            <button
              onClick={() => handleProviderSignIn("google")}
              disabled={!!pendingProvider}
              className="ui-font mb-2 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[11px] border px-4 py-3 text-[14px] font-semibold transition-colors duration-200 disabled:cursor-wait"
              style={{
                borderColor: C.borderMid,
                background: "rgba(13,21,37,0.8)",
                color: C.textBody,
              }}
            >
              <GoogleIcon />
              {pendingProvider === "google" ? "Redirecting..." : "Continue with Google"}
            </button>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: C.borderMid }} />
              <div className="ui-font text-[11px] font-medium tracking-[0.08em]" style={{ color: C.textDim }}>
                OR
              </div>
              <div className="h-px flex-1" style={{ background: C.borderMid }} />
            </div>

            <button
              onClick={() => handleProviderSignIn("github")}
              disabled={!!pendingProvider}
              className="ui-font flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[11px] border px-4 py-3 text-[14px] font-semibold transition-colors duration-200 disabled:cursor-wait"
              style={{
                borderColor: C.borderMid,
                background: "rgba(13,21,37,0.8)",
                color: C.textBody,
              }}
            >
              <Github size={18} />
              {pendingProvider === "github" ? "Redirecting..." : "Continue with GitHub"}
            </button>

            <p className="ui-font mt-4 text-center text-[11px] leading-6" style={{ color: C.textDim }}>
              GitHub only becomes required when you use{" "}
              <span style={{ color: C.textMuted }}>source control features</span>.
              <br />
              Your rooms are tied to your account.
            </p>
          </motion.div>
        )}

        <motion.div
          variants={fadeUp}
          className="mx-auto grid max-w-[760px] gap-2.5 text-left md:grid-cols-3"
        >
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.title}
              className="rounded-[14px] px-5 py-[18px]"
              style={{
                background: "rgba(8,13,24,0.85)",
                border: `1px solid ${C.borderDark}`,
              }}
            >
              <p
                className="ui-font mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: "#7b9ef7" }}
              >
                {item.title}
              </p>
              <p
                className="ui-font text-[12.5px] leading-[1.6]"
                style={{ color: C.textBody }}
              >
                {item.description}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}

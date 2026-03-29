"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { signIn, signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ArrowRight, Github } from "lucide-react"
import { C, fadeUp } from "@/features/landing/constants"
import { Section } from "@/features/landing/components/Section"

type ProviderId = "google" | "github"

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
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

export default function CTAFooter() {
  const { data: session } = useSession()
  const router = useRouter()
  const [pendingProvider, setPendingProvider] = useState<ProviderId | null>(null)

  const handleProviderSignIn = (provider: ProviderId) => {
    setPendingProvider(provider)
    void signIn(provider, { callbackUrl: "/rooms" })
  }

  return (
    <Section
      className="px-6 pb-12 pt-24 md:px-12 md:pb-14 md:pt-32"
      style={{ background: C.bgDeep }}
    >
      <div className="max-w-2xl mx-auto">
        <motion.div
          variants={fadeUp}
          className="mb-20 rounded-[24px] p-px"
          style={{ background: C.gradient }}
        >
          <div
            className="rounded-[22px] px-8 py-16 text-center sm:px-11 sm:py-[72px]"
            style={{ background: C.bgDeep }}
          >
            <h2
              className="ui-font mx-auto mb-4 max-w-[700px] px-2 pt-2 text-[clamp(30px,4.3vw,54px)] font-extrabold leading-[1.12] tracking-[-0.055em]"
              style={{ color: C.textPrimary }}
            >
              Open your first room
            </h2>
            <p
              className="ui-font mx-auto mb-10 max-w-[1120px] text-[15px] leading-[1.7] md:text-[17px]"
              style={{ color: C.textBody }}
            >
              Pick a template, invite your team, and push to GitHub when you are
              ready. Everything else stays out of your way.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {session ? (
                <>
                  <button
                    onClick={() => router.push("/rooms")}
                    className="ui-font inline-flex cursor-pointer items-center gap-2 rounded-[10px] px-6 py-3 text-[14px] font-bold text-white"
                    style={{
                      background: C.gradient,
                      boxShadow: "0 0 24px rgba(61,90,254,0.25)",
                    }}
                  >
                    Go to My Rooms
                    <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => void signOut({ callbackUrl: "/" })}
                    className="ui-font cursor-pointer rounded-[10px] border px-6 py-3 text-[14px] font-semibold"
                    style={{
                      borderColor: C.borderMid,
                      color: C.textMuted,
                      background: "transparent",
                    }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleProviderSignIn("github")}
                    disabled={!!pendingProvider}
                    className="ui-font inline-flex cursor-pointer items-center gap-2 rounded-[10px] px-6 py-3 text-[14px] font-bold text-white disabled:cursor-wait"
                    style={{
                      background: C.gradient,
                      boxShadow: "0 0 24px rgba(61,90,254,0.25)",
                    }}
                  >
                    <Github size={16} />
                    {pendingProvider === "github" ? "Redirecting..." : "Sign in with GitHub"}
                  </button>
                  <button
                    onClick={() => handleProviderSignIn("google")}
                    disabled={!!pendingProvider}
                    className="ui-font inline-flex cursor-pointer items-center gap-2 rounded-[10px] border px-6 py-3 text-[14px] font-semibold disabled:cursor-wait"
                    style={{
                      borderColor: C.borderMid,
                      color: C.textMuted,
                      background: "transparent",
                    }}
                  >
                    <GoogleIcon />
                    {pendingProvider === "google" ? "Redirecting..." : "Sign in with Google"}
                  </button>
                </>
              )}
            </div>

            <p className="ui-font mt-4 text-[11.5px]" style={{ color: C.textDim }}>
              GitHub only required for source control · Your rooms are private to your account
            </p>
          </div>
        </motion.div>
      </div>

      <motion.footer
        variants={fadeUp}
        className="mx-auto mt-6 flex w-full max-w-[1280px] flex-col gap-6 border-t pt-10 lg:flex-row lg:items-center lg:justify-between"
        style={{ borderColor: C.borderDark }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-[8px]"
            style={{ width: 26, height: 26, background: C.gradient }}
          >
            <span className="ui-font text-[10px] font-bold text-white leading-none">
              IX
            </span>
          </div>
          <span
            className="ui-font text-[13px] font-bold"
            style={{ color: C.textMuted }}
          >
            IUDEX
          </span>
          <span className="ui-font text-[11px]" style={{ color: C.textDim }}>
            &copy; 2026
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 lg:justify-center">
          {[
            { label: "GitHub", href: "https://github.com/Deepayan03/IUDEX" },
            { label: "Tech Stack", href: "#architecture" },
            { label: "How it works", href: "#how-it-works" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="ui-font text-[12px] transition-colors duration-200 hover:text-white"
              style={{ color: C.textMuted }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <span className="editor-font text-[11px] lg:text-right" style={{ color: "#3a5080" }}>
          Next.js · Yjs · Monaco · AWS EC2 · Vercel
        </span>
      </motion.footer>
    </Section>
  )
}

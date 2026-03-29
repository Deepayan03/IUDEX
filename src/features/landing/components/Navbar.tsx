"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { signIn, signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { ArrowRight, Github } from "lucide-react"
import { C } from "@/features/landing/constants"
import ConfirmActionModal from "@/shared/components/ConfirmActionModal"

type ProviderId = "google" | "github"

export default function Navbar() {
  const { data: session } = useSession()
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false)
  const [pendingProvider, setPendingProvider] = useState<ProviderId | null>(null)

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Tech", href: "#architecture" },
    { label: "How it works", href: "#how-it-works" },
  ] as const

  const handleProviderSignIn = (provider: ProviderId) => {
    setPendingProvider(provider)
    void signIn(provider, { callbackUrl: "/rooms" })
  }

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 30 }}
        className="sticky top-0 inset-x-0 z-50 flex h-[62px] items-center justify-between px-6 md:px-12"
        style={{
          background: "rgba(6,12,24,0.88)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(21,32,64,0.55)",
        }}
      >
        <a href="#hero" className="flex items-center gap-2.5 no-underline">
          <div
            className="flex items-center justify-center rounded-[8px]"
            style={{ width: 30, height: 30, background: C.gradient }}
          >
            <span className="ui-font text-[11px] font-extrabold leading-none tracking-tight text-white">
              IX
            </span>
          </div>
          <span className="ui-font text-[15px] font-extrabold tracking-tight text-white">
            IUDEX
          </span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="ui-font text-[13px] font-medium transition-colors duration-200 hover:text-white"
              style={{ color: C.textMuted }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          {session ? (
            <>
              <button
                onClick={() => setIsSignOutModalOpen(true)}
                className="ui-font cursor-pointer rounded-[9px] border px-3 py-2 text-[12px] font-semibold transition-colors duration-200 sm:px-4 sm:text-[13px]"
                style={{
                  borderColor: C.borderMid,
                  color: C.textMuted,
                  background: "transparent",
                }}
              >
                Sign out
              </button>

              <Link
                href="/rooms"
                className="ui-font flex items-center gap-1.5 rounded-[9px] px-3 py-2 text-[12px] font-bold text-white sm:px-4 sm:text-[13px]"
                style={{
                  background: C.gradient,
                  boxShadow: "0 0 24px rgba(61,90,254,0.25)",
                }}
              >
                My Rooms
                <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={() => handleProviderSignIn("google")}
                disabled={!!pendingProvider}
                className="ui-font cursor-pointer rounded-[9px] border px-3 py-2 text-[12px] font-semibold transition-colors duration-200 disabled:cursor-wait sm:px-4 sm:text-[13px]"
                style={{
                  borderColor: C.borderMid,
                  color: C.textMuted,
                  background: "transparent",
                }}
              >
                <span className="hidden sm:inline">
                  {pendingProvider === "google" ? "Redirecting..." : "Sign in with Google"}
                </span>
                <span className="sm:hidden">
                  {pendingProvider === "google" ? "..." : "Google"}
                </span>
              </button>

              <button
                onClick={() => handleProviderSignIn("github")}
                disabled={!!pendingProvider}
                className="ui-font flex cursor-pointer items-center gap-1.5 rounded-[9px] px-3 py-2 text-[12px] font-bold text-white disabled:cursor-wait sm:px-4 sm:text-[13px]"
                style={{
                  background: C.gradient,
                  boxShadow: "0 0 24px rgba(61,90,254,0.25)",
                }}
              >
                <span className="hidden sm:inline">
                  {pendingProvider === "github" ? "Redirecting..." : "Sign in with GitHub"}
                </span>
                <span className="sm:hidden">
                  {pendingProvider === "github" ? "..." : "GitHub"}
                </span>
                <Github size={14} />
              </button>
            </>
          )}
        </div>
      </motion.nav>

      {isSignOutModalOpen && (
        <ConfirmActionModal
          title="Sign out of IUDEX?"
          description="You will be signed out on this device and will need to sign in again to reopen rooms or publish to GitHub."
          confirmLabel="Sign out"
          note="Your rooms stay available in your account history. This only ends the current session."
          onCancel={() => setIsSignOutModalOpen(false)}
          onConfirm={() => {
            setIsSignOutModalOpen(false)
            void signOut({ callbackUrl: "/" })
          }}
        />
      )}
    </>
  )
}

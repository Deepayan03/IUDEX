"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { getProviders, signIn, useSession } from "next-auth/react"
import type { ClientSafeProvider } from "next-auth/react"
import { AlertCircle, ArrowLeft, Github, Loader2 } from "lucide-react"
import { C } from "@/features/landing/constants"

const PROVIDER_ORDER = ["google", "github"] as const

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

function getErrorMessage(error: string | null): string | null {
  if (!error) return null

  const messages: Record<string, string> = {
    OAuthAccountNotLinked:
      "That email is already linked to another provider. Sign in with the original account you used first.",
    AccessDenied:
      "Access was denied. Try again or choose a different account.",
    Configuration:
      "Authentication is not fully configured yet. Check the provider credentials and callback URLs.",
    Verification:
      "This sign-in request is no longer valid. Please try again.",
    Default:
      "Sign in did not complete. Please try again with a different account.",
  }

  return messages[error] ?? messages.Default
}

function getProviderLabel(provider: ClientSafeProvider): string {
  if (provider.id === "google") return "Sign in with Google"
  if (provider.id === "github") return "Sign in with GitHub"
  return `Sign in with ${provider.name}`
}

function getProviderIcon(providerId: string) {
  if (providerId === "google") {
    return <GoogleIcon />
  }

  if (providerId === "github") {
    return <Github size={18} />
  }

  return null
}

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const [providers, setProviders] = useState<ClientSafeProvider[]>([])
  const [isLoadingProviders, setIsLoadingProviders] = useState(true)
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null)

  const callbackUrl = searchParams.get("callbackUrl") || "/rooms"
  const errorMessage = getErrorMessage(searchParams.get("error"))

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl)
    }
  }, [callbackUrl, router, status])

  useEffect(() => {
    let cancelled = false

    async function loadProviders() {
      try {
        const nextProviders = await getProviders()
        if (cancelled) return

        const ordered = PROVIDER_ORDER.flatMap((providerId) => {
          const provider = nextProviders?.[providerId]
          return provider ? [provider] : []
        })

        setProviders(ordered)
      } finally {
        if (!cancelled) {
          setIsLoadingProviders(false)
        }
      }
    }

    void loadProviders()

    return () => {
      cancelled = true
    }
  }, [])

  const subtitle = useMemo(() => {
    if (providers.length > 1) {
      return "Choose how you want to enter IUDEX."
    }

    return "Use your account to continue into the editor."
  }, [providers.length])

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-10"
      style={{ background: C.bgDeepest }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(61,90,254,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 640,
          height: 640,
          top: "-14%",
          right: "-10%",
          background: "radial-gradient(circle, rgba(61,90,254,0.12), transparent 70%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 520,
          height: 520,
          bottom: "-10%",
          left: "-8%",
          background: "radial-gradient(circle, rgba(101,31,255,0.1), transparent 70%)",
        }}
      />

      <section
        className="relative z-10 w-full max-w-md rounded-[28px] p-6 sm:p-7"
        style={{
          background: "rgba(8,13,24,0.92)",
          border: `1px solid ${C.borderMid}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13px] ui-font mb-6 transition-colors hover:text-white"
          style={{ color: C.textMuted }}
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>

        <div className="mb-7">
          <div
            className="mb-4 inline-flex items-center justify-center rounded-xl"
            style={{ width: 44, height: 44, background: C.gradient }}
          >
            <span className="ui-font text-sm font-bold text-white">IX</span>
          </div>

          <h1
            className="ui-font text-[30px] font-extrabold tracking-tight mb-2"
            style={{ color: C.textPrimary }}
          >
            Sign in to IUDEX
          </h1>
          <p className="ui-font text-[15px]" style={{ color: C.textBody }}>
            {subtitle}
          </p>
        </div>

        {errorMessage && (
          <div
            className="mb-5 flex items-start gap-3 rounded-2xl px-4 py-3.5"
            style={{
              background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.24)",
              color: "#fecaca",
            }}
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="ui-font text-[13px] leading-6">{errorMessage}</p>
          </div>
        )}

        <div className="space-y-3">
          {isLoadingProviders ? (
            <div
              className="flex items-center justify-center gap-3 rounded-2xl px-4 py-5"
              style={{
                background: "rgba(13,17,23,0.92)",
                border: `1px solid ${C.borderMid}`,
                color: C.textMuted,
              }}
            >
              <Loader2 size={18} className="animate-spin" />
              <span className="ui-font text-[14px]">Loading sign-in options...</span>
            </div>
          ) : null}

          {!isLoadingProviders && providers.length === 0 ? (
            <div
              className="rounded-2xl px-4 py-5"
              style={{
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.2)",
                color: "#fecaca",
              }}
            >
              <p className="ui-font text-[13px] leading-6">
                No sign-in providers are configured right now. Check your auth environment variables and try again.
              </p>
            </div>
          ) : null}

          {providers.map((provider) => {
            const isActive = activeProviderId === provider.id

            return (
              <button
                key={provider.id}
                onClick={() => {
                  setActiveProviderId(provider.id)
                  void signIn(provider.id, { callbackUrl })
                }}
                disabled={!!activeProviderId}
                className="w-full rounded-2xl px-5 py-4 text-left transition-all duration-200 cursor-pointer disabled:cursor-wait"
                style={{
                  background:
                    provider.id === "google"
                      ? "#f8fafc"
                      : "rgba(39,44,52,0.95)",
                  border:
                    provider.id === "google"
                      ? "1px solid rgba(255,255,255,0.9)"
                      : `1px solid ${C.borderMid}`,
                  color: provider.id === "google" ? "#0f172a" : C.textPrimary,
                  opacity: activeProviderId && !isActive ? 0.55 : 1,
                  boxShadow:
                    provider.id === "google"
                      ? "0 8px 24px rgba(255,255,255,0.08)"
                      : "none",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background:
                        provider.id === "google"
                          ? "rgba(255,255,255,0.92)"
                          : "rgba(13,17,23,0.75)",
                      border:
                        provider.id === "google"
                          ? "1px solid rgba(148,163,184,0.28)"
                          : `1px solid ${C.borderDark}`,
                      color: provider.id === "google" ? "#0f172a" : C.textPrimary,
                    }}
                  >
                    {isActive ? <Loader2 size={18} className="animate-spin" /> : getProviderIcon(provider.id)}
                  </div>

                  <div className="min-w-0">
                    <div className="ui-font text-[17px] font-semibold">
                      {getProviderLabel(provider)}
                    </div>
                    <div
                      className="ui-font text-[13px] mt-1"
                      style={{
                        color:
                          provider.id === "google"
                            ? "#475569"
                            : C.textMuted,
                      }}
                    >
                      {provider.id === "google"
                        ? "Continue with your Google account"
                        : "Use GitHub for your app session and repo actions"}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}

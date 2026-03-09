"use client"

import { motion } from "framer-motion"
import { useSession, signIn } from "next-auth/react"
import { ArrowRight, LogIn } from "lucide-react"
import { C } from "./constants"

export default function Navbar() {
  const { data: session } = useSession()

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 h-15"
      style={{
        background: "rgba(6,12,24,0.82)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(21,32,64,0.5)",
      }}
    >
      <a href="#hero" className="flex items-center gap-2.5">
        <div
          className="flex items-center justify-center rounded-md"
          style={{ width: 28, height: 28, background: C.gradient }}
        >
          <span className="ui-font text-[11px] font-bold text-white leading-none tracking-tight">IX</span>
        </div>
        <span className="ui-font text-[15px] font-bold text-white tracking-tight">IUDEX</span>
      </a>

      <div className="hidden md:flex items-center gap-8">
        {["Features", "How it Works", "Editor Preview"].map(l => (
          <a
            key={l}
            href={`#${l.toLowerCase().replace(/\s+/g, "-")}`}
            className="ui-font text-[13px] transition-colors duration-200 hover:text-white"
            style={{ color: C.textMuted }}
          >
            {l}
          </a>
        ))}
      </div>

      <div>
        {session ? (
          <a
            href="/rooms"
            className="ui-font text-[13px] font-semibold px-4 py-2 rounded-lg text-white flex items-center gap-2"
            style={{ background: C.gradient }}
          >
            My Rooms <ArrowRight size={14} />
          </a>
        ) : (
          <button
            onClick={() => signIn("google", { callbackUrl: "/rooms" })}
            className="ui-font text-[13px] font-semibold px-4 py-2 rounded-lg text-white flex items-center gap-2 cursor-pointer"
            style={{ background: C.gradient }}
          >
            Sign in <LogIn size={14} />
          </button>
        )}
      </div>
    </motion.nav>
  )
}

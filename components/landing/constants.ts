import type { Variants } from "framer-motion"

/* ─── Design Tokens ───────────────────────────────────────────────────────── */

export const C = {
  bgDeepest: "#060c18",
  bgDeep:    "#080d18",
  bgMid:     "#0a1020",
  bgSurface: "#0d1117",

  primary:   "#3d5afe",
  secondary: "#651fff",
  gradient:  "linear-gradient(135deg, #3d5afe 0%, #651fff 100%)",

  textPrimary:   "#ffffff",
  textSecondary: "#e2e8f0",
  textBody:      "#c8d6e5",
  textMuted:     "#8899b0",
  textDim:       "#5a7099",

  borderDark: "#0d1525",
  borderMid:  "#152040",

  green: "#4ade80",
} as const

/* ─── Framer Motion Variants ──────────────────────────────────────────────── */

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}

export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
}

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.95, y: 30 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: "spring", stiffness: 200, damping: 25 },
  },
}

"use client"

import { motion } from "framer-motion"
import { C, fadeUp } from "@/features/landing/constants"
import { Section } from "@/features/landing/components/Section"

const STATS = [
  { value: "4", label: "Room templates" },
  { value: "<100", unit: "ms", label: "CRDT sync latency" },
  { value: "2", label: "WS channels per room" },
  { value: "AWS", label: "Realtime hosted on EC2" },
] as const

export default function StatsSection() {
  return (
    <Section
      className="border-y px-6 py-16 md:px-12 md:py-20"
      style={{
        background: "rgba(61,90,254,0.05)",
        borderColor: C.borderMid,
      }}
    >
      <div className="mx-auto grid max-w-[1280px] gap-y-10 text-center md:grid-cols-2 md:gap-x-12 xl:grid-cols-4 xl:gap-x-20">
        {STATS.map((stat) => (
          <motion.div key={stat.label} variants={fadeUp} className="px-4 xl:px-6">
            <div
              className="ui-font inline-flex min-h-[88px] flex-col items-center justify-start pt-2 md:min-h-[100px]"
            >
              <span
                className="text-[42px] font-extrabold leading-[1.05] tracking-[-0.08em] md:text-[48px]"
                style={{
                  background: C.gradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {stat.value}
              </span>
              {"unit" in stat ? (
                <span
                  className="mt-1 text-[18px] font-bold uppercase leading-none tracking-[0.08em] md:text-[20px]"
                  style={{
                    background: C.gradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {stat.unit}
                </span>
              ) : null}
            </div>
            <div className="ui-font mt-1.5 text-[12.5px]" style={{ color: C.textMuted }}>
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}

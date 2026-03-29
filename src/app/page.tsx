"use client"

import { C } from "@/features/landing/constants"
import Navbar from "@/features/landing/components/Navbar"
import HeroSection from "@/features/landing/components/HeroSection"
import EditorPreviewSection from "@/features/landing/components/EditorPreviewSection"
import StatsSection from "@/features/landing/components/StatsSection"
import FeaturesSection from "@/features/landing/components/FeaturesSection"
import HowItWorksSection from "@/features/landing/components/HowItWorksSection"
import CTAFooter from "@/features/landing/components/CTAFooter"

export default function Home() {
  return (
    <main className="ui-font" style={{ background: C.bgDeepest, color: C.textBody }}>
      <Navbar />
      <HeroSection />
      <EditorPreviewSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTAFooter />
    </main>
  )
}

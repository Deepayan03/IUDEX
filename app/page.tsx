"use client"

import { C } from "@/components/landing/constants"
import Navbar from "@/components/landing/Navbar"
import HeroSection from "@/components/landing/HeroSection"
import FeaturesSection from "@/components/landing/FeaturesSection"
import HowItWorksSection from "@/components/landing/HowItWorksSection"
import EditorPreviewSection from "@/components/landing/EditorPreviewSection"
import CTAFooter from "@/components/landing/CTAFooter"

export default function Home() {
  return (
    <main className="ui-font" style={{ background: C.bgDeepest, color: C.textBody }}>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <EditorPreviewSection />
      <CTAFooter />
    </main>
  )
}

"use client"

import type { ReactNode } from "react"
import { useLayoutStore, type SidebarView } from "@/shared/state/layout"

const NAV_ITEMS: { key: SidebarView | null; icon: ReactNode }[] = [
  // Files
  {
    key: "files",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
  },
  // Search
  {
    key: "search",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  // Git
  {
    key: null,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
        <path d="M18 9a9 9 0 0 1-9 9"/>
      </svg>
    ),
  },
  // Run
  {
    key: null,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
  },
  // Extensions
  {
    key: null,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  // Activity Log
  {
    key: "activity-log",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
]

export default function ActivityBar() {
  const activeSidebarView = useLayoutStore(s => s.activeSidebarView)
  const sidebarVisible = useLayoutStore(s => s.sidebarVisible)
  const setActiveSidebarView = useLayoutStore(s => s.setActiveSidebarView)

  return (
    <div
      className="activitybar-bg w-12 min-w-12 shrink-0 flex flex-col items-center py-3 justify-between z-10"
      style={{ borderRight: "1px solid #0d1525" }}
    >
      <div className="flex flex-col items-center gap-1 w-full">
        {NAV_ITEMS.map((item, i) => {
          const isActive = item.key !== null && sidebarVisible && activeSidebarView === item.key
          const isClickable = item.key !== null

          return (
            <button
              key={i}
              onClick={isClickable ? () => setActiveSidebarView(item.key!) : undefined}
              className={`
                w-full flex justify-center py-3 relative transition-all duration-150
                ${isActive ? "text-white" : "text-[#3a4a62] hover:text-[#6a7f9e]"}
                ${!isClickable ? "cursor-default" : ""}
              `}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#3d5afe]" />
              )}
              {item.icon}
            </button>
          )
        })}
      </div>

      {/* Settings */}
      <button className="text-[#3a4a62] hover:text-[#6a7f9e] pb-2 transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9"/>
        </svg>
      </button>
    </div>
  )
}

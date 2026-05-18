import React, { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { AppSidebar } from "./AppSidebar"
import { TopBar } from "./TopBar"
import { AgentStatusBar } from "./AgentStatusBar"
import { ChatDrawer } from "../chat/ChatDrawer"
import { ChatFAB } from "../chat/ChatFAB"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-surface-page overflow-hidden">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <TopBar />

        {/* Agent status bar — only visible when graph is running */}
        <AgentStatusBar />

        {/* Page content with page transition */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="h-full p-4 md:p-8 max-w-[1600px] mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* AI Chat Drawer & FAB */}
      <ChatDrawer />
      <ChatFAB />
    </div>
  )
}

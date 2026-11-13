"use client";

import React, { useState } from "react";
import { Menu, Terminal } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ChatShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function ChatShell({ sidebar, children }: ChatShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas text-content-primary">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col flex-shrink-0 border-r border-border-subtle bg-surface select-none">
        {sidebar}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-[2px] md:hidden transition-opacity duration-200"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-over Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col border-r border-border-strong bg-surface transition-transform duration-200 ease-out md:hidden ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div onClick={() => setIsMobileSidebarOpen(false)} className="h-full flex flex-col">
          {sidebar}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Navigation Bar */}
        <header className="flex h-12 items-center justify-between border-b border-border-subtle px-4 bg-surface md:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open conversation menu"
              className="text-content-secondary hover:text-content-primary"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-content-primary" />
              <span className="font-semibold text-sm tracking-tight text-content-primary">CICADA</span>
            </div>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded border border-border-subtle text-content-tertiary">
            v0.1
          </span>
        </header>

        {/* Dynamic Chat / Content View */}
        <main className="flex-1 flex flex-col min-h-0 relative">
          {children}
        </main>
      </div>
    </div>
  );
}

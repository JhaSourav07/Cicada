"use client";

import React from "react";
import { Terminal, Shield, Zap, Database, ArrowRight } from "lucide-react";

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const suggestedPrompts = [
    {
      title: "Inspect Local Architecture",
      prompt: "Explain how CICADA ensures all inference remains strictly on 127.0.0.1.",
      icon: <Shield className="h-4 w-4 text-emerald-400" />,
    },
    {
      title: "Streaming Protocol",
      prompt: "How will Server-Sent Events (SSE) stream tokens from Ollama to the Next.js UI?",
      icon: <Zap className="h-4 w-4 text-blue-400" />,
    },
    {
      title: "Persistence Strategy",
      prompt: "What is the MongoDB schema design for conversations and messages in Phase 3?",
      icon: <Database className="h-4 w-4 text-amber-400" />,
    },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center select-none max-w-2xl mx-auto">
      {/* Icon Badge */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated border border-border-strong text-content-primary shadow-lg mb-4">
        <Terminal className="h-6 w-6 text-content-primary" />
      </div>

      <h2 className="text-xl font-semibold tracking-tight text-content-primary">
        CICADA
      </h2>
      <p className="mt-1 text-sm text-content-secondary max-w-md">
        Private, local-first conversational AI. Built on Ollama, Qwen 2.5, and Next.js.
      </p>

      {/* Phase 1 Status Banner */}
      <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-surface-elevated/80 border border-border-subtle px-3 py-1.5 text-xs text-content-secondary">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span>Phase 1 Frontend: Chat UI and state active. Local inference connects in Phase 2.</span>
      </div>

      {/* Suggested Starter Chips */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
        {suggestedPrompts.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(item.prompt)}
            className="group flex flex-col justify-between p-3.5 rounded-lg bg-surface border border-border-subtle hover:border-border-strong hover:bg-surface-elevated transition-all duration-150 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-focus"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-1 rounded bg-surface-elevated border border-border-subtle">
                {item.icon}
              </span>
              <ArrowRight className="h-3 w-3 text-content-tertiary group-hover:text-content-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <p className="text-xs font-medium text-content-primary leading-tight">
                {item.title}
              </p>
              <p className="mt-1 text-[11px] text-content-tertiary line-clamp-2 leading-relaxed">
                {item.prompt}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

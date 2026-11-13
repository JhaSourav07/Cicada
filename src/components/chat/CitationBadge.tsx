"use client";

import React, { useState } from "react";
import { Globe, ExternalLink, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { SearchSource } from "@/types/chat";

interface CitationBadgeProps {
  sources: SearchSource[];
}

export function CitationBadgeList({ sources }: CitationBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border-subtle/60 pt-2.5">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-surface-elevated/70 transition-colors duration-150 group"
      >
        <Globe className="h-3.5 w-3.5 text-accent group-hover:scale-105 transition-transform" />
        <span>
          {sources.length} {sources.length === 1 ? "source" : "sources"} consulted
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-content-tertiary" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-content-tertiary" />
        )}
      </button>

      {/* Expandable list of sources */}
      {isExpanded && (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {sources.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col p-2.5 rounded-md bg-surface-elevated/40 hover:bg-surface-elevated/80 border border-border-subtle hover:border-border-strong transition-all duration-150 group/card text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="flex-shrink-0 flex items-center justify-center h-4 w-4 rounded-full bg-accent/15 text-[10px] font-mono font-semibold text-accent">
                    {source.id}
                  </span>
                  <span className="text-[11px] font-mono text-content-tertiary truncate">
                    {source.domain}
                  </span>
                </div>
                <ExternalLink className="h-3 w-3 text-content-tertiary group-hover/card:text-content-primary flex-shrink-0 opacity-70 group-hover/card:opacity-100 transition-opacity" />
              </div>

              <h4 className="mt-1 text-xs font-medium text-content-primary line-clamp-1 group-hover/card:text-accent transition-colors">
                {source.title}
              </h4>

              {source.snippet && (
                <p className="mt-1 text-[11px] text-content-secondary line-clamp-2 leading-relaxed">
                  {source.snippet}
                </p>
              )}

              {source.publishedAt && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-mono text-content-tertiary">
                  <Calendar className="h-2.5 w-2.5" />
                  <span>{source.publishedAt}</span>
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

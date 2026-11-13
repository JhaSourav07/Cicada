"use client";

import React, { useEffect, useState } from "react";
import { Cpu, Info } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HealthData {
  status: "connected" | "disconnected" | "model_missing";
  version?: string;
  availableModelCount?: number;
  defaultModel?: string;
  isDefaultModelInstalled?: boolean;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/ai/health")
      .then((r) => r.json())
      .then((d) => setHealth(d))
      .catch(() => setHealth({ status: "disconnected" }));
  }, [isOpen]);

  const ollamaStatusText =
    health?.status === "connected"
      ? `Connected (Ollama v${health.version || "0.40.16"}, ${health.availableModelCount} models)`
      : health?.status === "model_missing"
      ? "Ollama online, default model missing"
      : "Ollama offline (127.0.0.1:11434 unreachable)";

  const services = [
    {
      name: "Next.js Web & API",
      address: "127.0.0.1:3000",
      status: "connected",
      badgeVariant: "success" as const,
      detail: "Active application shell",
    },
    {
      name: "Ollama Local LLM",
      address: "127.0.0.1:11434",
      status: health?.status === "connected" ? "connected" : health?.status === "model_missing" ? "warning" : "disconnected",
      badgeVariant: health?.status === "connected" ? ("success" as const) : ("danger" as const),
      detail: ollamaStatusText,
    },
    {
      name: "MongoDB Persistence",
      address: "127.0.0.1:27017",
      status: "standby",
      badgeVariant: "warning" as const,
      detail: "Planned for Phase 3",
    },
    {
      name: "SearXNG Private Search",
      address: "127.0.0.1:8080",
      status: "standby",
      badgeVariant: "outline" as const,
      detail: "Planned for Phase 4",
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="CICADA Settings & Diagnostics"
      description="Hardware environment and service loopback status."
      className="max-w-lg"
    >
      <div className="space-y-4 text-xs">
        {/* Hardware & Inference Profile */}
        <div className="rounded-lg border border-border-subtle bg-surface p-3 space-y-2">
          <div className="flex items-center gap-1.5 font-medium text-content-primary">
            <Cpu className="h-4 w-4 text-content-secondary" />
            <span>Target Hardware Environment</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-content-secondary pt-1 font-mono text-[11px]">
            <div className="p-2 rounded bg-surface-elevated/70 border border-border-subtle">
              <span className="text-content-tertiary block text-[10px]">OS</span>
              Fedora Linux
            </div>
            <div className="p-2 rounded bg-surface-elevated/70 border border-border-subtle">
              <span className="text-content-tertiary block text-[10px]">GPU</span>
              NVIDIA RTX 4060 8GB (100% GPU)
            </div>
            <div className="p-2 rounded bg-surface-elevated/70 border border-border-subtle">
              <span className="text-content-tertiary block text-[10px]">SYSTEM RAM</span>
              16 GB
            </div>
            <div className="p-2 rounded bg-surface-elevated/70 border border-border-subtle">
              <span className="text-content-tertiary block text-[10px]">DEFAULT MODEL</span>
              {health?.defaultModel || "qwen3.5:9b"}
            </div>
          </div>
        </div>

        {/* Local Service Boundaries */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-content-secondary">
            <span className="font-medium text-content-primary">Loopback Services (127.0.0.1)</span>
            <span className="text-[10px] text-content-tertiary">Strict zero external exposure</span>
          </div>

          <div className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface">
            {services.map((svc, i) => (
              <div key={i} className="flex items-center justify-between p-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-content-primary">{svc.name}</span>
                    <span className="font-mono text-[10px] text-content-tertiary">{svc.address}</span>
                  </div>
                  <p className="text-[11px] text-content-secondary">{svc.detail}</p>
                </div>
                <Badge variant={svc.badgeVariant} dot className="capitalize text-[10px]">
                  {svc.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy & Phase 2 Notice */}
        <div className="flex items-start gap-2 rounded-md bg-surface-elevated/60 border border-border-subtle p-2.5 text-[11px] text-content-secondary">
          <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Phase 2 local AI integration active. Chat messages stream directly from your local Ollama instance on loopback with real-time SSE token delivery.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

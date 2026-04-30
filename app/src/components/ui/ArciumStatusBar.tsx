"use client";

import { useState, useEffect } from "react";
import { Shield, Cpu, Lock, RefreshCw, CheckCircle2 } from "lucide-react";

interface MxeNode {
  id:     number;
  label:  string;
  status: "active" | "computing" | "idle";
  ping:   number;
}

const MOCK_NODES: MxeNode[] = [
  { id: 1, label: "Node A",  status: "active",    ping: 23  },
  { id: 2, label: "Node B",  status: "active",    ping: 41  },
  { id: 3, label: "Node C",  status: "computing", ping: 18  },
  { id: 4, label: "Node D",  status: "active",    ping: 67  },
  { id: 5, label: "Node E",  status: "idle",      ping: 102 },
];

export function ArciumStatusBar() {
  const [nodes, setNodes]         = useState<MxeNode[]>(MOCK_NODES);
  const [lastCompute, setLast]    = useState("2s ago");
  const [pendingOrders, setPending] = useState(3);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          status:
            Math.random() < 0.15 ? "computing"
            : Math.random() < 0.05 ? "idle"
            : "active",
          ping: Math.max(10, n.ping + Math.floor(Math.random() * 10 - 5)),
        }))
      );
      setPending((p) => Math.max(0, p + Math.floor(Math.random() * 3 - 1)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = {
    active:    "bg-profit",
    computing: "bg-arcium animate-pulse",
    idle:      "bg-muted",
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-40 border-b border-border/40"
      style={{ background: "rgba(8,8,15,0.9)", backdropFilter: "blur(12px)" }}>
      <div className="max-w-[1600px] mx-auto px-4 h-9 flex items-center gap-6 text-xs overflow-x-auto">

        {/* Arcium MXE label */}
        <div className="flex items-center gap-1.5 text-arcium-bright shrink-0">
          <Shield size={11} />
          <span className="font-mono font-semibold tracking-wide">Arcium MXE</span>
        </div>

        {/* Node dots */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-dim">Nodes:</span>
          <div className="flex items-center gap-1">
            {nodes.map((n) => (
              <div
                key={n.id}
                className={`w-2 h-2 rounded-full ${statusColor[n.status]} transition-colors`}
                title={`${n.label}: ${n.status} (${n.ping}ms)`}
              />
            ))}
          </div>
          <span className="text-ghost">{nodes.filter(n => n.status !== "idle").length}/5 active</span>
        </div>

        <div className="h-3 w-px bg-border/50 shrink-0" />

        {/* Threshold */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Lock size={10} className="text-dim" />
          <span className="text-dim">Threshold:</span>
          <span className="text-ghost font-mono">4-of-5</span>
        </div>

        <div className="h-3 w-px bg-border/50 shrink-0" />

        {/* Pending compute */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Cpu size={10} className="text-arcium animate-pulse" />
          <span className="text-dim">MXE Queue:</span>
          <span className="text-arcium-bright font-mono">{pendingOrders} orders</span>
        </div>

        <div className="h-3 w-px bg-border/50 shrink-0" />

        {/* Last settlement */}
        <div className="flex items-center gap-1.5 shrink-0">
          <CheckCircle2 size={10} className="text-profit" />
          <span className="text-dim">Last settle:</span>
          <span className="text-ghost font-mono">{lastCompute}</span>
        </div>

        <div className="h-3 w-px bg-border/50 shrink-0" />

        {/* Privacy indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-dim">Positions visible:</span>
          <span className="text-loss font-mono font-semibold">0 / ∞</span>
          <span className="text-dim">(encrypted)</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Protocol label */}
        <div className="flex items-center gap-1 shrink-0 text-dim">
          <span>MPC:</span>
          <span className="text-ghost font-mono">SPDZ2k + Garbled Circuits</span>
        </div>
      </div>
    </div>
  );
}

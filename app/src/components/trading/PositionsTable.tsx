"use client";

import { useState } from "react";
import { Lock, Shield, TrendingUp, TrendingDown, X, Eye, EyeOff } from "lucide-react";
import { clsx } from "clsx";
import { usePositions } from "@/hooks/usePositions";

type Tab = "positions" | "orders" | "history";

export function PositionsTable({ market }: { market: string }) {
  const [tab,          setTab]          = useState<Tab>("positions");
  const [revealOwn,    setRevealOwn]    = useState(false);
  const { positions, orders, loading }  = usePositions(market);

  const TABS: Tab[] = ["positions", "orders", "history"];

  return (
    <div className="glass-bright border border-border/50 rounded-2xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border/30 px-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "px-4 py-3 text-xs font-mono capitalize border-b-2 transition-all",
              tab === t
                ? "border-arcium text-arcium-bright"
                : "border-transparent text-dim hover:text-ghost",
            )}
          >
            {t}
            {t === "positions" && positions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-arcium/20 text-arcium-bright text-[9px]">
                {positions.length}
              </span>
            )}
          </button>
        ))}

        {/* Privacy toggle */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setRevealOwn(!revealOwn)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-arcium/20 hover:border-arcium/40 transition-all text-[10px] font-mono text-arcium-bright"
          >
            {revealOwn ? <Eye size={11} /> : <EyeOff size={11} />}
            {revealOwn ? "Hide mine" : "Reveal mine"}
          </button>
        </div>
      </div>

      {/* Positions tab */}
      {tab === "positions" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border/20">
                {["Market", "Side", "Size", "Entry Price", "Mark Price", "Liq. Price", "PnL", "Margin", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-dim font-normal text-[10px] uppercase tracking-wider whitespace-nowrap">
                    {h === "Liq. Price" ? (
                      <div className="flex items-center gap-1">
                        <Lock size={8} className="text-arcium" />
                        {h}
                      </div>
                    ) : h === "Size" ? (
                      <div className="flex items-center gap-1">
                        <Lock size={8} className="text-arcium" />
                        {h}
                      </div>
                    ) : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-dim">
                    <div className="flex flex-col items-center gap-2">
                      <Shield size={24} className="text-arcium/40" />
                      <span>No open positions</span>
                      <span className="text-[10px] text-arcium/50">
                        When you open positions, sizes & liquidation prices are encrypted via Arcium
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                positions.map((pos) => (
                  <PositionRow key={pos.id} pos={pos} revealOwn={revealOwn} />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Orders tab */}
      {tab === "orders" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border/20">
                {["Market", "Type", "Side", "Size", "Price", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-dim font-normal text-[10px] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-dim">
                    <div className="flex flex-col items-center gap-2">
                      <Lock size={24} className="text-arcium/40" />
                      <span>No open orders</span>
                      <span className="text-[10px] text-arcium/50">
                        Open orders are stored as encrypted blobs — invisible to other traders
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-border/10 hover:bg-surface/30 transition-colors">
                    <td className="px-4 py-3 text-text">{order.market}</td>
                    <td className="px-4 py-3 text-ghost">{order.type}</td>
                    <td className="px-4 py-3">
                      <span className={order.side === "long" ? "text-profit" : "text-loss"}>
                        {order.side}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-arcium-bright">
                        <Lock size={9} />
                        Encrypted
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ghost">${order.price?.toLocaleString() ?? "Market"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-warn/10 text-warn text-[9px]">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-dim hover:text-loss transition-colors">
                        <X size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* History tab */}
      {tab === "history" && (
        <div className="p-8 text-center text-dim text-xs font-mono">
          <Shield size={24} className="mx-auto mb-2 text-arcium/40" />
          <p>Settlement history — only final PnL recorded on-chain.</p>
          <p className="text-[10px] text-arcium/50 mt-1">
            Position details (size, direction, entry price) remain private forever.
          </p>
        </div>
      )}
    </div>
  );
}

function PositionRow({ pos, revealOwn }: { pos: any; revealOwn: boolean }) {
  const pnl     = pos.unrealisedPnl ?? 0;
  const pnlPct  = (pnl / pos.margin) * 100;
  const isProfit = pnl >= 0;

  return (
    <tr className="border-b border-border/10 hover:bg-surface/30 transition-colors">
      <td className="px-4 py-3 font-medium text-text">{pos.market}</td>
      <td className="px-4 py-3">
        {revealOwn ? (
          <span className={clsx("font-semibold", pos.side === "long" ? "text-profit" : "text-loss")}>
            {pos.side === "long" ? "▲ Long" : "▼ Short"}
          </span>
        ) : (
          <div className="flex items-center gap-1 text-arcium-bright text-[10px]">
            <Lock size={8} />
            <span className="encrypted-shimmer">Encrypted</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {revealOwn ? (
          <span className="text-text">{pos.size} {pos.market.split("-")[0]}</span>
        ) : (
          <div className="flex items-center gap-1 text-arcium/50 text-[10px]">
            <Lock size={8} />••••
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-ghost">${pos.entryPrice?.toLocaleString() ?? "—"}</td>
      <td className="px-4 py-3 text-text">${pos.markPrice?.toLocaleString() ?? "—"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-arcium-bright text-[10px]">
          <Lock size={8} className="text-arcium" />
          <span>Hidden</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className={clsx("font-semibold", isProfit ? "text-profit" : "text-loss")}>
          {isProfit ? "+" : ""}${pnl.toFixed(2)}
          <span className="text-[10px] ml-1 opacity-70">
            ({isProfit ? "+" : ""}{pnlPct.toFixed(2)}%)
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-ghost">${pos.margin?.toFixed(2)}</td>
      <td className="px-4 py-3">
        <button className="px-2 py-1 rounded-lg border border-loss/30 text-loss hover:bg-loss/10 transition-colors text-[10px]">
          Close
        </button>
      </td>
    </tr>
  );
}

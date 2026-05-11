// @ts-nocheck
"use client";

import { useState } from "react";
import { Lock, Shield, X, Eye, EyeOff } from "lucide-react";
import { clsx } from "clsx";
import { usePrivatePositions } from "@/hooks/usePrivatePositions";

type Tab = "positions" | "orders" | "history";

export function PositionsTable({ market }: { market: string }) {
  const [tab, setTab] = useState<Tab>("positions");
  const { orders, loading, error, cancelTx, fetchAndDecrypt, cancelOrder } =
    usePrivatePositions();

  const TABS: Tab[] = ["positions", "orders", "history"];

  const activeOrders = orders.filter(
    (o) => o.status === "Pending" || o.status === "Matched"
  );

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
                : "border-transparent text-dim hover:text-ghost"
            )}
          >
            {t}
            {t === "positions" && activeOrders.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-arcium/20 text-arcium-bright text-[9px]">
                {activeOrders.length}
              </span>
            )}
          </button>
        ))}

        {/* Reveal mine button */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={fetchAndDecrypt}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-arcium/20 hover:border-arcium/40 transition-all text-[10px] font-mono text-arcium-bright disabled:opacity-50"
          >
            <Eye size={11} />
            {loading ? "Decrypting..." : "Reveal mine"}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="px-4 py-3 text-center text-[10px] font-mono text-arcium/70 border-b border-border/20">
          Decrypting your private positions...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="px-4 py-2 text-[10px] font-mono text-loss/80 border-b border-border/20">
          {error}
        </div>
      )}

      {/* Cancel TX success */}
      {cancelTx && (
        <div className="px-4 py-2 text-[10px] font-mono text-profit/80 border-b border-border/20 flex items-center gap-2">
          ✓ Order cancelled —{" "}
          <a
            href={`https://solscan.io/tx/${cancelTx}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-arcium-bright"
          >
            view tx
          </a>
        </div>
      )}

      {/* Positions tab — shows on-chain orders */}
      {tab === "positions" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border/20">
                {["Market", "Side", "Size", "Entry Price", "Margin", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-dim font-normal text-[10px] uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-dim">
                    <div className="flex flex-col items-center gap-2">
                      <Shield size={24} className="text-arcium/40" />
                      <span>No open positions — orders are encrypted via Arcium MPC</span>
                      <span className="text-[10px] text-arcium/50">
                        Click "Reveal mine" to decrypt and display your positions
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                activeOrders.map((order) => (
                  <OrderRow
                    key={order.pubkey}
                    order={order}
                    onCancel={cancelOrder}
                  />
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
                {["Market", "Side", "Size", "Entry Price", "Margin", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-dim font-normal text-[10px] uppercase tracking-wider"
                  >
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
                  <OrderRow
                    key={order.pubkey}
                    order={order}
                    onCancel={cancelOrder}
                  />
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

function OrderRow({
  order,
  onCancel,
}: {
  order: any;
  onCancel: (pubkey: string, orderId: string) => void;
}) {
  const statusColor = {
    Pending:   "bg-warn/10 text-warn",
    Matched:   "bg-profit/10 text-profit",
    Cancelled: "bg-dim/10 text-dim",
    Expired:   "bg-dim/10 text-dim",
  }[order.status] ?? "bg-dim/10 text-dim";

  return (
    <tr className="border-b border-border/10 hover:bg-surface/30 transition-colors">
      {/* Market */}
      <td className="px-4 py-3 font-medium text-text">{order.market}</td>

      {/* Side */}
      <td className="px-4 py-3">
        {order.isDecrypted ? (
          <span
            className={clsx(
              "font-semibold",
              order.direction === "long" ? "text-profit" : "text-loss"
            )}
          >
            {order.direction === "long" ? "▲ Long" : "▼ Short"}
          </span>
        ) : (
          <div className="flex items-center gap-1 text-arcium-bright text-[10px]">
            <Lock size={8} />🔒
          </div>
        )}
      </td>

      {/* Size */}
      <td className="px-4 py-3">
        {order.isDecrypted ? (
          <span className="text-text">${order.sizeUsd?.toFixed(2)}</span>
        ) : (
          <div className="flex items-center gap-1 text-arcium/50 text-[10px]">
            <Lock size={8} />🔒
          </div>
        )}
      </td>

      {/* Entry Price */}
      <td className="px-4 py-3">
        {order.isDecrypted ? (
          <span className="text-ghost">${order.entryPrice?.toLocaleString()}</span>
        ) : (
          <div className="flex items-center gap-1 text-arcium/50 text-[10px]">
            <Lock size={8} />🔒
          </div>
        )}
      </td>

      {/* Margin — always visible */}
      <td className="px-4 py-3 text-ghost">
        ${order.reservedCollateral?.toFixed(2)}
      </td>

      {/* Status badge */}
      <td className="px-4 py-3">
        <span className={clsx("px-2 py-0.5 rounded-full text-[9px]", statusColor)}>
          {order.status}
        </span>
      </td>

      {/* Cancel button */}
      <td className="px-4 py-3">
        {(order.status === "Pending" || order.status === "Matched") && (
          <button
            onClick={() => onCancel(order.pubkey, order.orderId)}
            className="px-2 py-1 rounded-lg border border-loss/30 text-loss hover:bg-loss/10 transition-colors text-[10px] flex items-center gap-1"
          >
            <X size={10} /> Close
          </button>
        )}
      </td>
    </tr>
  );
}
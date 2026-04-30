"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Lock, Shield, ChevronDown, Info, Zap, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { useTrade } from "@/hooks/useTrade";
import { EncryptionProgress } from "@/components/ui/EncryptionProgress";

type Side      = "long" | "short";
type OrderType = "market" | "limit";

const LEVERAGES = [2, 5, 10, 20];

export function TradingPanel({ market }: { market: string }) {
  const { publicKey } = useWallet();
  const { placeOrder, isEncrypting, isSubmitting, lastTxid, error } = useTrade(market);

  const [side,       setSide]       = useState<Side>("long");
  const [orderType,  setOrderType]  = useState<OrderType>("market");
  const [size,       setSize]       = useState("");
  const [leverage,   setLeverage]   = useState(10);
  const [limitPrice, setLimitPrice] = useState("");
  const [stopLoss,   setStopLoss]   = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [showAdv,    setShowAdv]    = useState(false);

  // Derived values
  const markPrice  = market === "BTC-PERP" ? 65_420 : market === "ETH-PERP" ? 3_512 : 172;
  const sizeNum    = parseFloat(size) || 0;
  const notional   = sizeNum * (orderType === "limit" && limitPrice ? parseFloat(limitPrice) : markPrice);
  const margin     = notional / leverage;
  const liqPriceEst = side === "long"
    ? markPrice * (1 - 1 / leverage * 0.9)
    : markPrice * (1 + 1 / leverage * 0.9);

  const handleSubmit = async () => {
    if (!sizeNum) return;
    await placeOrder({
      direction:  side,
      sizeUsd:    notional,
      leverage,
      limitPrice: orderType === "limit" ? parseFloat(limitPrice) : 0,
      stopLoss:   parseFloat(stopLoss) || 0,
      takeProfit: parseFloat(takeProfit) || 0,
      reduceOnly: false,
    });
  };

  const btnDisabled = !sizeNum || isEncrypting || isSubmitting;

  return (
    <div className="glass-bright border border-border/50 rounded-2xl overflow-hidden h-[420px] flex flex-col">

      {/* Side toggle */}
      <div className="grid grid-cols-2 p-2 gap-1.5 shrink-0">
        <button
          onClick={() => setSide("long")}
          className={clsx(
            "py-2 rounded-xl text-sm font-display font-semibold transition-all",
            side === "long"
              ? "bg-profit text-void shadow-profit"
              : "bg-surface/50 text-dim hover:text-ghost border border-border/30",
          )}
        >
          Long
        </button>
        <button
          onClick={() => setSide("short")}
          className={clsx(
            "py-2 rounded-xl text-sm font-display font-semibold transition-all",
            side === "short"
              ? "bg-loss text-white shadow-loss"
              : "bg-surface/50 text-dim hover:text-ghost border border-border/30",
          )}
        >
          Short
        </button>
      </div>

      {/* Body - scrollable */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2.5">

        {/* Order type */}
        <div className="flex gap-1 text-xs font-mono">
          {(["market", "limit"] as OrderType[]).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={clsx(
                "px-2.5 py-1 rounded-lg border capitalize transition-all",
                orderType === t
                  ? "border-arcium/50 bg-arcium/10 text-arcium-bright"
                  : "border-border/30 text-dim hover:text-ghost",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Size input */}
        <div>
          <label className="text-[10px] font-mono text-dim mb-1 block">
            Size ({market.split("-")[0]})
          </label>
          <div className="relative">
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="0.000"
              className="perp-input w-full rounded-xl px-3 py-2 text-sm pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-dim">
              {market.split("-")[0]}
            </span>
          </div>
          {notional > 0 && (
            <div className="flex justify-between mt-1 text-[10px] font-mono text-dim">
              <span>≈ ${notional.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD</span>
              <span>Margin: ${margin.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            </div>
          )}
        </div>

        {/* Limit price */}
        {orderType === "limit" && (
          <div>
            <label className="text-[10px] font-mono text-dim mb-1 block">Limit Price</label>
            <input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder={markPrice.toString()}
              className="perp-input w-full rounded-xl px-3 py-2 text-sm"
            />
          </div>
        )}

        {/* Leverage */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-mono text-dim">Leverage</label>
            <span className="text-xs font-mono font-bold text-arcium-bright">{leverage}×</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {LEVERAGES.map((lev) => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={clsx(
                  "py-1.5 rounded-lg text-xs font-mono border transition-all",
                  leverage === lev
                    ? "border-arcium/50 bg-arcium/10 text-arcium-bright"
                    : "border-border/30 text-dim hover:text-ghost",
                )}
              >
                {lev}×
              </button>
            ))}
          </div>
        </div>

        {/* Advanced (SL/TP) */}
        <button
          onClick={() => setShowAdv(!showAdv)}
          className="flex items-center gap-1 text-[10px] font-mono text-dim hover:text-ghost transition-colors"
        >
          <ChevronDown size={10} className={clsx("transition-transform", showAdv && "rotate-180")} />
          Stop Loss / Take Profit
        </button>

        {showAdv && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-mono text-dim mb-1 block">Stop Loss</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="0"
                className="perp-input w-full rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-dim mb-1 block">Take Profit</label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="0"
                className="perp-input w-full rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>
        )}

        {/* Summary */}
        {sizeNum > 0 && (
          <div className="rounded-xl border border-border/30 bg-surface/40 p-2.5 space-y-1.5 text-[10px] font-mono">
            <div className="flex justify-between">
              <span className="text-dim">Est. Liq. Price</span>
              <div className="flex items-center gap-1">
                <Lock size={8} className="text-arcium" />
                <span className="text-arcium-bright">Hidden via Arcium</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-dim">Taker Fee</span>
              <span className="text-ghost">${(notional * 0.0005).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim">Order Encryption</span>
              <span className="text-profit">AES-256-GCM ✓</span>
            </div>
          </div>
        )}

        {/* Encryption progress */}
        {(isEncrypting || isSubmitting) && (
          <EncryptionProgress isEncrypting={isEncrypting} isSubmitting={isSubmitting} />
        )}

        {/* Success */}
        {lastTxid && (
          <div className="rounded-xl border border-profit/20 bg-profit/5 p-2.5 text-[10px] font-mono text-profit">
            ✓ Order encrypted & placed on-chain
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-loss/20 bg-loss/5 p-2.5 text-[10px] font-mono text-loss flex items-start gap-1.5">
            <AlertTriangle size={10} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Submit */}
        {!publicKey ? (
          <WalletMultiButton />
        ) : (
          <button
            onClick={handleSubmit}
            disabled={btnDisabled}
            className={clsx(
              "w-full py-3 rounded-xl font-display font-semibold text-sm transition-all flex items-center justify-center gap-2",
              side === "long"
                ? "bg-profit text-void hover:shadow-profit"
                : "bg-loss text-white hover:shadow-loss",
              btnDisabled && "opacity-40 cursor-not-allowed",
            )}
          >
            {isEncrypting ? (
              <>
                <Lock size={14} className="animate-pulse" />
                Encrypting via Arcium…
              </>
            ) : isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Shield size={14} />
                {side === "long" ? "Long" : "Short"} {market.split("-")[0]}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

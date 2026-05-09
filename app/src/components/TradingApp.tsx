"use client";
import { Component, ReactNode, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ArciumStatusBar } from "@/components/ui/ArciumStatusBar";
import { MarketSelector } from "@/components/trading/MarketSelector";
import { StatsBar } from "@/components/trading/StatsBar";
import { PriceChart } from "@/components/trading/PriceChart";
import { OrderBook } from "@/components/trading/OrderBook";
import { TradingPanel } from "@/components/trading/TradingPanel";
import { PositionsTable } from "@/components/trading/PositionsTable";
import { PrivacyShield } from "@/components/ui/PrivacyShield";

class ErrorBoundary extends Component<{children: ReactNode}, {err: string|null}> {
  state = { err: null };
  static getDerivedStateFromError(e: any) { return { err: e?.message ?? String(e) }; }
  render() {
    if (this.state.err) return (
      <pre style={{color:"red",padding:40,background:"#050508",minHeight:"100vh",fontSize:12}}>{this.state.err}</pre>
    );
    return this.props.children;
  }
}

export default function TradingApp() {
  const [market, setMarket] = useState("BTC-PERP");
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-void">
        <div className="fixed inset-0 bg-radial-arcium pointer-events-none z-0" />
        <Navbar />
        <ArciumStatusBar />
        <main className="relative z-10 pt-24 px-3 pb-8 max-w-[1600px] mx-auto">
          <div className="flex flex-col gap-2 mt-2">
            <MarketSelector selected={market} onChange={setMarket} />
            <StatsBar market={market} />
          </div>
          <div className="grid grid-cols-12 gap-2 mt-2" style={{display:"grid",gridTemplateColumns:"8fr 2fr 2fr",gap:8,marginTop:8}}>
            <div className="col-span-8"><PriceChart market={market} /></div>
            <div className="col-span-2"><OrderBook market={market} /></div>
            <div className="col-span-2"><TradingPanel market={market} /></div>
          </div>
          <div className="grid grid-cols-12 gap-2 mt-2" style={{display:"grid",gridTemplateColumns:"8fr 2fr 2fr",gap:8,marginTop:8}}>
            <div className="col-span-8"><PositionsTable market={market} /></div>
            <div className="col-span-4"><PrivacyShield /></div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

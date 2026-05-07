"use client";
import { Component, ReactNode } from "react";
class ErrorBoundary extends Component<{children: ReactNode}, {error: string|null}> {
  state = { error: null };
  static getDerivedStateFromError(e: any) { return { error: e?.message || String(e) }; }
  render() {
    if (this.state.error) return (
      <div style={{color:"#ff4444",padding:40,fontFamily:"monospace",whiteSpace:"pre-wrap",background:"#0a0a0a",minHeight:"100vh"}}>
        <b>CLIENT ERROR:</b>{"
"}{this.state.error}
      </div>
    );
    return this.props.children;
  }
}
import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { TradingPanel } from "@/components/trading/TradingPanel";
import { PriceChart } from "@/components/trading/PriceChart";
import { PositionsTable } from "@/components/trading/PositionsTable";
import { MarketSelector } from "@/components/trading/MarketSelector";
import { ArciumStatusBar } from "@/components/ui/ArciumStatusBar";
import { PrivacyShield } from "@/components/ui/PrivacyShield";
import { OrderBook } from "@/components/trading/OrderBook";
import { StatsBar } from "@/components/trading/StatsBar";

export default function TradingApp() {
  const [selectedMarket, setSelectedMarket] = useState("BTC-PERP");
  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-void bg-grid-pattern bg-grid">
      <div className="fixed inset-0 bg-radial-arcium pointer-events-none" />
      <Navbar />
      <ArciumStatusBar />
      <main className="relative z-10 pt-16 px-4 pb-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col gap-3 mt-4">
          <MarketSelector selected={selectedMarket} onChange={setSelectedMarket} />
          <StatsBar market={selectedMarket} />
        </div>
        <div className="grid grid-cols-12 gap-3 mt-3">
          <div className="col-span-12 xl:col-span-8">
            <PriceChart market={selectedMarket} />
          </div>
          <div className="col-span-12 xl:col-span-2">
            <OrderBook market={selectedMarket} />
          </div>
          <div className="col-span-12 xl:col-span-2">
            <TradingPanel market={selectedMarket} />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-3 mt-3">
          <div className="col-span-12 xl:col-span-8">
            <PositionsTable market={selectedMarket} />
          </div>
          <div className="col-span-12 xl:col-span-4">
            <PrivacyShield />
          </div>
        </div>
      </main>
    </div>
    </ErrorBoundary>
  );
}

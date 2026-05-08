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
    if (this.state.err) {
      return <pre style={{color:"red",padding:40,background:"#000",minHeight:"100vh"}}>{this.state.err}</pre>;
    }
    return this.props.children;
  }
}

export default function TradingApp() {
  const [selectedMarket, setSelectedMarket] = useState("BTC-PERP");
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-void">
        <div className="fixed inset-0 bg-radial-arcium pointer-events-none" />
        <Navbar />
        <ArciumStatusBar />
        <main className="relative z-10 pt-16 px-4 pb-8 max-w-[1600px] mx-auto">
          <div className="flex flex-col gap-3 mt-4">
            <MarketSelector selected={selectedMarket} onChange={setSelectedMarket} />
            <StatsBar market={selectedMarket} />
          </div>
          <div className="grid grid-cols-12 gap-3 mt-3">
            <div className="col-span-12 lg:col-span-8">
              <PriceChart market={selectedMarket} />
            </div>
            <div className="col-span-12 lg:col-span-2">
              <OrderBook market={selectedMarket} />
            </div>
            <div className="col-span-12 lg:col-span-2">
              <TradingPanel market={selectedMarket} />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-3 mt-3">
            <div className="col-span-12 lg:col-span-8">
              <PositionsTable market={selectedMarket} />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <PrivacyShield />
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

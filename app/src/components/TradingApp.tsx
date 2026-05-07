"use client";
import { Component, ReactNode, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ArciumStatusBar } from "@/components/ui/ArciumStatusBar";
import { MarketSelector } from "@/components/trading/MarketSelector";
import { StatsBar } from "@/components/trading/StatsBar";
import { OrderBook } from "@/components/trading/OrderBook";
import { TradingPanel } from "@/components/trading/TradingPanel";
import { PositionsTable } from "@/components/trading/PositionsTable";
import { PrivacyShield } from "@/components/ui/PrivacyShield";
import { PriceChart } from "@/components/trading/PriceChart";

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
      <div style={{background:"#05050a",minHeight:"100vh"}}>
        <Navbar />
        <ArciumStatusBar />
        <main style={{padding:"80px 16px 32px",maxWidth:1600,margin:"0 auto"}}>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
            <MarketSelector selected={selectedMarket} onChange={setSelectedMarket} />
            <StatsBar market={selectedMarket} />
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:12,marginTop:12}}>
            <div style={{gridColumn:"span 8"}}>
              <PriceChart market={selectedMarket} />
            </div>
            <div style={{gridColumn:"span 2"}}>
              <OrderBook market={selectedMarket} />
            </div>
            <div style={{gridColumn:"span 2"}}>
              <TradingPanel market={selectedMarket} />
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:12,marginTop:12}}>
            <div style={{gridColumn:"span 8"}}>
              <PositionsTable market={selectedMarket} />
            </div>
            <div style={{gridColumn:"span 4"}}>
              <PrivacyShield />
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

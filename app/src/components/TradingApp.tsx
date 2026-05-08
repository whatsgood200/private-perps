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
      return <pre style={{color:"red",padding:40,background:"#050508",minHeight:"100vh",fontSize:12,whiteSpace:"pre-wrap"}}>{this.state.err}</pre>;
    }
    return this.props.children;
  }
}

const S = {
  page: { background:"#050508", minHeight:"100vh", color:"#e8e8ff", fontFamily:"sans-serif" } as React.CSSProperties,
  main: { padding:"72px 12px 32px", maxWidth:1600, margin:"0 auto" } as React.CSSProperties,
  topRow: { display:"flex", flexDirection:"column" as const, gap:8, marginTop:12 },
  grid: { display:"grid", gridTemplateColumns:"8fr 2fr 2fr", gap:8, marginTop:8 } as React.CSSProperties,
  gridBottom: { display:"grid", gridTemplateColumns:"8fr 4fr", gap:8, marginTop:8 } as React.CSSProperties,
};

export default function TradingApp() {
  const [selectedMarket, setSelectedMarket] = useState("BTC-PERP");
  return (
    <ErrorBoundary>
      <div style={S.page}>
        <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse at 50% 0%, rgba(124,92,252,0.12) 0%, transparent 70%)",pointerEvents:"none"}} />
        <Navbar />
        <ArciumStatusBar />
        <main style={S.main}>
          <div style={S.topRow}>
            <MarketSelector selected={selectedMarket} onChange={setSelectedMarket} />
            <StatsBar market={selectedMarket} />
          </div>
          <div style={S.grid}>
            <div><PriceChart market={selectedMarket} /></div>
            <div><OrderBook market={selectedMarket} /></div>
            <div><TradingPanel market={selectedMarket} /></div>
          </div>
          <div style={S.gridBottom}>
            <div><PositionsTable market={selectedMarket} /></div>
            <div><PrivacyShield /></div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

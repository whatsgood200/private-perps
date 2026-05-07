"use client";
import { Component, ReactNode, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ArciumStatusBar } from "@/components/ui/ArciumStatusBar";
import { MarketSelector } from "@/components/trading/MarketSelector";
import { StatsBar } from "@/components/trading/StatsBar";

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
        <main style={{padding:"80px 16px 32px"}}>
          <MarketSelector selected={selectedMarket} onChange={setSelectedMarket} />
          <StatsBar market={selectedMarket} />
          <p style={{color:"green",marginTop:20}}>✅ Phase 1 OK — adding trading components next</p>
        </main>
      </div>
    </ErrorBoundary>
  );
}

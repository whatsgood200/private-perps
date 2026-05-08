"use client";
// @ts-nocheck
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { usePriceHistory } from "@/hooks/usePriceHistory";

const TF = ["5m","15m","1h","4h","1d"];

export function PriceChart({ market }: { market: string }) {
  const [tf, setTf] = useState("1h");
  const { candles, loading } = usePriceHistory(market, tf);
  const latest = candles?.[candles.length - 1];
  const first  = candles?.[0];
  const change = latest && first ? ((latest.close - first.close) / first.close * 100).toFixed(2) : "0.00";
  const up = parseFloat(change) >= 0;

  return (
    <div style={{background:"#0d0d1a",border:"1px solid #1e1e3a",borderRadius:12,padding:16,height:420}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <span style={{color:"#e8e8ff",fontWeight:700,fontSize:20}}>{latest ? "$" + latest.close.toLocaleString(undefined,{maximumFractionDigits:2}) : "—"}</span>
          <span style={{color: up ? "#00e5a0" : "#ff4466", marginLeft:8, fontSize:13}}>{up ? "+" : ""}{change}%</span>
        </div>
        <div style={{display:"flex",gap:4}}>
          {TF.map(t => (
            <button key={t} onClick={() => setTf(t)}
              style={{padding:"3px 10px",borderRadius:6,fontSize:12,cursor:"pointer",
                background: tf===t ? "#7c5cfc" : "transparent",
                color: tf===t ? "#fff" : "#9494c4",
                border:"1px solid " + (tf===t ? "#7c5cfc" : "#1e1e3a")}}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={candles} margin={{top:4,right:8,left:-10,bottom:0}}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#7c5cfc" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
          <XAxis dataKey="time" hide />
          <YAxis domain={["auto","auto"]} stroke="#6b6b9e" tick={{fontSize:10,fill:"#6b6b9e"}} tickFormatter={v => "$"+Math.round(v).toLocaleString()} />
          <Tooltip
            contentStyle={{background:"#111122",border:"1px solid #1e1e3a",borderRadius:8,fontSize:12}}
            labelStyle={{color:"#9494c4"}}
            formatter={(v: any) => ["$" + Number(v).toLocaleString(undefined,{maximumFractionDigits:2}), "Price"]}
          />
          <Area type="monotone" dataKey="close" stroke="#7c5cfc" strokeWidth={2} fill="url(#priceGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

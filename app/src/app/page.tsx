import dynamic from "next/dynamic";

const TradingApp = dynamic(() => import("@/components/TradingApp"), { ssr: false });

export default function Page() {
  return <TradingApp />;
}

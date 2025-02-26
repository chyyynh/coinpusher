"use client";

import dynamic from "next/dynamic";

const CoinPusherGame = dynamic(() => import("./CoinPusherGame.tsx"), {
  ssr: false,
});

export default function CoinPusherGameClient() {
  return <CoinPusherGame />;
}

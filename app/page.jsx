"use client";

import dynamic from "next/dynamic";

const AppEntry = dynamic(() => import("../src/AppEntry"), {
  ssr: false,
  loading: () => null,
});

export default function HomePage() {
  return <AppEntry />;
}

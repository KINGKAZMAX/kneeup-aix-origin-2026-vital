"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RiskColumn from "@/components/dashboard/RiskColumn";
import PainTrendChart from "@/components/dashboard/PainTrendChart";
import AdherenceChart from "@/components/dashboard/AdherenceChart";
import DigestStream from "@/components/dashboard/DigestStream";
import ActiveBadge from "@/components/dashboard/ActiveBadge";

/** AI 数据大屏（路演投屏背景 · 1080p 一屏无滚动 · 只读） */
export default function DashboardPage() {
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="relative flex h-[calc(100vh-72px)] min-h-[600px] flex-col gap-4 overflow-hidden px-6 pb-4 pt-5">
      {/* 氛围光（MENISCUS SHIELD 深蓝+青光） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 600px at 70% -10%, rgba(56,225,212,0.07), transparent)",
        }}
      />

      {/* 顶部标题栏 */}
      <header className="relative flex shrink-0 items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">
            ◈ KneeUp <span className="text-[#38E1D4]">膝望</span>
          </h1>
          <span className="rounded-full border border-[#38E1D4]/40 bg-[#38E1D4]/10 px-3 py-1 font-mono text-[11px] tracking-[0.2em] text-[#38E1D4]">
            AI DATA LAYER
          </span>
          <Link
            href="/"
            className="text-xs text-slate-500 transition hover:text-[#38E1D4]"
          >
            ← 首页
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-slate-400">{clock}</span>
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] text-amber-200/90">
            合成数据 · 无真实患者数据
          </span>
        </div>
      </header>

      {/* 三列主体：左 3 / 中 6 / 右 3 */}
      <div className="relative grid min-h-0 flex-1 grid-cols-12 gap-4">
        <aside className="col-span-3 flex min-h-0 flex-col">
          <RiskColumn />
        </aside>
        <section className="col-span-6 grid min-h-0 grid-rows-2 gap-4">
          <PainTrendChart />
          <AdherenceChart />
        </section>
        <aside className="col-span-3 flex min-h-0 flex-col gap-4">
          <DigestStream />
          <ActiveBadge />
        </aside>
      </div>
    </main>
  );
}

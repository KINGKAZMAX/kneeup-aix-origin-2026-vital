"use client";

import { AI_MODE } from "@/lib/ai";

/** 右列底部：「AI LAYER ACTIVE」呼吸灯徽章 */
export default function ActiveBadge() {
  return (
    <div className="flex shrink-0 items-center justify-between rounded-2xl border border-[#38E1D4]/30 bg-[#38E1D4]/5 px-5 py-4">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="af-dot h-2.5 w-2.5 rounded-full bg-[#3EE08F]" />
          <span className="af-text font-mono text-sm font-bold tracking-[0.2em] text-[#38E1D4]">
            AI LAYER ACTIVE
          </span>
        </div>
        <div className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          mode: {AI_MODE} · 规则分级 + 摘要流
        </div>
      </div>
      <svg width="34" height="34" viewBox="0 0 34 34" className="af-spin opacity-80">
        <circle cx="17" cy="17" r="14" fill="none" stroke="rgba(56,225,212,0.25)" strokeWidth="2" />
        <circle cx="17" cy="17" r="14" fill="none" stroke="#38E1D4" strokeWidth="2" strokeLinecap="round" strokeDasharray="22 66" />
        <circle cx="17" cy="17" r="4" fill="#38E1D4" />
      </svg>
      <style>{`
        @keyframes af-breathe {
          0%, 100% { opacity: 0.45; box-shadow: 0 0 0 0 rgba(62,224,143,0); }
          50% { opacity: 1; box-shadow: 0 0 12px 2px rgba(62,224,143,0.45); }
        }
        .af-dot { animation: af-breathe 2.4s ease-in-out infinite; }
        @keyframes af-soft {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; text-shadow: 0 0 14px rgba(56,225,212,0.6); }
        }
        .af-text { animation: af-soft 2.4s ease-in-out infinite; }
        @keyframes af-spin { to { transform: rotate(360deg); } }
        .af-spin { animation: af-spin 6s linear infinite; }
      `}</style>
    </div>
  );
}

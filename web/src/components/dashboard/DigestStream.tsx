"use client";

import { PATIENTS } from "@/lib/synth/patients";
import { getMetrics, TONE_COLOR } from "@/components/doctor/metrics";

const GLOW_CYCLE_SEC = 12;

/** 右列：AI 摘要流（三条 digest 轮播高亮，纯 CSS animation，12s 一轮） */
export default function DigestStream() {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          AI 摘要流 · 周报 Digest
        </h2>
        <span className="rounded-full border border-[#38E1D4]/50 px-2 py-0.5 text-[10px] text-[#38E1D4]">
          ✦ AI 生成
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {PATIENTS.map((p, i) => {
          const m = getMetrics(p);
          const color = TONE_COLOR[m.tone];
          return (
            <article
              key={p.id}
              className="af-digest min-h-0 flex-1 overflow-hidden rounded-xl border p-3"
              style={{ animationDelay: `${(i * GLOW_CYCLE_SEC) / 3}s` }}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                  {p.name}
                  <span className="font-mono text-[10px] font-normal" style={{ color }}>
                    RISK {m.riskLevel} · {m.riskLabel}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10px] text-slate-500">
                  W1 · 7D DIGEST
                </span>
              </div>
              <p className="line-clamp-4 text-[11px] leading-5 text-slate-300">{p.digest}</p>
            </article>
          );
        })}
      </div>
      <style>{`
        @keyframes af-glow {
          0%, 30% {
            border-color: rgba(56,225,212,0.7);
            background: rgba(56,225,212,0.08);
            box-shadow: 0 0 22px -4px rgba(56,225,212,0.45);
            transform: translateY(-2px);
          }
          36%, 96% {
            border-color: rgba(230,241,255,0.1);
            background: rgba(10,24,43,0.7);
            box-shadow: none;
            transform: translateY(0);
          }
          100% {
            border-color: rgba(56,225,212,0.7);
            background: rgba(56,225,212,0.08);
            box-shadow: 0 0 22px -4px rgba(56,225,212,0.45);
            transform: translateY(-2px);
          }
        }
        .af-digest {
          animation: af-glow ${GLOW_CYCLE_SEC}s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}

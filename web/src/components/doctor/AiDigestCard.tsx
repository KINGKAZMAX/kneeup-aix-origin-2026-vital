"use client";

import { useState } from "react";
import type { Patient } from "@/lib/synth/patients";
import { AI_MODE, generateReport, type ReportOutput } from "@/lib/ai";
import { getMetrics } from "./metrics";
import AiTag from "./AiTag";

/** AI 周报摘要大卡：digest 文本（合成预置）+ AI 生成徽章 + 免责小字 + 「重新生成」走 generateReport() */
export default function AiDigestCard({ patient }: { patient: Patient }) {
  const m = getMetrics(patient);
  const [report, setReport] = useState<ReportOutput | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegenerate() {
    setLoading(true);
    try {
      const out = await generateReport({
        patientId: patient.id,
        patientName: patient.name,
        riskLevel: m.riskLevel,
        stats: {
          completionAvgPct: m.adherenceAvg,
          painFirst: m.painFirst,
          painLast: m.painLast,
          painMin: m.painMin,
          painMax: m.painMax,
          redFlagDays: m.redFlagDays,
          romTargetDeg: m.romDefault,
        },
      });
      setReport(out);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#38E1D4]/25 bg-gradient-to-br from-[#38E1D4]/10 to-transparent p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-100">AI 周报摘要</h2>
        <div className="flex items-center gap-2">
          <AiTag />
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={loading}
            className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-slate-300 transition hover:border-[#38E1D4]/50 hover:text-[#38E1D4] disabled:opacity-50"
          >
            {loading ? "生成中…" : "重新生成摘要"}
          </button>
        </div>
      </div>

      <p className="text-[15px] leading-7 text-slate-200">{patient.digest}</p>

      {report && (
        <div className="mt-4 rounded-xl border border-white/10 bg-[#0A182B]/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500">
            <span>实时生成 · 模式 {report.mode === "remote" ? "remote" : AI_MODE}</span>
          </div>
          <p className="font-mono text-[13px] leading-6 text-slate-300">{report.text}</p>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-5 text-slate-500">
        本摘要由 AI 基于 7 天合成训练数据生成，仅供训练安排参考，不构成医疗建议。
      </p>
    </section>
  );
}

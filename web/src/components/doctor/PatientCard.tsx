import Link from "next/link";
import type { Patient } from "@/lib/synth/patients";
import { getMetrics, TONE_COLOR } from "./metrics";
import AdherenceRing from "./AdherenceRing";
import PainSparkline from "./PainSparkline";
import StatusBadge from "./StatusBadge";
import RiskBadge from "./RiskBadge";

/** 患者卡（整卡可点击 → AI 摘要详情） */
export default function PatientCard({ patient }: { patient: Patient }) {
  const m = getMetrics(patient);
  const toneColor = TONE_COLOR[m.tone];
  return (
    <Link
      href={`/doctor/${patient.id}`}
      className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-[#38E1D4]/40 hover:shadow-[0_0_40px_-12px_rgba(56,225,212,0.35)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold text-slate-100 group-hover:text-[#38E1D4]">
            {patient.name}
            <span className="ml-2 font-mono text-sm font-normal text-slate-400">{m.age}岁</span>
          </div>
          <div className="mt-1 text-xs leading-relaxed text-slate-400">{patient.scenario}</div>
        </div>
        <StatusBadge text={m.statusText} tone={m.statusTone} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <AdherenceRing pct={m.adherenceAvg} color={toneColor} />
        <div className="flex flex-col items-end gap-1">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            7日疼痛趋势 · 0-10
          </div>
          <PainSparkline pains={patient.days.map((d) => d.pain)} color={toneColor} />
          <div className="font-mono text-xs text-slate-400">
            {m.painFirst} → {m.painLast}
            {m.redFlagDays > 0 && (
              <span className="ml-2 text-[#FF5A5A]">⚠ 红灯{m.redFlagDays}天</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-3">
        <RiskBadge level={m.riskLevel} />
        <span className="text-xs text-slate-400 transition group-hover:text-[#38E1D4]">
          查看 AI 摘要 →
        </span>
      </div>
    </Link>
  );
}

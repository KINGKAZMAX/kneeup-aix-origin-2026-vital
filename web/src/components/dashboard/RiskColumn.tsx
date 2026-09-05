import { PATIENTS } from "@/lib/synth/patients";
import { getMetrics, TONE_COLOR } from "@/components/doctor/metrics";

/** 左列：3 患者风险分级牌（A/B/C 大字 + 分级色） */
export default function RiskColumn() {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Risk Grade · 风险分级
        </h2>
        <span className="text-[9px] uppercase tracking-widest text-slate-600">AI · SYNTHETIC</span>
      </div>
      {PATIENTS.map((p) => {
        const m = getMetrics(p);
        const color = TONE_COLOR[m.tone];
        return (
          <article
            key={p.id}
            className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-2xl border p-4"
            style={{ borderColor: `${color}55`, background: `${color}0F` }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-6xl font-bold leading-none" style={{ color }}>
                {m.riskLevel}
              </span>
              <span
                className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                style={{ borderColor: `${color}66`, color }}
              >
                {m.riskLabel}
              </span>
            </div>
            <div className="mt-2 text-sm font-medium text-slate-100">
              {p.name}
              <span className="ml-2 font-mono text-xs font-normal text-slate-400">{m.age}岁</span>
              <span className="ml-2 text-[11px] font-normal" style={{ color }}>
                · {m.statusText}
              </span>
            </div>
            <div className="mt-1 font-mono text-[11px] leading-4 text-slate-400">{m.reason}</div>
            <div className="mt-2 text-[9px] uppercase tracking-widest text-slate-600">
              AI risk grade · 供参考，不构成医疗建议
            </div>
          </article>
        );
      })}
    </section>
  );
}

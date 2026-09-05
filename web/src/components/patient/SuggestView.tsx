"use client";
// 屏B · 今日训练建议（docs/24 §2.2）
// AI未接：本地规则引擎降级，标注「本地规则 · AI联线后升级」；红灯 → 危机转介卡

import { useState } from "react";
import AITag from "@/components/shared/AITag";
import CrisisCard from "@/components/shared/CrisisCard";
import type { CheckInResult, Plan } from "./ruleEngine";

function PlanCard({ plan, onStart, source }: { plan: Plan; onStart: () => void; source: string }) {
  const [showOrigin, setShowOrigin] = useState(false);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-100">✦ AI 今日训练建议</h3>
        <AITag text={source} local />
      </div>

      <p className="mb-4 rounded-xl bg-cyan-400/5 px-4 py-3 text-sm leading-relaxed text-cyan-100">
        今天状态：{plan.bandLabel}。建议屈膝幅度控制在{" "}
        <span className="font-mono text-base font-bold text-cyan-300">{plan.rom}°</span> 以内（{plan.intensityNote}）。
      </p>

      <div className="mb-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
          今日动作 · 来自医生「训练计划」+ AI微调
        </div>
        <ol className="space-y-2">
          {plan.items.map((it, i) => (
            <li key={it.name} className="flex flex-wrap items-baseline gap-x-3 rounded-xl border border-white/10 bg-[#0A182B] px-4 py-3">
              <span className="font-mono text-xs text-cyan-300">{i + 1}.</span>
              <span className="font-medium text-slate-100">{it.name}</span>
              <span className="font-mono text-sm text-slate-300">{it.dosage}</span>
              <span className="ml-auto text-xs text-slate-400">{it.support}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mb-4 rounded-xl border border-[#FFC24B]/30 bg-[#FFC24B]/5 px-4 py-3">
        <div className="mb-1 text-xs font-semibold text-[#FFC24B]">⚠ 注意点</div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {plan.cautions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>

      <p className="mb-5 text-sm italic text-slate-400">鼓励一下：{plan.encourage}</p>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-[#38E1D4] px-8 py-3 font-semibold text-[#06202B] shadow-[0_0_16px_rgba(56,225,212,0.35)] transition hover:brightness-110"
        >
          开始训练
        </button>
        <button type="button" onClick={() => setShowOrigin((v) => !v)} className="text-sm text-slate-400 underline-offset-4 hover:text-cyan-300 hover:underline">
          {showOrigin ? "收起医生计划原文" : "查看医生计划原文"}
        </button>
      </div>

      {showOrigin && (
        <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#0A182B] p-4 font-mono text-xs leading-relaxed text-slate-400">{`医生「训练计划」原文（合成示例 · 下发于昨日）
──────────────────────────────
1. 坐姿伸膝   12次 × 3组   支撑档位 2   节奏：慢起慢放 3秒
2. 靠墙静蹲   30秒 × 3组   支撑档位 2   组间休息 30秒
终止条件：疼痛 ≥ 6/10 · 连续代偿 ≥ 3次 · 屈膝低于 75° 时终止该组
（以上为训练安排参考，不构成医疗建议）`}</pre>
      )}
    </div>
  );
}

export default function SuggestView({
  result,
  onStart,
  onRest,
}: {
  result: CheckInResult;
  onStart: () => void;
  onRest: () => void;
}) {
  const [reduced, setReduced] = useState(false);

  if (result.crisis && !reduced) {
    return (
      <div className="space-y-4">
        <CrisisCard>
          <p>根据你今天的打卡，检测到以下红灯信号：</p>
          <ul className="list-disc space-y-1 pl-5">
            {result.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="text-base font-semibold text-[#FF5A5A]">建议尽快就医，今天先不安排训练。</p>
          <p className="text-xs text-slate-400">
            这是系统根据打卡信息触发的安全提示，不构成医疗建议；如有紧急情况请及时联系专业机构。
          </p>
        </CrisisCard>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRest}
            className="rounded-xl bg-[#38E1D4] px-8 py-3 font-semibold text-[#06202B] shadow-[0_0_16px_rgba(56,225,212,0.35)] transition hover:brightness-110"
          >
            今日休息
          </button>
          <button
            type="button"
            onClick={() => setReduced(true)}
            className="rounded-xl border border-white/20 px-6 py-3 text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            以更低强度继续
          </button>
        </div>
        <AITag text="本地规则 · AI联线后升级" local />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {result.crisis && reduced && (
        <div className="rounded-xl border border-[#FFC24B]/40 bg-[#FFC24B]/10 px-4 py-3 text-sm text-[#FFC24B]">
          已为你切换到低强度方案。如过程中不适加重，请立即停止并尽快就医。
        </div>
      )}
      <PlanCard plan={result.plan} onStart={onStart} source="本地规则 · AI联线后升级" />
    </div>
  );
}

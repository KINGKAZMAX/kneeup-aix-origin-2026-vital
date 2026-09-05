// 患者指标派生 + 风险分级规则引擎（docs/26 模块④ · 代码权威，非 AI 判定）
// 分级规则（全部由 7 天打卡序列计算）：
//   C（关注）= 近7天红灯信号 ≥ 1 天
//   B（观察）= 完成率均值 < 85% ‖ 两日窗口疼痛最大回升 ≥ +2 ‖ 打软腿 ≥ 2 天
//   A（稳定）= 其余
// 校验：P1 → A；P2 → B；P3（红灯1天）→ C ✓

import type { Patient } from "@/lib/synth/patients";

export type RiskLevel = "A" | "B" | "C";
export type Tone = "good" | "watch" | "alert";

export const TONE_COLOR: Record<Tone, string> = {
  good: "#3EE08F",
  watch: "#FFC24B",
  alert: "#FF5A5A",
};

export const TONE_CLASS: Record<Tone, string> = {
  good: "border-[#3EE08F]/40 bg-[#3EE08F]/10 text-[#3EE08F]",
  watch: "border-[#FFC24B]/40 bg-[#FFC24B]/10 text-[#FFC24B]",
  alert: "border-[#FF5A5A]/40 bg-[#FF5A5A]/10 text-[#FF5A5A]",
};

export const RISK_META: Record<RiskLevel, { label: string; tone: Tone }> = {
  A: { label: "稳定", tone: "good" },
  B: { label: "观察", tone: "watch" },
  C: { label: "关注", tone: "alert" },
};

/** 演示状态徽章（与 patients.ts 三位患者一一对应） */
const STATUS_BY_ID: Record<string, { text: string; tone: Tone }> = {
  "p1-zhiyuan": { text: "稳步向好", tone: "good" },
  "p2-guohao": { text: "代偿关注", tone: "watch" },
  "p3-shufen": { text: "红灯已转介", tone: "alert" },
};

export interface PatientMetrics {
  id: string;
  name: string;
  age: number;
  scenario: string;
  adherenceAvg: number;
  painFirst: number;
  painLast: number;
  painMin: number;
  painMax: number;
  /** 两日窗口（d[i] - d[i-2]）疼痛最大回升 */
  maxRise2: number;
  givingWayDays: number;
  redFlagDays: number;
  riskLevel: RiskLevel;
  riskLabel: string;
  tone: Tone;
  statusText: string;
  statusTone: Tone;
  /** 一句话分级依据（供列表/大屏展示） */
  reason: string;
  /** 计划编辑器默认幅度（按分级保守取值） */
  romDefault: number;
}

export function getMetrics(p: Patient): PatientMetrics {
  const days = p.days;
  const pains = days.map((d) => d.pain);
  const adherenceAvg = Math.round(
    days.reduce((acc, d) => acc + d.completionPct, 0) / days.length
  );
  const redFlagDays = days.filter((d) => d.redFlag).length;
  const givingWayDays = days.filter((d) => d.givingWay > 0).length;
  let maxRise2 = 0;
  for (let i = 2; i < pains.length; i++) {
    maxRise2 = Math.max(maxRise2, pains[i] - pains[i - 2]);
  }

  let riskLevel: RiskLevel = "A";
  if (redFlagDays >= 1) riskLevel = "C";
  else if (adherenceAvg < 85 || maxRise2 >= 2 || givingWayDays >= 2) riskLevel = "B";

  const painMin = Math.min(...pains);
  const painMax = Math.max(...pains);
  const reason =
    riskLevel === "C"
      ? `红灯信号 ${redFlagDays} 天 · 已提示尽快就医`
      : riskLevel === "B"
        ? `疼痛回升 +${maxRise2} · 完成率 ${adherenceAvg}%`
        : `完成率 ${adherenceAvg}% · 无红灯信号`;

  const status = STATUS_BY_ID[p.id] ?? { text: "随访中", tone: "watch" as Tone };

  return {
    id: p.id,
    name: p.name,
    age: p.age,
    scenario: p.scenario,
    adherenceAvg,
    painFirst: pains[0],
    painLast: pains[pains.length - 1],
    painMin,
    painMax,
    maxRise2,
    givingWayDays,
    redFlagDays,
    riskLevel,
    riskLabel: RISK_META[riskLevel].label,
    tone: RISK_META[riskLevel].tone,
    statusText: status.text,
    statusTone: status.tone,
    reason,
    romDefault: riskLevel === "A" ? 70 : riskLevel === "B" ? 55 : 40,
  };
}

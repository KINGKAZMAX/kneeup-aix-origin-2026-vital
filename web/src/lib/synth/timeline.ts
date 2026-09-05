// 180s演示时间线（docs/25 §2）：4阶段参数表+事件点
// 90秒路演可用 timeScale=2 快速档

import type { SessionParams } from "./signals";

export interface Phase {
  name: string;
  start: number;
  end: number;
  amp: number | [number, number];
  fatigueRate: number;
  fatigueRecovery: number;
  p0: number | [number, number];
  drift: number;
  expect: "SAFE" | "RISK" | "OVER";
}

export const TIMELINE: Phase[] = [
  { name: "安全区", start: 0, end: 40, amp: 65, fatigueRate: 0.01, fatigueRecovery: 0.05, p0: 6.0, drift: 0.015, expect: "SAFE" },
  { name: "代偿风险渐进", start: 40, end: 80, amp: [65, 35], fatigueRate: 0.028, fatigueRecovery: 0.05, p0: [6.0, 7.5], drift: 0.05, expect: "RISK" },
  { name: "超限触发", start: 80, end: 100, amp: [35, 30], fatigueRate: 0.02, fatigueRecovery: 0.05, p0: 7.5, drift: 0.05, expect: "OVER" },
  { name: "恢复", start: 100, end: 180, amp: [30, 60], fatigueRate: 0, fatigueRecovery: 0.05, p0: 6.0, drift: 0.01, expect: "SAFE" },
];

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

export function paramsAt(t: number): SessionParams {
  const ph = TIMELINE.find((p) => t >= p.start && t < p.end) ?? TIMELINE[TIMELINE.length - 1];
  const u = (t - ph.start) / (ph.end - ph.start);
  const amp = Array.isArray(ph.amp) ? lerp(ph.amp[0], ph.amp[1], u) : ph.amp;
  const p0 = Array.isArray(ph.p0) ? lerp(ph.p0[0], ph.p0[1], u) : ph.p0;
  return { amplitude: amp, fatigueRate: ph.fatigueRate, fatigueRecovery: ph.fatigueRecovery, pressureBase: p0, pressureDrift: ph.drift };
}

export function phaseNameAt(t: number): string {
  return TIMELINE.find((p) => t >= p.start && t < p.end)?.name ?? "恢复";
}

export const SESSION_LEN = 180;
export const EVENTS = [
  { t: 40, label: "阶段切换：幅度开始下降，疲劳加速" },
  { t: 62, label: "预计 RISK：纠正提示卡弹出" },
  { t: 84, label: "预计 OVER：停止加压、立即泄气" },
  { t: 100, label: "恢复阶段：继续训练" },
  { t: 112, label: "预计回 SAFE" },
] as const;

/** 手动模式滑块 → 参数覆盖 */
export function manualParams(amplitude: number, fatigueMul: number, pressureOffset: number): SessionParams {
  const base = paramsAt(0);
  return {
    amplitude: Math.max(5, Math.min(90, amplitude)),
    fatigueRate: base.fatigueRate * fatigueMul,
    fatigueRecovery: 0.05,
    pressureBase: base.pressureBase + pressureOffset,
    pressureDrift: 0.02 * fatigueMul,
  };
}

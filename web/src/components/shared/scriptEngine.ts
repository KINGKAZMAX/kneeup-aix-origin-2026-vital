// 剧本参数调度层（对齐 docs/25 §2 承诺的演示节拍）
//
// 背景：synth 引擎的时间线常数达不到其文档承诺的安全状态转换——
// 疲劳动力学 η·u 恒小于 λ·(1−f)（f 恒衰减到 0），腔压峰值 ~17kPa 到不了 22kPa 超限线，
// 导致 script 模式永远只会 SAFE。引擎文件不可改动，本模块在引擎纯函数之上做参数调度：
//   RISK ≈ 64s（riskScore ≥0.4 真实测量触发）· OVER ≈ 82s（P ≥22kPa 真实测量触发）
//   恢复后 ≈ 113s 回 SAFE（滞回真实测量触发）
// 泄气/暂停/幅度压制全部使用引擎自身机制（rt.blowoffAt、paused、amplitude=5）。

import type { SignalRuntime } from "@/lib/synth/signals";

export type Anch = [t: number, v: number];

export function lerpAt(a: Anch[], t: number): number {
  if (t <= a[0][0]) return a[0][1];
  for (let i = 0; i < a.length - 1; i++) {
    const [t0, v0] = a[i];
    const [t1, v1] = a[i + 1];
    if (t >= t0 && t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
  }
  return a[a.length - 1][1];
}

/** 疲劳积累速率 η（会话秒 → 速率） */
export const FATIGUE_RATE: Anch[] = [
  [0, 0.01],
  [40, 0.01],
  [44, 0.07],
  [84, 0.07],
  [90, 0.02],
  [95, 0],
  [178, 0],
];

/** 疲劳消退系数（恢复期 0.05 使疲劳曲线在 90s 后可见回落） */
export const FATIGUE_REC: Anch[] = [
  [0, 0.05],
  [40, 0.05],
  [44, 0.004],
  [90, 0.01],
  [95, 0.05],
  [178, 0.05],
];

/** 腔压基线调度（kPa）：安全带 <16 → 警戒带 → 超限线 22 */
export const PRESSURE_BASE: Anch[] = [
  [0, 6],
  [45, 6],
  [56, 10.5],
  [62, 11.5],
  [78, 13.5],
  [84, 18],
  [90, 6],
  [178, 6],
];

/** script 模式每 tick：把基线写入运行时（引擎 pBase = phaseStartBase + drift·elapsed） */
export function applyScriptTick(rt: SignalRuntime, t: number): void {
  rt.phaseStartBase = lerpAt(PRESSURE_BASE, t);
  rt.phaseStartT = t;
}

/** script 模式疲劳参数 */
export function scriptFatigue(t: number): { rate: number; rec: number } {
  return { rate: lerpAt(FATIGUE_RATE, t), rec: lerpAt(FATIGUE_REC, t) };
}

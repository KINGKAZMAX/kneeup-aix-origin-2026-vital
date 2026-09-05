// 三路信号数学模型（docs/25 §1）：屈膝角度θ / sEMG包络E / 关节腔压P
// 全部合成数据 · 10Hz · 纯函数可复现

import { makeNoise, DEMO_SEED } from "./rng";

export interface SessionParams {
  /** 屈膝幅度（度） */
  amplitude: number;
  /** 疲劳积累速率 η */
  fatigueRate: number;
  /** 疲劳消退速率 λ（恢复期用） */
  fatigueRecovery: number;
  /** 腔压基线 P0 (kPa) */
  pressureBase: number;
  /** 基线漂移斜率 d */
  pressureDrift: number;
}

export interface SynthFrame {
  t: number;
  emg: number;
  mdf: number;
  angle: number;
  pressure: number;
  riskScore: number;
  compIdx: number;
  fatigue: number;
}

export const SIG = {
  T_CYCLE: 6.0,
  E_REST: 8,
  E_PEAK: 120,
  K_F: 0.6,
  K_P: 14,
  C_COMP: 0.5,
  MDF_BASE: 92,
  MDF_FATIGUE_SPAN: 28,
  P_SAFE: 16,
  P_OVER: 22,
  ANGLE_MAX: 90,
  F_INIT: 0.05,
} as const;

export interface SignalRuntime {
  t: number;
  fatigue: number;
  phaseStartT: number;
  phaseStartBase: number;
  noise: ReturnType<typeof makeNoise>;
  /** OVER泄气后的压力衰减 */
  blowoffAt: number | null;
}

export function initRuntime(sessionId: string): SignalRuntime {
  return {
    t: 0,
    fatigue: SIG.F_INIT,
    phaseStartT: 0,
    phaseStartBase: 6.0,
    noise: makeNoise(`knee:demo:${DEMO_SEED}:${sessionId}`),
    blowoffAt: null,
  };
}

/** 阶段参数插值：由timeline给出当前参数，此处只做信号物理 */
export function stepSignal(rt: SignalRuntime, p: SessionParams, dt: number, paused: boolean): SynthFrame {
  const t = rt.t;
  const { g, n1 } = rt.noise;

  // —— 屈膝角度：升余弦半波周期 ——
  const cycleT = p.amplitude <= 6 ? 4.0 : SIG.T_CYCLE;
  const phi = (t % cycleT) / cycleT;
  const s = 0.5 * (1 - Math.cos(2 * Math.PI * phi));
  const amp = p.amplitude * (1 + 0.03 * n1());
  const tremor = 0.8 * Math.sin(2 * Math.PI * 0.3 * t);
  const angle = Math.max(0, amp * s + tremor);

  // —— sEMG包络：负荷形状 × 疲劳放大 ——
  const L = Math.pow(Math.sin((angle * Math.PI) / 180), 1.2);
  const F = 1 + SIG.K_F * rt.fatigue;
  const E = SIG.E_REST + (SIG.E_PEAK - SIG.E_REST) * L * F + (0.05 * SIG.E_PEAK * L * F) * g(1) + 4 * g(1);
  const emg = Math.max(0, E);
  const mdf = SIG.MDF_BASE - SIG.MDF_FATIGUE_SPAN * rt.fatigue;

  // —— 关节腔压：角度相位 + 基线漂移 ——
  const phaseElapsed = t - rt.phaseStartT;
  const pBase =
    rt.phaseStartBase + p.pressureDrift * phaseElapsed + 0.4 * Math.sin(2 * Math.PI * 0.2 * t);
  let pressure = pBase + SIG.K_P * (angle / 90) * (1 + SIG.C_COMP * rt.fatigue) + 0.3 * g(1);
  if (rt.blowoffAt !== null) {
    // OVER泄气：P指数衰减 τ=0.4s
    const since = t - rt.blowoffAt;
    pressure = 5 + (pressure - 5) * Math.exp(-since / 0.4);
  }
  pressure = Math.max(0, pressure);

  // —— 疲劳动力学（暂停时快速消退） ——
  if (!paused) {
    const u = L;
    rt.fatigue += (p.fatigueRate * u - p.fatigueRecovery * (1 - rt.fatigue)) * dt;
  } else {
    rt.fatigue += (0 - 0.08 * (1 - rt.fatigue)) * dt;
  }
  rt.fatigue = Math.min(1, Math.max(0, rt.fatigue));

  // —— 风险指标（safety.ts复用） ——
  const A_REF = 65;
  const compIdx = Math.min(
    1,
    Math.max(0, 0.6 * Math.max(0, (A_REF - p.amplitude) / A_REF) + 0.4 * Math.max(0, (92 - mdf) / 40))
  );
  const pExcess = Math.min(1, Math.max(0, (pressure - SIG.P_SAFE) / (SIG.P_OVER - SIG.P_SAFE)));
  const riskScore = Math.min(1, Math.max(0, 0.4 * rt.fatigue + 0.35 * compIdx + 0.25 * pExcess));

  rt.t += dt;
  return { t, emg, mdf, angle, pressure, riskScore, compIdx, fatigue: rt.fatigue };
}

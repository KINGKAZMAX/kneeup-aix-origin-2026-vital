// 报告兜底：未经过训练页时，用引擎纯函数离线复算整场脚本会话
// 与 useSession 完全同构（同种子、同步长、同状态机），输出逐点一致、可复现

import { initRuntime, stepSignal, type SynthFrame } from "@/lib/synth/signals";
import { initSafety, stepSafety } from "@/lib/synth/safety";
import { paramsAt } from "@/lib/synth/timeline";
import type { SessionSummary } from "./types";

const DT = 0.1;
const RESUME_COOLDOWN = 5; // OVER 后模拟用户「稍作休息」5s 后点继续

export function simulateFrames(
  sessionId: string,
  until = 178
): { frames: SynthFrame[]; overTimes: number[] } {
  const rt = initRuntime(sessionId);
  const st = initSafety();
  const frames: SynthFrame[] = [];
  const overTimes: number[] = [];
  let paused = false;
  let blowoffAt: number | null = null;
  let resumeAt: number | null = null;
  let phaseStart = { t: 0, base: paramsAt(0).pressureBase };

  while (rt.t < until) {
    const t = rt.t;
    const p = paramsAt(t);
    // 与 useSession 相同：阶段切换时更新压力基线起点
    if (p.pressureBase !== phaseStart.base) {
      phaseStart = { t, base: p.pressureBase };
      rt.phaseStartT = t;
      rt.phaseStartBase = p.pressureBase;
    }
    rt.blowoffAt = blowoffAt;
    const frame = stepSignal(rt, p, DT, paused);
    const state = stepSafety(st, { pressure: frame.pressure, riskScore: frame.riskScore, paused }, DT);
    if (state === "OVER" && blowoffAt === null) {
      blowoffAt = rt.t;
      paused = true;
      overTimes.push(frame.t);
      resumeAt = rt.t + RESUME_COOLDOWN;
    }
    // 模拟「继续训练」：冷却结束且压力已回落满足恢复条件
    if (paused && resumeAt !== null && rt.t >= resumeAt && st.pUnderResume >= 3) {
      paused = false;
      blowoffAt = null;
      resumeAt = null;
      st.state = "RISK";
    }
    frames.push(frame);
  }
  return { frames, overTimes };
}

export function buildSummary(
  frames: SynthFrame[],
  overTimes: number[],
  endedBy: "auto" | "manual",
  sessionId = "demo-90s"
): SessionSummary {
  const peakPressure = frames.reduce((m, f) => Math.max(m, f.pressure), 0);
  const peakAngle = frames.reduce((m, f) => Math.max(m, f.angle), 0);
  const avgEmg = frames.length ? frames.reduce((s, f) => s + f.emg, 0) / frames.length : 0;
  return {
    sessionId,
    endedBy,
    durationSec: frames.length ? frames[frames.length - 1].t : 0,
    overCount: overTimes.length,
    peakPressure,
    peakAngle,
    avgEmg,
    overTimes,
    frames,
  };
}

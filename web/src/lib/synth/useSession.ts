"use client";
// 训练会话hook：时间线+信号+安全状态机 → 10Hz帧流（docs/25 §0）
// 三端共用：患者端订阅、模拟器控制、医生端只读回放

import { useEffect, useRef, useState, useCallback } from "react";
import { initRuntime, stepSignal, type SignalRuntime, type SynthFrame } from "./signals";
import { initSafety, stepSafety, type SafetyRuntime, type SafetyState } from "./safety";
import { paramsAt, SESSION_LEN, EVENTS } from "./timeline";

const DT = 0.1; // 100ms
const WINDOW = 600; // 实时图60s滑动窗口

export type SessionMode = "script" | "manual";

export interface SessionControls {
  amplitude: number;
  fatigueMul: number;
  pressureOffset: number;
  timeScale: number;
}

export interface SessionSnapshot {
  frame: SynthFrame;
  state: SafetyState;
  paused: boolean;
  running: boolean;
  window: SynthFrame[];
  phase: string;
  overCount: number;
}

export function useSession(sessionId: string, mode: SessionMode, controls: SessionControls) {
  const rtRef = useRef<SignalRuntime | null>(null);
  const stRef = useRef<SafetyRuntime>(initSafety());
  const windowRef = useRef<SynthFrame[]>([]);
  const pausedRef = useRef(false);
  const blowoffRef = useRef<number | null>(null);
  const phaseStartRef = useRef<{ t: number; base: number }>({ t: 0, base: 6.0 });
  const overCountRef = useRef(0);
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  const [snap, setSnap] = useState<SessionSnapshot>({
    frame: { t: 0, emg: 8, mdf: 92, angle: 0, pressure: 6, riskScore: 0, compIdx: 0, fatigue: 0.05 },
    state: "SAFE",
    paused: false,
    running: false,
    window: [],
    phase: "安全区",
    overCount: 0,
  });

  const reset = useCallback(() => {
    rtRef.current = initRuntime(sessionId);
    stRef.current = initSafety();
    windowRef.current = [];
    pausedRef.current = false;
    blowoffRef.current = null;
    phaseStartRef.current = { t: 0, base: 6.0 };
    overCountRef.current = 0;
  }, [sessionId]);

  useEffect(() => {
    reset();
    rtRef.current = initRuntime(sessionId);
    const id = setInterval(() => {
      const rt = rtRef.current;
      if (!rt) return;
      const c = controlsRef.current;
      // 多步推进：dt=0.1s × timeScale
      for (let i = 0; i < Math.max(1, Math.round(c.timeScale)); i++) {
        const t = rt.t;
        const p =
          mode === "script"
            ? paramsAt(t)
            : {
                amplitude: c.amplitude,
                fatigueRate: 0.02 * c.fatigueMul,
                fatigueRecovery: 0.05,
                pressureBase: 6.0 + c.pressureOffset,
                pressureDrift: 0.02 * c.fatigueMul,
              };
        // 阶段切换时更新压力基线起点
        const scriptBase = mode === "script" ? paramsAt(t).pressureBase : null;
        if (scriptBase !== null && scriptBase !== phaseStartRef.current.base) {
          phaseStartRef.current = { t, base: scriptBase };
          rt.phaseStartT = t;
          rt.phaseStartBase = scriptBase;
        }
        const frame = stepSignal(rt, p, DT, pausedRef.current);
        const state = stepSafety(
          stRef.current,
          { pressure: frame.pressure, riskScore: frame.riskScore, paused: pausedRef.current },
          DT
        );
        if (state === "OVER" && blowoffRef.current === null) {
          blowoffRef.current = rt.t;
          rt.blowoffAt = rt.t;
          pausedRef.current = true;
          overCountRef.current += 1;
        }
        windowRef.current.push(frame);
        if (windowRef.current.length > WINDOW) windowRef.current.shift();
        setSnap({
          frame,
          state,
          paused: pausedRef.current,
          running: rt.t < SESSION_LEN,
          window: [...windowRef.current],
          phase: phaseNameSafe(rt.t),
          overCount: overCountRef.current,
        });
      }
    }, 100);
    return () => clearInterval(id);
  }, [sessionId, mode, reset]);

  const resume = useCallback(() => {
    if (stRef.current.state === "OVER" || pausedRef.current) {
      pausedRef.current = false;
      blowoffRef.current = null;
      if (rtRef.current) rtRef.current.blowoffAt = null;
      stRef.current.state = "RISK"; // 恢复期幅度缓升，不直接跳SAFE
    }
  }, []);

  return { snap, resume, reset, events: EVENTS };
}

function phaseNameSafe(t: number): string {
  const names: [number, string][] = [
    [40, "安全区"],
    [80, "代偿风险渐进"],
    [100, "超限触发"],
    [181, "恢复"],
  ];
  return names.find(([end]) => t < end)?.[1] ?? "恢复";
}

"use client";
// 屏C · 训练模式（docs/24 §2.3）
// useSession("demo-90s","script",controls) 驱动：三实时图 + 安全状态灯 + RISK纠正卡 + OVER全屏遮罩 + 控制条

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/lib/synth/useSession";
import { STATE_UI, type SafetyState } from "@/lib/synth/safety";
import type { SynthFrame } from "@/lib/synth/signals";
import StatusLight from "@/components/shared/StatusLight";
import { onBus, type BusMsg } from "@/components/shared/telemetryBus";
import { fmtClock } from "@/components/shared/format";
import LiveCharts from "./LiveCharts";
import type { SessionSummary } from "./types";

const SESSION_END_T = 178; // t≥178 自动收尾（docs/25 §2 事件点）
const SESSION_ID = "demo-90s";

export default function TrainingView({ onFinish }: { onFinish: (s: SessionSummary) => void }) {
  const [timeScale, setTimeScale] = useState<1 | 3>(1);
  const controls = useMemo(
    () => ({ amplitude: 65, fatigueMul: 1, pressureOffset: 0, timeScale }),
    [timeScale]
  );
  const { snap, resume, reset } = useSession(SESSION_ID, "script", controls);

  // UI级暂停（引擎无外部暂停接口）：冻结图表显示，引擎继续推进
  const [frozen, setFrozen] = useState(false);
  const frozenWindowRef = useRef<SynthFrame[]>([]);
  const [riskDismissed, setRiskDismissed] = useState(false);
  const [deviceLive, setDeviceLive] = useState(false);

  // 全量历史（报告用）：从滑动窗口增量合并，t 单调去重
  const framesRef = useRef<SynthFrame[]>([]);
  const lastTRef = useRef(-1);
  const overTimesRef = useRef<number[]>([]);
  const prevStateRef = useRef<SafetyState>("SAFE");
  const finishedRef = useRef(false);
  const deviceSeenRef = useRef(0);

  const finish = useCallback(
    (endedBy: "auto" | "manual") => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const frames = framesRef.current;
      onFinish({
        sessionId: SESSION_ID,
        endedBy,
        durationSec: Math.max(0, lastTRef.current),
        overCount: overTimesRef.current.length,
        peakPressure: frames.reduce((m, f) => Math.max(m, f.pressure), 0),
        peakAngle: frames.reduce((m, f) => Math.max(m, f.angle), 0),
        avgEmg: frames.length ? frames.reduce((s, f) => s + f.emg, 0) / frames.length : 0,
        overTimes: [...overTimesRef.current],
        frames,
      });
    },
    [onFinish]
  );

  // 每 tick：合并全量帧 / 检测 OVER 转换 / 自动收尾
  useEffect(() => {
    const w = snap.window;
    for (let i = 0; i < w.length; i++) {
      const f = w[i];
      if (f.t > lastTRef.current) {
        framesRef.current.push(f);
        lastTRef.current = f.t;
      }
    }
    if (snap.state === "OVER" && prevStateRef.current !== "OVER") {
      overTimesRef.current.push(snap.frame.t);
    }
    prevStateRef.current = snap.state;
    if (!finishedRef.current && snap.frame.t >= SESSION_END_T) finish("auto");
  }, [snap, finish]);

  // 模拟器在线感知（跨Tab心跳）
  useEffect(() => {
    const off = onBus((msg: BusMsg) => {
      if (msg.sessionId === SESSION_ID) deviceSeenRef.current = Date.now();
    });
    const id = setInterval(() => setDeviceLive(Date.now() - deviceSeenRef.current < 4000), 1000);
    return () => {
      off();
      clearInterval(id);
    };
  }, []);

  const handleReset = useCallback(() => {
    reset();
    framesRef.current = [];
    lastTRef.current = -1;
    overTimesRef.current = [];
    prevStateRef.current = "SAFE";
    finishedRef.current = false;
    frozenWindowRef.current = [];
    setFrozen(false);
    setRiskDismissed(false);
  }, [reset]);

  const toggleFreeze = useCallback(() => {
    if (!frozen) frozenWindowRef.current = snap.window;
    setFrozen((v) => !v);
  }, [frozen, snap.window]);

  const display = frozen ? frozenWindowRef.current : snap.window;
  const progress = Math.min(100, (snap.frame.t / 180) * 100);

  return (
    <div className="space-y-4">
      {/* 头部条：动作/进度 + 设备联动 + 状态灯 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div>
          <div className="text-lg font-semibold text-slate-100">训练进行中 · 坐姿伸膝（演示脚本）</div>
          <div className="mt-1 font-mono text-xs text-slate-400">
            T+{fmtClock(snap.frame.t)} / 03:00 · 阶段：{snap.phase} · 会话 {SESSION_ID} × {timeScale}
          </div>
          <div className="mt-2 h-1 w-56 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#38E1D4] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {deviceLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] text-emerald-300">
              ● 设备模拟器推流中（联动）
            </span>
          )}
          <StatusLight state={snap.state} />
        </div>
      </div>

      {/* 三张实时图 + RISK纠正提示卡浮层 */}
      <div className="relative">
        <LiveCharts frames={display} />
        {snap.state === "RISK" && !riskDismissed && (
          <div className="absolute left-1/2 top-2 w-[94%] max-w-xl -translate-x-1/2 rounded-xl border border-[#FFC24B]/60 bg-[#FFC24B]/10 p-4 shadow-[0_8px_32px_rgba(4,12,24,0.45)] backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[#FFC24B]">⚡ 代偿风险提示</div>
                <p className="mt-1 text-sm text-slate-200">{STATE_UI.RISK.msg}</p>
                <p className="mt-1 text-xs text-slate-400">纠正提示：放慢速度，减小屈膝幅度，让大腿前侧发力更集中。</p>
              </div>
              <button
                type="button"
                onClick={() => setRiskDismissed(true)}
                className="shrink-0 rounded-lg border border-white/20 px-3 py-1 text-xs text-slate-300 transition hover:text-cyan-300"
              >
                知道了
              </button>
            </div>
          </div>
        )}
      </div>

      {frozen && (
        <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-center text-sm text-slate-300">
          已暂停（图表已冻结）· 引擎在后台继续计时
        </div>
      )}

      {/* 底部控制条 */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <button
          type="button"
          onClick={toggleFreeze}
          className="rounded-xl border border-white/20 px-5 py-2.5 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-300"
        >
          {frozen ? "▶ 继续" : "⏸ 暂停"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-white/20 px-5 py-2.5 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-300"
        >
          ↺ 重置
        </button>
        <div className="flex overflow-hidden rounded-xl border border-white/15">
          <button
            type="button"
            onClick={() => setTimeScale(1)}
            className={`px-4 py-2.5 font-mono text-sm transition ${timeScale === 1 ? "bg-cyan-400/15 text-cyan-300" : "text-slate-400 hover:text-slate-200"}`}
          >
            1x
          </button>
          <button
            type="button"
            onClick={() => setTimeScale(3)}
            className={`px-4 py-2.5 font-mono text-sm transition ${timeScale === 3 ? "bg-cyan-400/15 text-cyan-300" : "text-slate-400 hover:text-slate-200"}`}
          >
            3x
          </button>
        </div>
        <span className="text-xs text-slate-500">3x = 路演快速档（180s → 60s）</span>
        <button
          type="button"
          onClick={() => finish("manual")}
          className="ml-auto rounded-xl border border-[#FF5A5A]/50 bg-[#FF5A5A]/10 px-5 py-2.5 text-sm font-medium text-[#FF5A5A] transition hover:bg-[#FF5A5A]/20"
        >
          结束训练 · 生成报告
        </button>
      </div>

      {/* OVER 全屏轻遮罩 */}
      {snap.state === "OVER" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1D33]/70 backdrop-blur-sm">
          <div
            className="w-[min(92vw,480px)] rounded-2xl border border-[#FF5A5A]/70 p-6 text-center shadow-[0_0_60px_rgba(255,90,90,0.25)]"
            style={{ background: "rgba(255,90,90,0.12)" }}
          >
            <div className="mx-auto mb-3 h-4 w-4 animate-pulse rounded-full bg-[#FF5A5A] shadow-[0_0_24px_#FF5A5A]" />
            <div className="text-xl font-semibold text-[#FF5A5A]">压力超限 · 设备已自动保护</div>
            <p className="mt-3 text-sm leading-relaxed text-slate-100">{STATE_UI.OVER.msg}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={resume}
                className="rounded-xl bg-[#38E1D4] px-8 py-3 font-semibold text-[#06202B] shadow-[0_0_16px_rgba(56,225,212,0.35)] transition hover:brightness-110"
              >
                继续训练
              </button>
              <button
                type="button"
                onClick={() => finish("manual")}
                className="rounded-xl border border-[#FF5A5A]/50 px-6 py-3 text-sm text-[#FF5A5A] transition hover:bg-[#FF5A5A]/20"
              >
                结束训练
              </button>
            </div>
            <p className="mt-4 font-mono text-[11px] text-slate-400">已执行：停止加压 ✓ 立即泄气 ✓ 提示暂停 ✓</p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
// 设备模拟器 /simulator：虚拟 AIR-FLOW Knee+
// 脚本模式（EVENTS时间轴）/ 手动模式（四滑块）+ 三态大灯 + 实时帧读数 + 事件日志 + 推流说明

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useSession } from "@/lib/synth/useSession";
import { STATE_UI, type SafetyState } from "@/lib/synth/safety";
import { SESSION_LEN, TIMELINE } from "@/lib/synth/timeline";
import BackHome from "@/components/shared/BackHome";
import { postBus } from "@/components/shared/telemetryBus";
import { fmtT } from "@/components/shared/format";

const SESSION_ID = "demo-90s";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const GRID = "rgba(230,241,255,0.06)";
const AXIS_TICK = { fill: "#5A7184", fontSize: 10, fontFamily: MONO };

const PROTECT_STEPS = ["停止加压", "立即泄气", "提示暂停"] as const;

interface LogEntry {
  id: number;
  stamp: string;
  kind: "STATE" | "PHASE" | "ACT" | "PUSH" | "SYS";
  text: string;
}

const KIND_STYLE: Record<LogEntry["kind"], string> = {
  STATE: "text-cyan-300",
  PHASE: "text-slate-500",
  ACT: "text-[#FF5A5A]",
  PUSH: "text-[#FFC24B]",
  SYS: "text-emerald-300",
};

function Readout({ label, value, unit, color = "#E6F1FF" }: { label: string; value: string; unit: string; color?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0A182B] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-xl font-bold" style={{ color }}>
        {value}
        <span className="ml-1 text-[10px] font-normal text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

export default function SimulatorPage() {
  const [mode, setMode] = useState<"script" | "manual">("script");
  const [speed, setSpeed] = useState<1 | 2 | 3>(1);
  const [amplitude, setAmplitude] = useState(65);
  const [fatigueMul, setFatigueMul] = useState(1);
  const [pressureOffset, setPressureOffset] = useState(0);
  const [manualSpeed, setManualSpeed] = useState(1);
  const [frozen, setFrozen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const controls = useMemo(
    () => ({
      amplitude,
      fatigueMul,
      pressureOffset,
      timeScale: mode === "script" ? speed : manualSpeed,
    }),
    [amplitude, fatigueMul, pressureOffset, speed, manualSpeed, mode]
  );
  const { snap, resume, reset, events } = useSession(SESSION_ID, mode, controls);

  // —— 事件日志：状态/阶段转换记录 ——
  const logIdRef = useRef(0);
  const prevStateRef = useRef<SafetyState>("SAFE");
  const prevPhaseRef = useRef<string>("");
  const frozenWindowRef = useRef<typeof snap.window>([]);

  const addLog = useCallback((kind: LogEntry["kind"], text: string, stamp = "T+00:00.0") => {
    logIdRef.current += 1;
    const entry: LogEntry = { id: logIdRef.current, stamp, kind, text };
    setLogs((l) => [...l.slice(-299), entry]);
  }, []);

  useEffect(() => {
    addLog("SYS", `设备就绪 · 会话 ${SESSION_ID}（${mode === "script" ? "自动脚本" : "手动"}模式）`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = fmtT(snap.frame.t);
    if (snap.phase !== prevPhaseRef.current) {
      const first = prevPhaseRef.current === "";
      prevPhaseRef.current = snap.phase;
      if (!first) addLog("PHASE", `进入阶段：${snap.phase}`, t);
    }
    if (snap.state !== prevStateRef.current) {
      const prev = prevStateRef.current;
      prevStateRef.current = snap.state;
      addLog("STATE", `${prev} → ${snap.state}`, t);
      if (snap.state === "OVER") {
        addLog("ACT", "腔压超过支撑上限 · 执行保护", t);
        addLog("ACT", "停止加压 ✓  立即泄气 ✓  提示暂停 ✓", t);
      }
      if (snap.state === "RISK") addLog("PUSH", "已推送患者端：显示代偿纠正提示卡", t);
      if (snap.state === "SAFE" && prev === "RISK") addLog("PUSH", "已推送患者端：回到安全区间", t);
      postBus({ type: "state", sessionId: SESSION_ID, mode, state: snap.state, t: snap.frame.t });
    }
  }, [snap, mode, addLog]);

  // —— 推流心跳（跨Tab） ——
  const liveRef = useRef({ state: snap.state, t: snap.frame.t, mode });
  liveRef.current = { state: snap.state, t: snap.frame.t, mode };
  useEffect(() => {
    postBus({ type: "hello", sessionId: SESSION_ID, mode });
    const id = setInterval(() => {
      const s = liveRef.current;
      postBus({ type: "hello", sessionId: SESSION_ID, mode: s.mode, state: s.state, t: s.t });
    }, 2000);
    return () => {
      clearInterval(id);
      postBus({ type: "bye", sessionId: SESSION_ID });
    };
  }, [mode]);

  // 日志自动滚底
  const logBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = logBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const handleModeChange = (m: "script" | "manual") => {
    if (m === mode) return;
    setMode(m);
    prevStateRef.current = "SAFE";
    prevPhaseRef.current = "";
    frozenWindowRef.current = [];
    setFrozen(false);
    addLog("SYS", `切换到${m === "script" ? "自动脚本" : "手动"}模式 · 会话已重置`);
  };

  const handleReset = () => {
    reset();
    prevStateRef.current = "SAFE";
    frozenWindowRef.current = [];
    setFrozen(false);
    addLog("SYS", "手动复位 · 会话已重置");
  };

  const toggleFreeze = () => {
    if (!frozen) frozenWindowRef.current = snap.window;
    setFrozen((v) => !v);
  };

  const f = snap.frame;
  const display = frozen ? frozenWindowRef.current : snap.window;
  const miniData = useMemo(
    () => display.filter((_, i) => i % 3 === 0).map((fr) => ({ t: Math.round(fr.t * 10) / 10, pressure: Math.round(fr.pressure * 10) / 10 })),
    [display]
  );
  const progress = Math.min(100, (f.t / SESSION_LEN) * 100);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <BackHome />
        <span className="font-mono text-xs text-slate-500">DEVICE SIMULATOR · /simulator</span>
      </div>

      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">设备模拟器 · 虚拟 AIR-FLOW Knee+</h1>
          <p className="mt-1 text-sm text-slate-400">复现硬件安全状态机：安全 → 代偿风险 → 超限（停止加压 · 立即泄气 · 提示暂停）</p>
        </div>
        {/* 模式切换 */}
        <div className="flex overflow-hidden rounded-xl border border-white/15">
          {(["script", "manual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleModeChange(m)}
              className={`px-5 py-2.5 text-sm transition ${
                mode === m ? "bg-cyan-400/15 font-medium text-cyan-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m === "script" ? "自动脚本" : "手动"}
            </button>
          ))}
        </div>
      </header>

      {/* 三态大灯 + 会话进度 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <StatusLightBig state={snap.state} />
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <div className="font-mono text-sm text-slate-300">
            T+{fmtT(f.t).slice(2)} / 03:00 · 阶段：{snap.phase} · 超限 {snap.overCount} 次
          </div>
          <div className="h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#38E1D4] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="font-mono text-[10px] text-slate-500">会话 {SESSION_ID} × {mode === "script" ? speed : manualSpeed}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 左：脚本控制台 / 右：手动滑块 */}
        {mode === "script" ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-100">自动脚本控制台（演示推荐）</h2>
            {/* 阶段时间轴 */}
            <div className="mb-4 space-y-2">
              {TIMELINE.map((ph) => {
                const active = f.t >= ph.start && f.t < ph.end;
                const done = f.t >= ph.end;
                return (
                  <div
                    key={ph.name}
                    className={`rounded-xl border px-3 py-2 transition ${
                      active ? "border-cyan-400/60 bg-cyan-400/10" : done ? "border-white/5 bg-white/[0.02] opacity-60" : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className={active ? "font-medium text-cyan-200" : "text-slate-300"}>
                        {active ? "▶ " : done ? "✓ " : "· "}
                        {ph.name}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        {ph.start}s–{ph.end}s · 预期 {ph.expect}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-cyan-400/70"
                        style={{ width: `${Math.min(100, Math.max(0, ((f.t - ph.start) / (ph.end - ph.start)) * 100))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* EVENTS 事件点 */}
            <div className="mb-4 rounded-xl border border-white/10 bg-[#0A182B] p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Events · 关键事件点</div>
              <ul className="space-y-1.5">
                {events.map((ev) => {
                  const reached = f.t >= ev.t;
                  return (
                    <li key={ev.t} className={`flex items-baseline gap-2 font-mono text-xs ${reached ? "text-cyan-300" : "text-slate-500"}`}>
                      <span className="w-16 shrink-0">T+{String(ev.t).padStart(3, "0")}s</span>
                      <span>{reached ? "✓" : "○"}</span>
                      <span className={reached ? "" : "text-slate-600"}>{ev.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            {/* 控制 */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleFreeze}
                className="rounded-xl border border-white/20 px-5 py-2.5 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-300"
              >
                {frozen ? "▶ 继续推流" : "⏸ 暂停推流"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-white/20 px-5 py-2.5 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-300"
              >
                ↺ 复位
              </button>
              {snap.state === "OVER" && (
                <button
                  type="button"
                  onClick={resume}
                  className="rounded-xl bg-[#38E1D4] px-5 py-2.5 text-sm font-semibold text-[#06202B] shadow-[0_0_16px_rgba(56,225,212,0.35)] transition hover:brightness-110"
                >
                  ▶ 恢复推流（泄气完成）
                </button>
              )}
              <div className="ml-auto flex overflow-hidden rounded-xl border border-white/15">
                {([1, 2, 3] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={`px-4 py-2.5 font-mono text-sm transition ${speed === s ? "bg-cyan-400/15 text-cyan-300" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-100">手动滑块 · 直接控制设备参数</h2>
            <div className="space-y-4">
              <Slider label="屈膝幅度 amplitude" value={amplitude} min={20} max={90} step={1} unit="°" onChange={setAmplitude} />
              <Slider label="疲劳速度 fatigueMul" value={fatigueMul} min={0.2} max={3} step={0.1} unit="×" onChange={setFatigueMul} />
              <Slider label="腔压基线 pressureOffset" value={pressureOffset} min={-3} max={3} step={0.5} unit="kPa" onChange={setPressureOffset} />
              <Slider label="时间倍率 timeScale" value={manualSpeed} min={1} max={3} step={1} unit="×" onChange={setManualSpeed} />
            </div>
            <p className="mt-4 rounded-xl border border-white/10 bg-[#0A182B] px-3 py-2 text-xs leading-relaxed text-slate-500">
              提示：把幅度拉到 80–90°、腔压基线 +3 kPa，几秒内即可手动触发超限（红灯）；切换模式会重置会话。
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleFreeze}
                className="rounded-xl border border-white/20 px-5 py-2.5 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-300"
              >
                {frozen ? "▶ 继续推流" : "⏸ 暂停推流"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-white/20 px-5 py-2.5 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-300"
              >
                ↺ 复位
              </button>
              {snap.state === "OVER" && (
                <button
                  type="button"
                  onClick={resume}
                  className="rounded-xl bg-[#38E1D4] px-5 py-2.5 text-sm font-semibold text-[#06202B] transition hover:brightness-110"
                >
                  ▶ 恢复推流
                </button>
              )}
            </div>
          </section>
        )}

        {/* 推流说明卡 */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-100">推流到患者端</h2>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
            正在推流 · 会话 {SESSION_ID}
          </div>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-400">
            <li>患者端训练页与模拟器共用同一会话 <span className="font-mono text-slate-300">demo-90s</span>、同一随机种子——引擎输出逐点一致，即开即联动。</li>
            <li>联动演示：新开一个 Tab 打开 <span className="font-mono text-slate-300">/patient</span> → 打卡提交 → 开始训练，即可看到与这里相同的实时曲线与安全状态。</li>
            <li>状态转换会实时推送：黄色 → 患者端弹出纠正提示卡；红色 → 患者端弹出「停止加压 · 立即泄气」遮罩。</li>
            <li>数据全部为合成信号（10 Hz，种子可复现），无真实设备与真实患者数据。</li>
          </ul>
          {/* 腔压迷你预览 */}
          <div className="mt-4 rounded-xl border border-white/10 bg-[#0A182B] p-3">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">Pressure Preview · 推流预览</span>
              <span className="font-mono text-xs font-bold text-[#FF9F45]">{f.pressure.toFixed(1)} kPa</span>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={miniData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="t" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={40} hide />
                  <YAxis domain={[0, 30]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={30} ticks={[0, 16, 22, 30]} />
                  <ReferenceArea y1={22} y2={30} fill="rgba(255,90,90,0.12)" stroke="none" ifOverflow="visible" />
                  <ReferenceLine y={16} stroke="#FFC24B" strokeWidth={1} strokeDasharray="5 4" ifOverflow="visible" />
                  <ReferenceLine y={22} stroke="#FF5A5A" strokeWidth={1} strokeDasharray="5 4" ifOverflow="visible" />
                  <Line type="monotone" dataKey="pressure" stroke="#FF9F45" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>

      {/* 实时数据帧读数 */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-100">实时数据帧（10 Hz · 合成）</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Readout label="sEMG" value={f.emg.toFixed(0)} unit="μV" color="#38E1D4" />
          <Readout label="MDF" value={f.mdf.toFixed(1)} unit="Hz" color="#A78BFA" />
          <Readout label="Angle" value={f.angle.toFixed(1)} unit="°" color="#A78BFA" />
          <Readout label="Pressure" value={f.pressure.toFixed(1)} unit="kPa" color="#FF9F45" />
          <Readout label="Risk Score" value={f.riskScore.toFixed(2)} unit="/1" color={f.riskScore >= 0.4 ? "#FFC24B" : "#3EE08F"} />
          <Readout label="Fatigue" value={(f.fatigue * 100).toFixed(0)} unit="%" color="#FFC24B" />
        </div>
        <p className="mt-2 font-mono text-[10px] text-slate-600">* MDF / fatigue 为合成疲劳代理指标，非实测值 · compIdx {f.compIdx.toFixed(2)}</p>
      </section>

      {/* 事件日志 */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-100">事件日志（状态转换流）</h2>
        <div
          ref={logBoxRef}
          className="h-52 overflow-y-auto rounded-xl border border-white/10 bg-[#0A182B] p-3 font-mono text-xs leading-relaxed"
        >
          {logs.map((l) => (
            <div key={l.id} className="flex gap-3">
              <span className="shrink-0 text-slate-600">{l.stamp}</span>
              <span className={`w-14 shrink-0 font-semibold ${KIND_STYLE[l.kind]}`}>[{l.kind}]</span>
              <span className="text-slate-300">{l.text}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

/** 大号三态状态灯（含保护三连动作点亮） */
function StatusLightBig({ state }: { state: SafetyState }) {
  const ui = STATE_UI[state];
  return (
    <div className="flex flex-wrap items-center gap-5">
      <span
        className={`inline-block h-10 w-10 shrink-0 rounded-full ${state === "OVER" ? "animate-pulse" : ""}`}
        style={{ background: ui.color, boxShadow: `0 0 30px ${ui.color}, 0 0 80px ${ui.color}44` }}
      />
      <div>
        <div className="font-mono text-2xl font-bold" style={{ color: ui.color }}>
          {ui.label}
        </div>
        <div className="mt-0.5 max-w-md text-sm text-slate-300">{ui.msg}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROTECT_STEPS.map((s, i) => {
            const lit = state === "OVER" || (state === "RISK" && i === 2);
            return (
              <span
                key={s}
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition ${
                  state === "OVER"
                    ? "border-[#FF5A5A]/60 bg-[#FF5A5A]/15 text-[#FF5A5A]"
                    : lit
                      ? "border-[#FFC24B]/50 bg-[#FFC24B]/10 text-[#FFC24B]"
                      : "border-white/10 text-slate-600"
                }`}
              >
                {state === "OVER" ? "✓ " : ""}
                {s}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="font-mono text-sm font-bold text-cyan-300">
          {value}
          <span className="ml-0.5 text-[10px] text-slate-500">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-400"
        aria-label={label}
      />
      <div className="flex justify-between font-mono text-[10px] text-slate-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

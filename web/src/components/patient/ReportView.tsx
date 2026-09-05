"use client";
// 屏D · 训练报告（docs/24 §2.4）：统计卡 + 全量疲劳/腔压图 + AI报告占位卡（本地模板）

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AITag from "@/components/shared/AITag";
import { fmtClock } from "@/components/shared/format";
import type { SynthFrame } from "@/lib/synth/signals";
import { buildSummary, simulateFrames } from "./reportSim";
import type { SessionSummary } from "./types";

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const GRID = "rgba(230,241,255,0.06)";
const AXIS_TICK = { fill: "#5A7184", fontSize: 10, fontFamily: MONO };
const TOOLTIP = {
  contentStyle: {
    background: "#14304F",
    border: "1px solid rgba(230,241,255,0.16)",
    borderRadius: 10,
    fontSize: 12,
  },
  labelStyle: { color: "#9FB3C8", fontFamily: MONO, fontSize: 11 },
  itemStyle: { fontFamily: MONO, fontSize: 11 },
  labelFormatter: (l: unknown) => `T+${Math.round(Number(l))}s`,
} as const;

function Stat({ label, value, unit, color = "#E6F1FF" }: { label: string; value: string; unit: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold" style={{ color }}>
        {value}
        <span className="ml-1 text-xs font-normal text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

function ChartCard({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">{title}</span>
        <span className="font-mono text-[10px] text-slate-500">{tag}</span>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function buildReportText(s: SessionSummary) {
  const over = s.overCount > 0;
  const peakFatigue = s.frames.reduce((m, f) => Math.max(m, f.fatigue), 0);
  const fatiguePeakFrame = s.frames.reduce<SynthFrame | null>(
    (best, f) => (best === null || f.fatigue > best.fatigue ? f : best),
    null
  );
  const summaryLine =
    `本次训练共进行 ${fmtClock(s.durationSec)}，屈膝角度峰值 ${s.peakAngle.toFixed(0)}°，关节腔压峰值 ${s.peakPressure.toFixed(1)} kPa。` +
    (over
      ? `期间出现 ${s.overCount} 次压力超限，设备按要求执行「停止加压 · 立即泄气」，你按提示休息后顺利完成恢复，记录完整。`
      : `全程未触发超限保护，支撑压力保持在安全带内，完成质量很高。`);

  const gains = [
    over
      ? `超限后按提示恢复并继续完成——节奏与自我调节在变好`
      : `整场未触发超限保护——幅度与支撑匹配得当`,
    `疲劳代理指标峰值 ${(peakFatigue * 100).toFixed(0)}%（合成指标），出现在约 T+${fatiguePeakFrame ? Math.round(fatiguePeakFrame.t) : 0}s`,
    `平均 sEMG 包络 ${s.avgEmg.toFixed(0)} μV，与个人基线（合成基线 96 μV）相当`,
  ];

  const suggestions = [
    over
      ? "下次再出现纠正提示时：先放慢速度、把幅度降 5–10°，提示消失后再继续"
      : "下次可尝试把建议幅度上调 5°（不超过 75°），仍按循序渐进",
    "组间休息保持 20–30 秒；疲劳代理指标持续 >70% 时建议提前收尾",
    "训练结束 30 分钟后再记录一次感受；如疼痛或肿胀明显加重，下次适当减量并持续关注打卡信号",
  ];

  return { summaryLine, gains, suggestions };
}

export default function ReportView({
  summary,
  onRestart,
}: {
  summary: SessionSummary | null;
  onRestart: () => void;
}) {
  // 未经过训练页（直接进报告）时：离线复算标准脚本会话作为演示兜底
  const [fallback, setFallback] = useState<SessionSummary | null>(null);
  const isFallback = summary === null;
  useEffect(() => {
    if (!summary) {
      const { frames, overTimes } = simulateFrames("demo-90s");
      setFallback(buildSummary(frames, overTimes, "auto"));
    }
  }, [summary]);

  const [synced, setSynced] = useState(false);
  const data = summary ?? fallback;

  const fatigueData = useMemo(
    () =>
      (data?.frames ?? [])
        .filter((_, i) => i % 2 === 0)
        .map((f) => ({
          t: Math.round(f.t),
          fatigue: Math.round(f.fatigue * 1000) / 10,
          mdf: Math.round(f.mdf * 10) / 10,
        })),
    [data]
  );
  const pressureData = useMemo(
    () =>
      (data?.frames ?? [])
        .filter((_, i) => i % 2 === 0)
        .map((f) => ({ t: Math.round(f.t), pressure: Math.round(f.pressure * 10) / 10 })),
    [data]
  );

  if (!data) {
    return <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">正在生成报告…</div>;
  }

  const firstOver = data.overTimes.length > 0 ? Math.round(data.overTimes[0]) : null;
  const text = buildReportText(data);

  return (
    <div className="space-y-4">
      {isFallback && (
        <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs text-slate-400">
          演示兜底：未检测到本次训练记录，正在展示标准 180s 脚本会话（demo-90s，确定性可复现）的报告。
        </div>
      )}

      {/* 统计卡 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="训练时长" value={fmtClock(data.durationSec)} unit={data.endedBy === "manual" ? "手动结束" : "自动收尾"} />
        <Stat label="超限次数" value={String(data.overCount)} unit="次" color={data.overCount > 0 ? "#FF5A5A" : "#3EE08F"} />
        <Stat label="峰值腔压" value={data.peakPressure.toFixed(1)} unit="kPa" color="#FF9F45" />
        <Stat label="峰值屈膝" value={data.peakAngle.toFixed(0)} unit="°" color="#A78BFA" />
      </div>

      {/* 全量图 */}
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Fatigue Curve · 疲劳曲线（全量）" tag="疲劳代理指标 % · MDF Hz（合成指标）">
          <LineChart data={fatigueData} margin={{ top: 8, right: 6, bottom: 0, left: -14 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="t" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={40} tickFormatter={(v: number) => `${v}s`} />
            <YAxis yAxisId="fat" domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={32} />
            <YAxis yAxisId="mdf" orientation="right" domain={[55, 95]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={32} />
            <Tooltip {...TOOLTIP} />
            {firstOver !== null && (
              <ReferenceLine
                yAxisId="fat"
                x={firstOver}
                stroke="#FF5A5A"
                strokeDasharray="5 4"
                label={{ value: "OVER · 泄气", position: "insideTopRight", fill: "#FF5A5A", fontSize: 10, fontFamily: MONO }}
              />
            )}
            <Line yAxisId="fat" type="monotone" dataKey="fatigue" name="疲劳 %" stroke="#FFC24B" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="mdf" type="monotone" dataKey="mdf" name="MDF Hz" stroke="#A78BFA" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Joint Pressure · 关节腔压（全量）" tag="16 kPa 警戒 / 22 kPa 超限线">
          <LineChart data={pressureData} margin={{ top: 8, right: 6, bottom: 0, left: -14 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="t" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={40} tickFormatter={(v: number) => `${v}s`} />
            <YAxis domain={[0, 30]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={32} ticks={[0, 8, 16, 22, 30]} />
            <Tooltip {...TOOLTIP} />
            <ReferenceArea y1={16} y2={22} fill="rgba(255,194,75,0.10)" stroke="none" ifOverflow="visible" />
            <ReferenceArea y1={22} y2={30} fill="rgba(255,90,90,0.12)" stroke="none" ifOverflow="visible" />
            <ReferenceLine y={16} stroke="#FFC24B" strokeWidth={1} strokeDasharray="5 4" ifOverflow="visible" />
            <ReferenceLine y={22} stroke="#FF5A5A" strokeWidth={1} strokeDasharray="5 4" ifOverflow="visible" />
            {firstOver !== null && (
              <ReferenceLine
                x={firstOver}
                stroke="#FF5A5A"
                strokeDasharray="5 4"
                ifOverflow="visible"
                label={{ value: "OVER", position: "insideTopRight", fill: "#FF5A5A", fontSize: 10, fontFamily: MONO }}
              />
            )}
            <Line type="monotone" dataKey="pressure" name="腔压 kPa" stroke="#FF9F45" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ChartCard>
      </div>

      {/* AI 报告占位卡（本地模板） */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-100">今日训练报告</h3>
          <AITag text="本地模板 · AI联线后升级" local />
        </div>

        <p className="mb-4 rounded-xl bg-cyan-400/5 px-4 py-3 text-sm leading-relaxed text-cyan-100">{text.summaryLine}</p>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[#0A182B] p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-300">进步点</div>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
              {text.gains.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0A182B] p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-300">下次建议</div>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
              {text.suggestions.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          当前报告由本地规则模板生成（演示兜底）；接入大模型后将升级为AI个性化叙述。以上为训练安排参考，不构成医疗建议。
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSynced(true)}
            disabled={synced}
            className={`rounded-xl px-6 py-3 text-sm font-semibold transition ${
              synced
                ? "cursor-default border border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : "bg-[#38E1D4] text-[#06202B] shadow-[0_0_16px_rgba(56,225,212,0.35)] hover:brightness-110"
            }`}
          >
            {synced ? "✓ 已同步 · 医生端将出现「今日新摘要」（演示）" : "同步给我的医生"}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="rounded-xl border border-white/20 px-6 py-3 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            再练一次
          </button>
        </div>
      </div>
    </div>
  );
}

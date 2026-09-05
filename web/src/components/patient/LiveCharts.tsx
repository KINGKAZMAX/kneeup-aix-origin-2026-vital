"use client";
// 训练模式三张实时图表（docs/24 §6.4 配色）：
// sEMG包络青 #38E1D4 / 关节腔压橙 #FF9F45（16/22kPa参考线）/ 屈膝角度紫 #A78BFA
// 只渲染滑动窗口（60s / 600点），isAnimationActive={false}

import { useMemo } from "react";
import type { ReactNode } from "react";
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
import type { SynthFrame } from "@/lib/synth/signals";

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
  labelFormatter: (l: unknown) => `T+${Number(l).toFixed(1)}s`,
} as const;

interface Row {
  t: number;
  emg: number;
  pressure: number;
  angle: number;
}

function Panel({
  label,
  unit,
  color,
  value,
  children,
}: {
  label: string;
  unit: string;
  color: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
        <span className="font-mono text-base font-bold" style={{ color }}>
          {value}
          <span className="ml-1 text-[10px] font-normal text-slate-500">{unit}</span>
        </span>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function LiveCharts({ frames }: { frames: SynthFrame[] }) {
  const data = useMemo<Row[]>(
    () =>
      frames.map((f) => ({
        t: Math.round(f.t * 10) / 10,
        emg: Math.round(f.emg),
        pressure: Math.round(f.pressure * 10) / 10,
        angle: Math.round(f.angle * 10) / 10,
      })),
    [frames]
  );
  const last = frames.length > 0 ? frames[frames.length - 1] : null;

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Panel
        label="sEMG Envelope · 肌肉激活"
        unit="μV"
        color="#38E1D4"
        value={last ? last.emg.toFixed(0) : "--"}
      >
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={48} tickFormatter={(v: number) => `${Math.round(v)}s`} />
          <YAxis domain={[0, 260]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={34} />
          <Tooltip {...TOOLTIP} />
          <Line type="monotone" dataKey="emg" name="sEMG包络" stroke="#38E1D4" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </Panel>

      <Panel
        label="Joint Pressure · 关节腔压"
        unit="kPa"
        color="#FF9F45"
        value={last ? last.pressure.toFixed(1) : "--"}
      >
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={48} tickFormatter={(v: number) => `${Math.round(v)}s`} />
          <YAxis domain={[0, 30]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={34} ticks={[0, 8, 16, 22, 30]} />
          <Tooltip {...TOOLTIP} />
          <ReferenceArea y1={16} y2={22} fill="rgba(255,194,75,0.10)" stroke="none" ifOverflow="visible" />
          <ReferenceArea y1={22} y2={30} fill="rgba(255,90,90,0.12)" stroke="none" ifOverflow="visible" />
          <ReferenceLine y={16} stroke="#FFC24B" strokeWidth={1} strokeDasharray="5 4" ifOverflow="visible" />
          <ReferenceLine
            y={22}
            stroke="#FF5A5A"
            strokeWidth={1}
            strokeDasharray="5 4"
            ifOverflow="visible"
            label={{ value: "22 超限线", position: "insideTopRight", fill: "#FF5A5A", fontSize: 9, fontFamily: MONO }}
          />
          <Line type="monotone" dataKey="pressure" name="关节腔压" stroke="#FF9F45" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </Panel>

      <Panel
        label="Knee Angle · 屈膝角度"
        unit="°"
        color="#A78BFA"
        value={last ? last.angle.toFixed(1) : "--"}
      >
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={48} tickFormatter={(v: number) => `${Math.round(v)}s`} />
          <YAxis domain={[0, 95]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={34} ticks={[0, 30, 65, 90]} />
          <Tooltip {...TOOLTIP} />
          <ReferenceArea y1={30} y2={65} fill="rgba(56,225,212,0.10)" stroke="none" ifOverflow="visible" />
          <ReferenceLine
            y={90}
            stroke="#FF5A5A"
            strokeWidth={1}
            strokeDasharray="5 4"
            ifOverflow="visible"
            label={{ value: "90°", position: "insideTopRight", fill: "#FF5A5A", fontSize: 9, fontFamily: MONO }}
          />
          <Line type="monotone" dataKey="angle" name="屈膝角度" stroke="#A78BFA" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </Panel>
    </div>
  );
}

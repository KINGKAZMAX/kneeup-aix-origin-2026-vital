"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Patient } from "@/lib/synth/patients";

const TOOLTIP_STYLE = {
  background: "#14304F",
  border: "1px solid rgba(230,241,255,0.16)",
  borderRadius: 12,
  fontSize: 12,
} as const;

/** 7日训练完成率柱图（Recharts · 暗色主题） */
export default function CompletionChart({ patient }: { patient: Patient }) {
  const data = patient.days.map((d) => ({ day: `D${d.day}`, pct: d.completionPct }));
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">7 日训练完成率</h3>
        <span className="text-[10px] uppercase tracking-widest text-slate-500">COMPLETION %</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="rgba(230,241,255,0.06)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: "#5A7184", fontSize: 11, fontFamily: "monospace" }}
              axisLine={{ stroke: "rgba(230,241,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#5A7184", fontSize: 11, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(56,225,212,0.06)" }}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "#E6F1FF" }}
              itemStyle={{ color: "#9FB3C8" }}
              formatter={(value) => [`${value}%`, "完成率"]}
            />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {data.map((d) => (
                <Cell
                  key={d.day}
                  fill={d.pct === 0 ? "rgba(255,90,90,0.5)" : "#38E1D4"}
                  fillOpacity={d.pct === 0 ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

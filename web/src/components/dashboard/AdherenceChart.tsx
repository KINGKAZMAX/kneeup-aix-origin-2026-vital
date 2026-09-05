"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PATIENTS } from "@/lib/synth/patients";
import { getMetrics, TONE_COLOR } from "@/components/doctor/metrics";

const TOOLTIP_STYLE = {
  background: "#14304F",
  border: "1px solid rgba(230,241,255,0.16)",
  borderRadius: 12,
  fontSize: 12,
} as const;

/** 中列下：依从率堆叠柱图（三患者每日完成率堆叠 · Recharts 暗色） */
export default function AdherenceChart() {
  const data = PATIENTS[0].days.map((d, i) => {
    const row: Record<string, string | number> = { day: `D${d.day}` };
    PATIENTS.forEach((p) => {
      row[p.name] = p.days[i].completionPct;
    });
    return row;
  });

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          依从率堆叠 · 三患者每日完成率 %
        </h2>
        <span className="text-[9px] uppercase tracking-widest text-slate-600">ADHERENCE</span>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -22 }}>
            <CartesianGrid stroke="rgba(230,241,255,0.06)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: "#5A7184", fontSize: 11, fontFamily: "monospace" }}
              axisLine={{ stroke: "rgba(230,241,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 300]}
              ticks={[0, 100, 200, 300]}
              tick={{ fill: "#5A7184", fontSize: 11, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "#E6F1FF" }}
              itemStyle={{ color: "#9FB3C8" }}
              formatter={(value, name) => [`${value}%`, name as string]}
              cursor={{ fill: "rgba(56,225,212,0.06)" }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => <span style={{ color: "#9FB3C8" }}>{value}</span>}
            />
            {PATIENTS.map((p) => {
              const m = getMetrics(p);
              return (
                <Bar
                  key={p.id}
                  dataKey={p.name}
                  stackId="adherence"
                  fill={TONE_COLOR[m.tone]}
                  fillOpacity={0.8}
                  maxBarSize={44}
                  isAnimationActive={false}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

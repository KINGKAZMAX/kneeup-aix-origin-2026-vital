"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

/** 中列上：7日疼痛趋势三线图（Recharts · 暗色） */
export default function PainTrendChart() {
  const data = PATIENTS[0].days.map((d, i) => {
    const row: Record<string, string | number> = { day: `D${d.day}` };
    PATIENTS.forEach((p) => {
      row[p.name] = p.days[i].pain;
    });
    return row;
  });

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          7日疼痛趋势 · 0-10 自评
        </h2>
        <span className="text-[9px] uppercase tracking-widest text-slate-600">PAIN TREND</span>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -22 }}>
            <CartesianGrid stroke="rgba(230,241,255,0.06)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: "#5A7184", fontSize: 11, fontFamily: "monospace" }}
              axisLine={{ stroke: "rgba(230,241,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fill: "#5A7184", fontSize: 11, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "#E6F1FF" }}
              itemStyle={{ color: "#9FB3C8" }}
              formatter={(value, name) => [`${value} / 10`, name as string]}
              cursor={{ stroke: "rgba(56,225,212,0.35)", strokeDasharray: "4 4" }}
            />
            <Legend
              iconType="plainline"
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => <span style={{ color: "#9FB3C8" }}>{value}</span>}
            />
            {PATIENTS.map((p) => {
              const m = getMetrics(p);
              return (
                <Line
                  key={p.id}
                  type="monotone"
                  dataKey={p.name}
                  stroke={TONE_COLOR[m.tone]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

import type { Patient } from "@/lib/synth/patients";

type MetricKey = "pain" | "swelling" | "catching" | "givingWay";

const ROWS: { key: MetricKey; label: string; max: number }[] = [
  { key: "pain", label: "疼痛", max: 10 },
  { key: "swelling", label: "肿胀", max: 3 },
  { key: "catching", label: "卡顿", max: 3 },
  { key: "givingWay", label: "打软", max: 3 },
];

/** 信号值 → 色块样式（值越高越暖，红灯日整格红框） */
function cellStyle(key: MetricKey, value: number): { backgroundColor: string; color: string } {
  if (key === "pain") {
    if (value >= 7) return { backgroundColor: "rgba(255,90,90,0.55)", color: "#FFE1E1" };
    if (value >= 5) return { backgroundColor: "rgba(255,194,75,0.45)", color: "#FFF3DC" };
    if (value > 0) return { backgroundColor: `rgba(56,225,212,${0.12 + value * 0.05})`, color: "#D8FFFB" };
    return { backgroundColor: "rgba(230,241,255,0.05)", color: "#5A7184" };
  }
  if (value >= 3) return { backgroundColor: "rgba(255,90,90,0.5)", color: "#FFE1E1" };
  if (value === 2) return { backgroundColor: "rgba(255,194,75,0.4)", color: "#FFF3DC" };
  if (value === 1) return { backgroundColor: "rgba(56,225,212,0.22)", color: "#D8FFFB" };
  return { backgroundColor: "rgba(230,241,255,0.05)", color: "#5A7184" };
}

/** 7天打卡热力格：疼痛/肿胀/卡顿/打软 四行 × 7天色块 */
export default function HeatGrid({ patient }: { patient: Patient }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">7 天打卡热力格</h3>
        <span className="text-[10px] uppercase tracking-widest text-slate-500">SYNTHETIC DATA</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-12" />
              {patient.days.map((d) => (
                <th key={d.day} className="pb-1 text-center font-mono text-[11px] font-normal text-slate-500">
                  D{d.day}
                  {d.redFlag && <span className="ml-0.5 text-[#FF5A5A]">⚠</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key}>
                <td className="pr-1 text-right text-[11px] text-slate-400">{row.label}</td>
                {patient.days.map((d) => {
                  const v = d[row.key];
                  return (
                    <td key={d.day} className="h-9">
                      <div
                        title={`${row.label} ${v}/${row.max}${d.redFlag ? " · 红灯信号，建议尽快就医" : ""}`}
                        className="flex h-9 items-center justify-center rounded-lg font-mono text-xs"
                        style={cellStyle(row.key, v)}
                      >
                        {v}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded" style={{ backgroundColor: "rgba(56,225,212,0.3)" }} /> 低
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded" style={{ backgroundColor: "rgba(255,194,75,0.45)" }} /> 中
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded" style={{ backgroundColor: "rgba(255,90,90,0.55)" }} /> 高 / ⚠ 红灯日整列标记
        </span>
      </div>
    </section>
  );
}

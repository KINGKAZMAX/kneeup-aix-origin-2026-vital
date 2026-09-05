// 患者端四步向导步骤条（docs/24 §2）

const STEPS = ["今日打卡", "AI建议", "训练模式", "训练报告"] as const;

export default function StepBar({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border font-mono text-xs ${
                active
                  ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                  : done
                    ? "border-cyan-400/40 text-cyan-300/80"
                    : "border-white/15 text-slate-500"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={active ? "font-medium text-cyan-200" : done ? "text-slate-300" : "text-slate-500"}>
              {s}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-white/15 sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}

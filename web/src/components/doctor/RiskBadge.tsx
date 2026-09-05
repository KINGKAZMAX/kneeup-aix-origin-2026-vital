import type { RiskLevel } from "./metrics";
import { RISK_META, TONE_COLOR } from "./metrics";

/** 风险分级徽章 A/B/C（分级由规则引擎计算，AI 负责解释） */
export default function RiskBadge({
  level,
  size = "sm",
}: {
  level: RiskLevel;
  size?: "sm" | "md";
}) {
  const meta = RISK_META[level];
  const color = TONE_COLOR[meta.tone];
  return (
    <span
      title={`风险分级 ${level}（${meta.label}）· 由AI根据训练数据分级，供参考，不构成医疗建议`}
      className={`inline-flex items-center gap-2 rounded-full border font-medium ${
        size === "md" ? "px-4 py-1.5 text-sm" : "px-2.5 py-0.5 text-[11px]"
      }`}
      style={{ borderColor: `${color}66`, backgroundColor: `${color}1A`, color }}
    >
      <span className="font-mono font-bold">{level}</span>
      <span>{meta.label}</span>
    </span>
  );
}

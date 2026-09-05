import type { Tone } from "./metrics";
import { TONE_CLASS } from "./metrics";

/** 状态药丸徽章：稳步向好（绿）/ 代偿关注（黄）/ 红灯已转介（红） */
export default function StatusBadge({
  text,
  tone,
  size = "sm",
}: {
  text: string;
  tone: Tone;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${TONE_CLASS[tone]} ${
        size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]"
      } font-medium`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor:
            tone === "good" ? "#3EE08F" : tone === "watch" ? "#FFC24B" : "#FF5A5A",
        }}
      />
      {text}
    </span>
  );
}

"use client";
// 三态安全状态灯（docs/24 §6.5）：SAFE绿 / RISK黄 / OVER红，颜色与文案来自引擎 STATE_UI

import { STATE_UI, type SafetyState } from "@/lib/synth/safety";

const CN_LABEL: Record<SafetyState, string> = {
  SAFE: "安全",
  RISK: "代偿风险",
  OVER: "超限",
};

export default function StatusLight({
  state,
  size = "md",
  showMsg = true,
}: {
  state: SafetyState;
  size?: "md" | "lg";
  showMsg?: boolean;
}) {
  const ui = STATE_UI[state];
  const dot = size === "lg" ? "h-6 w-6" : "h-2.5 w-2.5";
  const glow = size === "lg" ? `0 0 28px ${ui.color}, 0 0 60px ${ui.color}55` : `0 0 8px ${ui.color}`;
  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-block shrink-0 rounded-full ${dot} ${state === "OVER" ? "animate-pulse" : ""}`}
        style={{ background: ui.color, boxShadow: glow }}
      />
      <div className="leading-tight">
        <div
          className={`font-mono font-semibold ${size === "lg" ? "text-xl" : "text-sm"}`}
          style={{ color: ui.color }}
        >
          {ui.label} · {CN_LABEL[state]}
        </div>
        {showMsg && (
          <div className={`mt-0.5 text-slate-300 ${size === "lg" ? "text-sm" : "text-xs"}`}>{ui.msg}</div>
        )}
      </div>
    </div>
  );
}

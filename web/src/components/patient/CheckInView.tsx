"use client";
// 屏A · 今日打卡（docs/24 §2.1）：疼痛0-10滑条 + 肿胀/卡顿/打软0-3 + 备注

import { useState } from "react";
import type { CheckIn } from "./ruleEngine";

const SCALE_4 = [
  { v: 0, label: "无" },
  { v: 1, label: "轻微" },
  { v: 2, label: "明显" },
  { v: 3, label: "严重" },
] as const;

function Seg({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (v: number) => void;
  labels: readonly string[];
}) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-[#0A182B] p-1">
      {labels.map((label, v) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-lg px-1 py-2 text-center text-xs transition sm:text-sm ${
            value === v
              ? "bg-cyan-400/15 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(56,225,212,0.5)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="block font-mono text-[10px] text-slate-500">{v}</span>
          {label}
        </button>
      ))}
    </div>
  );
}

function painColor(pain: number): string {
  if (pain >= 6) return "#FF5A5A";
  if (pain >= 4) return "#FFC24B";
  return "#38E1D4";
}

export default function CheckInView({
  initial,
  onSubmit,
}: {
  initial: CheckIn;
  onSubmit: (c: CheckIn) => void;
}) {
  const [pain, setPain] = useState(initial.pain);
  const [swelling, setSwelling] = useState(initial.swelling);
  const [catching, setCatching] = useState(initial.catching);
  const [givingWay, setGivingWay] = useState(initial.givingWay);
  const [note, setNote] = useState(initial.note);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">开始今天的康复训练前，先花 30 秒记录身体感受。</p>

      {/* 疼痛滑条 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-slate-200">疼痛程度</h3>
          <span className="font-mono text-3xl font-bold" style={{ color: painColor(pain) }}>
            {pain}
            <span className="text-sm font-normal text-slate-500">/10</span>
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={pain}
          onChange={(e) => setPain(Number(e.target.value))}
          className="w-full accent-cyan-400"
          aria-label="疼痛程度 0 到 10"
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
          <span>0 · 无疼痛</span>
          <span>10 · 无法忍受</span>
        </div>
      </div>

      {/* 三个 0-3 选择 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-2 text-sm font-medium text-slate-200">肿胀</h3>
          <Seg value={swelling} onChange={setSwelling} labels={SCALE_4.map((s) => s.label)} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-2 text-sm font-medium text-slate-200">卡顿感</h3>
          <Seg value={catching} onChange={setCatching} labels={["无", "偶尔", "经常", "频繁"]} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-2 text-sm font-medium text-slate-200">打软腿</h3>
          <Seg value={givingWay} onChange={setGivingWay} labels={["无", "偶尔", "经常", "频繁"]} />
        </div>
      </div>

      {/* 备注 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-2 text-sm font-medium text-slate-200">
          补充说明 <span className="text-xs font-normal text-slate-500">（选填）</span>
        </h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="今天有没有什么特别的感觉？比如上下楼梯、走路距离……"
          className="w-full rounded-xl border border-white/10 bg-[#0A182B] p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none"
        />
      </div>

      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-2.5 text-xs text-cyan-200/80">
        演示提示：把疼痛拉到 ≥6，或肿胀选「明显」以上，可触发红灯转介路径。
      </div>

      <button
        type="button"
        onClick={() => onSubmit({ pain, swelling, catching, givingWay, note })}
        className="w-full rounded-xl bg-[#38E1D4] py-3.5 text-base font-semibold text-[#06202B] shadow-[0_0_16px_rgba(56,225,212,0.35)] transition hover:brightness-110"
      >
        提交打卡 · 获取今日AI训练建议
      </button>
    </div>
  );
}

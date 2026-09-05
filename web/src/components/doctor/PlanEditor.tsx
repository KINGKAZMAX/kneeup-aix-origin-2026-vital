"use client";

import { useState } from "react";
import type { Patient } from "@/lib/synth/patients";
import { getMetrics } from "./metrics";

const ACTIONS = ["屈膝练习", "直腿抬高", "靠墙静蹲"] as const;
type Action = (typeof ACTIONS)[number];

function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${
        checked
          ? "border-[#38E1D4]/40 bg-[#38E1D4]/10"
          : "border-white/10 bg-white/5 opacity-70"
      }`}
    >
      <span>
        <span className={`block text-sm font-medium ${checked ? "text-slate-100" : "text-slate-400"}`}>
          {label}
        </span>
        <span className="mt-0.5 block text-[11px] text-slate-500">{desc}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#38E1D4]" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#0B1D33] transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/** 训练计划编辑器：动作多选 + 次数/幅度滑条 + 终止条件开关 → 下发（演示为本地状态模拟） */
export default function PlanEditor({ patient }: { patient: Patient }) {
  const m = getMetrics(patient);
  const [selected, setSelected] = useState<Action[]>(() =>
    patient.id === "p1-zhiyuan" ? ["屈膝练习", "直腿抬高", "靠墙静蹲"] : ["屈膝练习", "直腿抬高"]
  );
  const [reps, setReps] = useState(12);
  const [rom, setRom] = useState(m.romDefault);
  const [stopOnPain, setStopOnPain] = useState(true);
  const [stopOnOverLimit, setStopOnOverLimit] = useState(true);
  const [dispatched, setDispatched] = useState(false);
  const [toast, setToast] = useState(false);

  function toggleAction(a: Action) {
    setSelected((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a].sort((x, y) => ACTIONS.indexOf(x as Action) - ACTIONS.indexOf(y as Action))
    );
  }

  function handleDispatch() {
    setDispatched(true);
    setToast(true);
    setTimeout(() => setDispatched(false), 2600);
    setTimeout(() => setToast(false), 3800);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-100">
          调整训练计划 · {patient.name}
        </h2>
        <span className="text-[11px] text-slate-500">AI 建议幅度参考：{m.romDefault}°（按分级 {m.riskLevel} 保守取值）</span>
      </div>

      {/* 动作选择 */}
      <div className="mb-6">
        <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">训练动作（可多选）</div>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => {
            const on = selected.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleAction(a)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  on
                    ? "border-[#38E1D4]/60 bg-[#38E1D4]/15 text-[#38E1D4]"
                    : "border-white/15 bg-white/5 text-slate-400 hover:border-white/30 hover:text-slate-200"
                }`}
              >
                {on ? "✓ " : "+ "}
                {a}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* 次数滑条 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="reps-slider" className="text-xs uppercase tracking-widest text-slate-500">
              次数（次/组）
            </label>
            <span className="font-mono text-xl font-bold text-[#38E1D4]">{reps}</span>
          </div>
          <input
            id="reps-slider"
            type="range"
            min={5}
            max={30}
            step={1}
            value={reps}
            onChange={(e) => setReps(Number(e.target.value))}
            className="w-full accent-[#38E1D4]"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
            <span>5</span>
            <span>30</span>
          </div>
        </div>

        {/* 建议幅度滑条 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="rom-slider" className="text-xs uppercase tracking-widest text-slate-500">
              建议幅度（°）
            </label>
            <span className="font-mono text-xl font-bold text-[#38E1D4]">{rom}°</span>
          </div>
          <input
            id="rom-slider"
            type="range"
            min={20}
            max={90}
            step={1}
            value={rom}
            onChange={(e) => setRom(Number(e.target.value))}
            className="w-full accent-[#38E1D4]"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
            <span>20°</span>
            <span>90°</span>
          </div>
        </div>
      </div>

      {/* 终止条件 */}
      <div className="mb-6">
        <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">
          终止条件（患者端自动执行）
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle
            checked={stopOnPain}
            onChange={setStopOnPain}
            label="疼痛 ≥7 自动暂停"
            desc="患者训练中自评疼痛达到阈值即暂停当组"
          />
          <Toggle
            checked={stopOnOverLimit}
            onChange={setStopOnOverLimit}
            label="超限自动泄气"
            desc="支撑压力超限 → 停止加压、立即泄气、提示暂停"
          />
        </div>
      </div>

      {/* 当前计划概览 + 下发 */}
      <div className="rounded-xl border border-white/10 bg-[#0A182B]/60 p-4">
        <div className="mb-3 font-mono text-[13px] leading-6 text-slate-300">
          {selected.length > 0
            ? `${selected.join(" · ")} × ${reps}次/组 · 幅度 ${rom}° · 终止条件：${[
                stopOnPain ? "疼痛≥7自动暂停" : null,
                stopOnOverLimit ? "超限自动泄气" : null,
              ]
                .filter(Boolean)
                .join(" / ") || "无"}`
            : "未选择动作——请至少选择一个训练动作"}
        </div>
        <button
          type="button"
          onClick={handleDispatch}
          disabled={selected.length === 0}
          className={`h-11 w-full rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            dispatched
              ? "bg-[#3EE08F] text-[#06202B]"
              : "bg-[#38E1D4] text-[#06202B] shadow-[0_0_16px_rgba(56,225,212,0.35)] hover:brightness-110"
          }`}
        >
          {dispatched ? "已下发 ✓ 患者端已同步" : "下发到患者端"}
        </button>
      </div>

      {/* 成功 toast（本地状态模拟同步） */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[#3EE08F]/50 bg-[#0F2540] px-5 py-3 text-sm text-[#3EE08F] shadow-[0_8px_32px_rgba(4,12,24,0.6)]"
        >
          ✓ 今日计划已更新，患者端下次打开生效
        </div>
      )}
    </section>
  );
}

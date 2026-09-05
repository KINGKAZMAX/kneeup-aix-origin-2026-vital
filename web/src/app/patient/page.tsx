"use client";
// 患者端 /patient：四步向导 ①今日打卡 → ②AI建议 → ③训练模式 → ④训练报告
// 默认档案：P1 Zhiyuan（docs/25 §3，patients.ts）

import { useState } from "react";
import BackHome from "@/components/shared/BackHome";
import StepBar from "@/components/patient/StepBar";
import CheckInView from "@/components/patient/CheckInView";
import SuggestView from "@/components/patient/SuggestView";
import TrainingView from "@/components/patient/TrainingView";
import ReportView from "@/components/patient/ReportView";
import { evalCheckIn, type CheckIn, type CheckInResult } from "@/components/patient/ruleEngine";
import { PATIENTS } from "@/lib/synth/patients";
import type { SessionSummary } from "@/components/patient/types";

const P1 = PATIENTS[0];
const INITIAL: CheckIn = { pain: 3, swelling: 0, catching: 0, givingWay: 0, note: "" };

export default function PatientPage() {
  const [step, setStep] = useState(0);
  const [checkin, setCheckin] = useState<CheckIn>(INITIAL);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [attempt, setAttempt] = useState(0);

  const avgCompletion = Math.round(
    P1.days.reduce((s, d) => s + d.completionPct, 0) / P1.days.length
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <BackHome />
        <span className="font-mono text-xs text-slate-500">PATIENT · /patient</span>
      </div>

      <StepBar current={step} />

      <header className="mb-6 mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
            你好，{P1.name} <span className="text-sm font-normal text-slate-500">（合成患者）</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {P1.age} 岁 · {P1.scenario} ·「{P1.quote}」
          </p>
        </div>
        <div className="font-mono text-xs text-slate-500">
          合成档案：7日完成率 {avgCompletion}% · 疼痛自评 {P1.days[0].pain}→{P1.days[P1.days.length - 1].pain}
        </div>
      </header>

      {step === 0 && (
        <CheckInView
          initial={checkin}
          onSubmit={(c) => {
            setCheckin(c);
            setResult(evalCheckIn(c));
            setStep(1);
          }}
        />
      )}

      {step === 1 && result && (
        <SuggestView
          result={result}
          onStart={() => setStep(2)}
          onRest={() => {
            setCheckin(INITIAL);
            setResult(null);
            setStep(0);
          }}
        />
      )}

      {step === 2 && (
        <TrainingView
          key={attempt}
          onFinish={(s) => {
            setSummary(s);
            setStep(3);
          }}
        />
      )}

      {step === 3 && (
        <ReportView
          summary={summary}
          onRestart={() => {
            setAttempt((a) => a + 1);
            setSummary(null);
            setResult(null);
            setCheckin(INITIAL);
            setStep(0);
          }}
        />
      )}
    </main>
  );
}

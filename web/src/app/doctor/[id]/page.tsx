"use client";

import { useState } from "react";
import Link from "next/link";
import { PATIENTS } from "@/lib/synth/patients";
import { getMetrics } from "@/components/doctor/metrics";
import RiskBadge from "@/components/doctor/RiskBadge";
import StatusBadge from "@/components/doctor/StatusBadge";
import AiDigestCard from "@/components/doctor/AiDigestCard";
import HeatGrid from "@/components/doctor/HeatGrid";
import CompletionChart from "@/components/doctor/CompletionChart";
import PlanEditor from "@/components/doctor/PlanEditor";

type Tab = "digest" | "plan";

/** 医生端 · AI 摘要详情 + 计划编辑器（view = digest / editor，docs/24 §3.2-3.3） */
export default function DoctorPatientPage({ params }: { params: { id: string } }) {
  const patient = PATIENTS.find((p) => p.id === params.id);

  if (!patient) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="text-slate-300">未找到该合成患者档案。</p>
        <Link href="/doctor" className="mt-4 inline-block text-sm text-[#38E1D4] hover:underline">
          ← 返回患者列表
        </Link>
      </main>
    );
  }

  return <PatientWorkspace patientId={patient.id} />;
}

function PatientWorkspace({ patientId }: { patientId: string }) {
  const [tab, setTab] = useState<Tab>("digest");
  const patient = PATIENTS.find((p) => p.id === patientId)!;
  const m = getMetrics(patient);

  const tabs: { key: Tab; label: string }[] = [
    { key: "digest", label: "AI 周报摘要" },
    { key: "plan", label: "训练计划编辑" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <nav className="mb-6 flex items-center gap-4 text-sm text-slate-400">
        <Link href="/" className="transition hover:text-[#38E1D4]">
          ← 返回首页
        </Link>
        <span className="text-slate-600">/</span>
        <Link href="/doctor" className="transition hover:text-[#38E1D4]">
          患者列表
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-300">{patient.name}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {patient.name}
            <span className="ml-3 font-mono text-base font-normal text-slate-400">
              {m.age}岁 · 合成患者
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">{patient.scenario}</p>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={m.riskLevel} size="md" />
          <StatusBadge text={m.statusText} tone={m.statusTone} size="md" />
        </div>
      </header>

      <div className="mb-5 flex w-fit gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              tab === t.key ? "bg-[#38E1D4]/15 text-[#38E1D4]" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "digest" ? (
        <div className="flex flex-col gap-5">
          <AiDigestCard patient={patient} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <HeatGrid patient={patient} />
            <CompletionChart patient={patient} />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setTab("plan")}
              className="h-11 rounded-xl bg-[#38E1D4] px-6 text-sm font-semibold text-[#06202B] shadow-[0_0_16px_rgba(56,225,212,0.35)] transition hover:brightness-110"
            >
              去调整训练计划 →
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <PlanEditor patient={patient} />
          <div>
            <button
              type="button"
              onClick={() => setTab("digest")}
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm text-slate-300 transition hover:border-[#38E1D4]/50 hover:text-[#38E1D4]"
            >
              ← 返回 AI 摘要
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

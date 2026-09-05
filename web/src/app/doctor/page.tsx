"use client";

import Link from "next/link";
import { PATIENTS } from "@/lib/synth/patients";
import PatientCard from "@/components/doctor/PatientCard";

/** 医生端 · 患者列表（view = list，docs/24 §3.1） */
export default function DoctorPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <nav className="mb-6 flex items-center gap-4 text-sm text-slate-400">
        <Link href="/" className="transition hover:text-[#38E1D4]">
          ← 返回首页
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-300">医生端</span>
      </nav>

      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#38E1D4]/30 bg-[#38E1D4]/10 px-3 py-1 text-[11px] text-[#38E1D4]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#38E1D4]" />
          CLINICIAN CONSOLE · 合成患者
        </div>
        <h1 className="text-3xl font-bold tracking-tight">我的患者</h1>
        <p className="mt-2 text-sm text-slate-400">
          AI 已先把 7 天训练数据读完：异常摘要、疲劳与代偿模式、风险分级——点击患者卡片查看。
        </p>
      </header>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {PATIENTS.map((p) => (
          <PatientCard key={p.id} patient={p} />
        ))}
      </section>

      <p className="mt-8 text-[11px] leading-5 text-slate-500">
        风险分级由 AI 根据训练数据分级，供参考，不构成医疗建议 · 本演示全部使用合成数据，无真实患者数据
      </p>
    </main>
  );
}

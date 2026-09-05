import Link from "next/link";

const stats = [
  { v: "3.65亿", label: "全球膝骨关节炎人群（WHO 2023）" },
  { v: "72个月", label: "香港公立医院膝关节置换最长轮候中位时间" },
  { v: "36%", label: "2046年香港65+人口占比（政府统计处）" },
];

interface Entry {
  href: string;
  title: string;
  desc: string;
  tag: string;
  accent: string;
  hover?: string;
  hoverText?: string;
}

const entries: Entry[] = [
  { href: "/patient", title: "患者端", desc: "每日打卡 → AI训练建议 → 实时训练陪伴 → AI报告", tag: "PATIENT", accent: "from-cyan-500/20" },
  { href: "/doctor", title: "医生端", desc: "AI异常摘要 → 调整训练计划 → 下发同步", tag: "CLINICIAN", accent: "from-indigo-500/20" },
  { href: "/simulator", title: "设备模拟器", desc: "虚拟Kneeup护膝：实时推流 sEMG / 腔压 / 屈膝角度，复现安全状态机", tag: "DEVICE", accent: "from-amber-500/20" },
  { href: "/dashboard", title: "AI 数据大屏", desc: "个人基线 · 疲劳与代偿识别 · 风险分级 · 趋势流", tag: "AI LAYER", accent: "from-fuchsia-500/20" },
  {
    href: "/body3d",
    title: "3D 护具与人体",
    desc: "护具×膝关节×身体问题部位",
    tag: "3D VIEW",
    accent: "from-cobalt-500/20",
    hover: "hover:border-cobalt-300/40 hover:shadow-[0_0_40px_-12px_rgba(67,118,235,0.35)]",
    hoverText: "group-hover:text-cobalt-300",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-12">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
          Soft Healthcare · AIx Origin Summit 2026 HK · Vital 赛道
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          Kneeup <span className="text-cyan-300">膝望</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          让膝康复走出医院、回到家里。患者端AI训练陪伴，医生端AI摘要，设备数据实时可见——
          <span className="text-cyan-300">去掉AI，这个闭环就不成立。</span>
        </p>
        <p className="mt-2 text-sm italic text-slate-400">
          &ldquo;我不想只做病人——我想更聪明地再去爬山。&rdquo; —— Zhiyuan，62岁，左膝半月板术后
        </p>
      </header>

      <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="font-mono text-3xl font-bold text-cyan-300">{s.v}</div>
            <div className="mt-1 text-xs leading-relaxed text-slate-400">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {entries.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className={`group rounded-2xl border border-white/10 bg-gradient-to-br ${e.accent} to-transparent p-6 transition ${e.hover ?? "hover:border-cyan-400/40 hover:shadow-[0_0_40px_-12px_rgba(56,225,212,0.35)]"}`}
          >
            <div className="mb-2 font-mono text-[11px] tracking-widest text-slate-400">{e.tag}</div>
            <div className={`text-2xl font-semibold ${e.hoverText ?? "group-hover:text-cyan-300"}`}>{e.title} →</div>
            <p className="mt-2 text-sm text-slate-400">{e.desc}</p>
          </Link>
        ))}
      </section>

      <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-slate-400">
        <div className="mb-2 font-semibold text-slate-200">硬件背景愿景（赛前研究 MENISCUS SHIELD）</div>
        硅胶气囊 + sEMG + 关节腔压感知的自适应膝关节支具——屈膝时充气支撑、伸直时放气复位，超限自动泄气。
        本次参赛将其安全逻辑完整复现为<strong className="text-slate-200">设备模拟器</strong>，主Demo为软件闭环；硬件为下一步路线图。
      </section>
    </main>
  );
}

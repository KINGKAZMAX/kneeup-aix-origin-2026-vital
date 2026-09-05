// 危机转介卡（docs/24 §6.5）：红灯信号 → 「建议尽快就医」
// 红线自查：只含建议性用语，不含禁用词

import type { ReactNode } from "react";

export default function CrisisCard({ title = "红灯信号", children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#FF5A5A]/60 bg-[#FF5A5A]/10 p-5">
      <div className="mb-2 flex items-center gap-2 text-lg font-semibold text-[#FF5A5A]">
        <span aria-hidden>⚠</span>
        {title}
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-slate-200">{children}</div>
    </div>
  );
}

/** AI 产出统一角标（docs/24 §6.5）：「✦ AI 生成 · 仅供参考」/ 紧凑版「✦ AI 生成」 */
export default function AiTag({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#38E1D4]/50 px-2 py-0.5 text-[11px] font-medium text-[#38E1D4]">
      <span aria-hidden>✦</span>
      {compact ? "AI 生成" : "AI 生成 · 仅供参考"}
    </span>
  );
}

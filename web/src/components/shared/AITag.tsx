// AI产出标识（docs/24 §6.5）：所有AI产出必须挂标签
// local=true 表示当前为本地降级模板，未接大模型（诚实标注）

export default function AITag({ text = "AI 生成 · 仅供参考", local = false }: { text?: string; local?: boolean }) {
  if (local) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-slate-400/30 bg-slate-400/10 px-2 py-0.5 text-[11px] text-slate-300">
        ✦ {text}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-[11px] text-cyan-300">
      ✦ {text}
    </span>
  );
}

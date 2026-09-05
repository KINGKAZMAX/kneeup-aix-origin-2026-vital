import Link from "next/link";

/** 每页顶部固定：返回首页链接（UI规范要求） */
export default function BackHome() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
    >
      ← 返回首页
    </Link>
  );
}

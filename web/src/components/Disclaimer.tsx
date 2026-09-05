// 每页固定可见的免责声明（docs/15 合规文案包·页脚短版）
export default function Disclaimer() {
  return (
    <div className="sticky bottom-0 z-40 border-t border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-center text-[11px] leading-relaxed text-amber-200/90">
      本产品为康复训练辅助软件，非医疗器械，不提供医疗建议，不能替代专业诊疗 · This is not a medical
      device and does not provide medical advice.
    </div>
  );
}

"use client";
// /body3d 部位信息卡：桌面端右侧浮层，移动端底部抽屉（bottom sheet，上拉展开/下拉收起）

import { useRef, useState } from "react";
import { PART_MAP, type BodyPart, type PartId } from "./parts";

function CardBody({ part, expanded, onClose }: { part: BodyPart; expanded: boolean; onClose: () => void }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] tracking-widest text-cobalt-300">{part.nameEn} · SIMULATED</div>
          <h2 className="mt-0.5 text-lg font-semibold text-white">{part.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭部位信息"
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-sm text-slate-300 transition hover:border-cobalt-300/40 hover:text-cobalt-300"
        >
          ✕
        </button>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">关联问题</div>
        <div className="flex flex-wrap gap-1.5">
          {part.problems.map((p) => (
            <span
              key={p}
              className="rounded-full border border-cobalt-600/40 bg-cobalt-600/15 px-2.5 py-0.5 text-xs text-cobalt-150"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">监测指标</div>
        <div className="flex flex-wrap gap-1.5">
          {part.metrics.map((m) => (
            <span
              key={m}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-xs text-slate-200"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* 移动端抽屉：上拉展开后才显示说明；桌面端始终显示 */}
      <div className={expanded ? "" : "hidden md:block"}>
        <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-ink-muted">{part.blurb}</p>
        <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">
          合成数据演示，非医疗器械，不提供诊断或治疗建议。
        </p>
      </div>
    </div>
  );
}

export default function PartCard({ selected, onClose }: { selected: PartId | null; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const touchStartY = useRef(0);
  const part = selected ? PART_MAP[selected] : null;

  return (
    <>
      {/* 桌面端：右侧浮层 */}
      {part && (
        <aside className="absolute right-4 top-1/2 z-20 hidden w-80 -translate-y-1/2 rounded-2xl border border-white/10 bg-carbon-850/95 p-5 shadow-[0_0_40px_-12px_rgba(67,118,235,0.35)] backdrop-blur md:block">
          <CardBody part={part} expanded onClose={onClose} />
        </aside>
      )}

      {/* 移动端：底部抽屉，点把手或上拉展开、下拉收起 */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 transition-transform duration-300 md:hidden ${
          part ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="rounded-t-2xl border-x border-t border-white/10 bg-carbon-850/95 px-5 pb-5 pt-2 backdrop-blur">
          <button
            type="button"
            aria-label={expanded ? "收起部位详情" : "展开部位详情"}
            className="block w-full py-1.5"
            onClick={() => setExpanded((v) => !v)}
            onTouchStart={(e) => {
              touchStartY.current = e.touches[0].clientY;
            }}
            onTouchEnd={(e) => {
              const dy = e.changedTouches[0].clientY - touchStartY.current;
              if (dy < -24) setExpanded(true);
              else if (dy > 24) setExpanded(false);
            }}
          >
            <span className="mx-auto block h-1 w-10 rounded-full bg-white/20" />
          </button>
          {part && <CardBody part={part} expanded={expanded} onClose={onClose} />}
        </div>
      </div>
    </>
  );
}

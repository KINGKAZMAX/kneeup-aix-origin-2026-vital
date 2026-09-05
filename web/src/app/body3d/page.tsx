"use client";
// /body3d：护具 × 人体 × 身体问题部位 3D 展示页
// three 只在 Body3DScene（dynamic ssr:false）内引用，保证 output:'export' 静态导出。
// WebGL 不可用 / 模型加载失败 → 静态降级卡（文字说明 + BackHome），永不白屏。

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import BackHome from "@/components/shared/BackHome";
import PartCard from "@/components/body3d/PartCard";
import type { PartId } from "@/components/body3d/parts";
import type { SceneStats } from "@/components/body3d/Body3DScene";

// next.config basePath 默认为 ''；若部署带子路径，模型需同步加前缀
const MODEL_URL = "/models/leg_web.glb";

const Body3DScene = dynamic(() => import("@/components/body3d/Body3DScene"), {
  ssr: false,
  loading: () => <LoadingNote text="LOADING · 载入 3D 场景…" />,
});

function LoadingNote({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="font-mono text-xs tracking-widest text-ink-muted">{text}</span>
    </div>
  );
}

function FallbackCard({ reason, message }: { reason: "webgl" | "model"; message: string | null }) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-carbon-850 p-6 text-center">
        <div className="mb-2 font-mono text-[10px] tracking-widest text-cobalt-300">
          3D DEMO UNAVAILABLE · SIMULATED
        </div>
        <h1 className="text-lg font-semibold text-white">3D 演示暂不可用</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          {reason === "webgl"
            ? "当前浏览器或设备不支持 WebGL，无法渲染 3D 场景。请使用支持 WebGL 的新版浏览器（Chrome / Safari / Edge）重试。"
            : `护具模型加载失败${message ? `（${message}）` : ""}。可能是网络中断或模型文件缺失，请刷新重试。`}
        </p>
        <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-ink-muted">
          本页内容为「护具 × 膝关节 × 身体问题部位」合成演示：护具佩戴于右膝，覆盖屈伸角度与左右负重比，
          并间接推断髋 / 踝 / 腰代偿。本页面为合成数据演示，非医疗器械，不提供诊断或治疗建议。
        </p>
        <div className="mt-5 flex justify-center">
          <BackHome />
        </div>
      </div>
    </div>
  );
}

export default function Body3DPage() {
  const [glOk, setGlOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PartId | null>(null);
  const [stats, setStats] = useState<SceneStats>({ tris: 0, fps: 0, loaded: false });

  useEffect(() => {
    let ok = false;
    try {
      const c = document.createElement("canvas");
      ok = !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch {
      ok = false;
    }
    setGlOk(ok);
  }, []);

  const handleStats = useCallback((s: SceneStats) => {
    setStats((prev) => (prev.tris === s.tris && prev.fps === s.fps && prev.loaded === s.loaded ? prev : s));
  }, []);
  const handleSelect = useCallback((id: PartId | null) => setSelected(id), []);
  const handleError = useCallback((msg: string) => setError(msg), []);
  const handleClose = useCallback(() => setSelected(null), []);

  const failed = glOk === false || error !== null;

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-carbon-950">
      {failed ? (
        <FallbackCard reason={glOk === false ? "webgl" : "model"} message={error} />
      ) : glOk === null ? (
        <LoadingNote text="LOADING · 检测 WebGL…" />
      ) : (
        <>
          <Body3DScene
            selected={selected}
            onSelect={handleSelect}
            onStats={handleStats}
            onError={handleError}
            modelUrl={MODEL_URL}
          />

          {/* 左上：返回 + 标题 + 面数/帧率 HUD（mono 小字） */}
          <div className="absolute left-3 top-3 z-20 flex flex-col items-start gap-2 sm:left-4 sm:top-4">
            <BackHome />
            <div className="rounded-xl border border-white/10 bg-carbon-850/85 px-3 py-2 backdrop-blur">
              <div className="text-sm font-semibold text-white">3D 护具与人体</div>
              <div className="mt-0.5 text-[11px] text-ink-muted">护具 × 膝关节 × 身体问题部位</div>
              <div className="mt-1 font-mono text-[10px] leading-relaxed text-ink-muted">
                {stats.loaded
                  ? `面 ${stats.tris.toLocaleString()} · ${stats.fps} fps · dpr≤2`
                  : "载入护具模型 leg_web.glb …"}
              </div>
            </div>
          </div>

          {/* 右上：常驻模拟演示角标 */}
          <div className="absolute right-3 top-3 z-20 rounded-full border border-cobalt-300/40 bg-cobalt-600/20 px-3 py-1 font-mono text-[10px] tracking-widest text-cobalt-150 sm:right-4 sm:top-4">
            模拟演示 · SIMULATED
          </div>

          {/* 底部：操作提示 + 一行免责 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex flex-col items-center gap-1.5 px-4 text-center">
            <div className="rounded-full border border-white/10 bg-carbon-850/85 px-4 py-1.5 text-[11px] text-ink-secondary backdrop-blur">
              拖动旋转 · 双指缩放 · 点击身体部位
            </div>
            <div className="text-[10px] leading-relaxed text-ink-muted">
              本页面为合成数据演示，非医疗器械，不提供诊断或治疗建议
            </div>
          </div>

          {/* 部位信息卡：桌面右侧浮层 / 移动端底部抽屉 */}
          <PartCard selected={selected} onClose={handleClose} />
        </>
      )}
    </main>
  );
}

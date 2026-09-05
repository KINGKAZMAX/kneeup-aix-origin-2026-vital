"use client";
// /body3d 3D 场景：护具(GLB) × 幽灵人体(胶囊代理) × 热点拾取
// 仅经 next/dynamic({ ssr:false }) 加载，three 只在客户端运行。
// leg_web.glb 已实测：extensionsUsed 仅 KHR_materials_specular，无 Draco / Meshopt 压缩，
// 不需要解码器；仍按管线决策挂 three 包内置的本地 MeshoptDecoder 作防御（无网络依赖）。
// 装配逻辑借鉴 项目二/前端/kneeup-3d-preview/index.html（Box3 自动扶正 + 居中缩放 + 面数统计）。

import { memo, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { PART_MAP, type PartId } from "./parts";

const BG = "#0B0C0E";
const GROUND = "#141518";
const GRID_LINE = "#232428";
const COBALT = "#4376EB";
const BRACE = "#1A1B1F";
const GHOST = "#8B909A";

const LEG_X = 0.11;

type SegId = "torso" | "pelvis" | "thighR" | "thighL" | "calfR" | "calfL" | "footR" | "footL";

/** 选中部位 → 高亮的胶囊段 */
const HIGHLIGHT: Record<PartId, SegId[]> = {
  knee: ["thighR", "calfR"],
  hip: ["thighR", "pelvis"],
  ankle: ["calfR", "footR"],
  waist: ["torso", "pelvis"],
};

const HOTSPOTS: { id: PartId; pos: [number, number, number] }[] = [
  { id: "knee", pos: [LEG_X, 0.52, 0.03] },
  { id: "hip", pos: [LEG_X, 1.0, 0.02] },
  { id: "ankle", pos: [LEG_X, 0.14, 0.05] },
  { id: "waist", pos: [0, 1.18, 0.03] },
];

export interface SceneStats {
  tris: number;
  fps: number;
  loaded: boolean;
}

interface Props {
  selected: PartId | null;
  onSelect: (id: PartId | null) => void;
  onStats: (s: SceneStats) => void;
  onError: (message: string) => void;
  modelUrl: string;
}

function Body3DScene({ selected, onSelect, onStats, onError, modelUrl }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  // 回调与选中态经 ref 透传进动画循环，场景只建一次
  const cbRef = useRef({ onSelect, onStats, onError });
  cbRef.current = { onSelect, onStats, onError };
  const selectedRef = useRef<PartId | null>(selected);
  const apiRef = useRef<{ setSelected: (id: PartId | null) => void } | null>(null);

  useEffect(() => {
    selectedRef.current = selected;
    apiRef.current?.setSelected(selected);
  }, [selected]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      cbRef.current.onError("WebGL 初始化失败");
      return;
    }
    // 低端机（deviceMemory≤4）dpr 上限 1.5，其余上限 2
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const dprCap = typeof mem === "number" && mem <= 4 ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.Fog(BG, 4.5, 9);

    const camera = new THREE.PerspectiveCamera(
      38,
      mount.clientWidth / Math.max(1, mount.clientHeight),
      0.01,
      60
    );
    const portrait = camera.aspect < 0.75;
    const dist = portrait ? 1.4 : 1;
    camera.position.set(1.55 * dist, 1.05 * dist, 2.2 * dist);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.82, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enablePan = false;
    controls.rotateSpeed = 0.6;
    controls.minDistance = 0.8;
    controls.maxDistance = 6;

    // 主光白光低强度 + 两盏钴蓝边缘光 + 低强度半球环境光，规范外色相不引入
    scene.add(new THREE.HemisphereLight("#C7CAD1", BG, 0.35));
    const key = new THREE.DirectionalLight("#FFFFFF", 0.85);
    key.position.set(2, 3, 2);
    scene.add(key);
    const rimA = new THREE.DirectionalLight(COBALT, 2.2);
    rimA.position.set(-2.5, 1.2, -2);
    scene.add(rimA);
    const rimB = new THREE.DirectionalLight(COBALT, 1.4);
    rimB.position.set(2.2, 0.6, -2.5);
    scene.add(rimB);

    // 地面 + 网格
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 48),
      new THREE.MeshStandardMaterial({ color: GROUND, roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const grid = new THREE.GridHelper(6.4, 32, GRID_LINE, GRID_LINE);
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.5;
    grid.position.y = 0.002;
    scene.add(grid);

    // 装配组：幽灵人体 + 护具 + 热点一起缓慢自转（转盘式）
    const assembly = new THREE.Group();
    scene.add(assembly);

    // —— 幽灵人体层：胶囊代理（躯干/骨盆/左右大腿/左右小腿/左右足） ——
    const segs = {} as Record<SegId, THREE.Mesh<THREE.CapsuleGeometry, THREE.MeshStandardMaterial>>;
    const addSeg = (
      id: SegId,
      radius: number,
      length: number,
      pos: [number, number, number],
      rot?: [number, number, number]
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(radius, length, 6, 14),
        new THREE.MeshStandardMaterial({
          color: GHOST,
          transparent: true,
          opacity: 0.22,
          roughness: 0.9,
          metalness: 0,
          depthWrite: false,
        })
      );
      mesh.position.set(...pos);
      if (rot) mesh.rotation.set(...rot);
      segs[id] = mesh;
      assembly.add(mesh);
    };
    addSeg("torso", 0.105, 0.34, [0, 1.28, 0]);
    addSeg("pelvis", 0.085, 0.14, [0, 1.0, 0], [0, 0, Math.PI / 2]);
    addSeg("thighR", 0.07, 0.3, [LEG_X, 0.74, 0]);
    addSeg("thighL", 0.07, 0.3, [-LEG_X, 0.74, 0]);
    addSeg("calfR", 0.055, 0.3, [LEG_X, 0.32, 0]);
    addSeg("calfL", 0.055, 0.3, [-LEG_X, 0.32, 0]);
    addSeg("footR", 0.045, 0.15, [LEG_X, 0.05, 0.05], [Math.PI / 2, 0, 0]);
    addSeg("footL", 0.045, 0.15, [-LEG_X, 0.05, 0.05], [Math.PI / 2, 0, 0]);

    // —— 热点拾取代理体：全透明小球，放大触控命中域 ——
    const hotspotMeshes = HOTSPOTS.map((h) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 10),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      m.position.set(...h.pos);
      m.userData.partId = h.id;
      assembly.add(m);
      return m;
    });

    // —— 引线标签（3D 线 + HTML 标签，逐帧投影） ——
    const lineGeo = new THREE.BufferGeometry();
    const linePos = new Float32Array(6);
    const lineAttr = new THREE.BufferAttribute(linePos, 3);
    lineGeo.setAttribute("position", lineAttr);
    const line = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: COBALT, transparent: true, opacity: 0.9 })
    );
    line.visible = false;
    line.frustumCulled = false;
    scene.add(line);

    const labelEl = labelRef.current;
    const setSelected = (id: PartId | null) => {
      (Object.keys(segs) as SegId[]).forEach((k) => {
        const mat = segs[k].material;
        if (id && HIGHLIGHT[id].includes(k)) {
          mat.emissive.set(COBALT);
          mat.emissiveIntensity = 0.85;
          mat.opacity = 0.38;
        } else {
          mat.emissive.set("#000000");
          mat.emissiveIntensity = 1;
          mat.opacity = 0.22;
        }
      });
      line.visible = !!id;
      if (labelEl) {
        labelEl.classList.toggle("hidden", !id);
        if (id) labelEl.textContent = `${PART_MAP[id].name} · ${PART_MAP[id].nameEn}`;
      }
    };
    apiRef.current = { setSelected };
    if (selectedRef.current) setSelected(selectedRef.current);

    // —— 护具模型：加载 leg_web.glb（无 Draco/Meshopt 压缩，MeshoptDecoder 仅防御） ——
    let tris = 0;
    let loaded = false;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        const braceMat = new THREE.MeshStandardMaterial({
          color: BRACE,
          metalness: 0.3,
          roughness: 0.55,
        });
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          (mesh.material as THREE.Material).dispose();
          mesh.material = braceMat;
          const g = mesh.geometry as THREE.BufferGeometry;
          tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
        });
        // 自动扶正：最长轴不在 Y 则旋转（参考 kneeup-3d-preview）
        const size0 = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
        if (size0.x > size0.y && size0.x >= size0.z) model.rotation.z = Math.PI / 2;
        else if (size0.z > size0.y) model.rotation.x = -Math.PI / 2;
        model.updateMatrixWorld(true);
        // Box3 量尺寸 → 居中缩放：模型为整条腿（脚底→髋），按幽灵右腿比例对位——
        // 高度缩放到脚底→髋（0.96），脚底贴地、水平居中到右腿轴线，膝部自然落在膝热点高度
        const fitted = new THREE.Group();
        fitted.add(model);
        const box = new THREE.Box3().setFromObject(fitted);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const s = 0.96 / size.y;
        const place = (g: THREE.Group, k: number) => {
          g.scale.setScalar(k);
          g.position.set(LEG_X - center.x * k, -box.min.y * k, -center.z * k);
        };
        place(fitted, s);
        // 轮廓壳：BackSide 放大 1.02 + emissive 钴蓝
        const shellMat = new THREE.MeshStandardMaterial({
          color: "#000000",
          emissive: COBALT,
          emissiveIntensity: 0.8,
          side: THREE.BackSide,
          roughness: 1,
          metalness: 0,
        });
        const shell = fitted.clone(true);
        shell.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) mesh.material = shellMat;
        });
        place(shell, s * 1.02);
        assembly.add(shell);
        assembly.add(fitted);
        loaded = true;
      },
      undefined,
      (err) => {
        if (disposed) return;
        cbRef.current.onError(err instanceof Error ? err.message : "leg_web.glb 加载失败");
      }
    );

    // —— 点击拾取：按下/抬起位移 <7px 才算点击，避免拖拽旋转误触发 ——
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(hotspotMeshes, false);
      const id = hits.length ? (hits[0].object.userData.partId as PartId) : null;
      cbRef.current.onSelect(id !== null && id === selectedRef.current ? null : id);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    // —— 主循环：自转 + 引线投影 + FPS/面数统计（performance.now 手动计时，避免 THREE.Clock 弃用告警） ——
    let prevT = performance.now();
    const vStart = new THREE.Vector3();
    const vEnd = new THREE.Vector3();
    const outward = new THREE.Vector3();
    let frames = 0;
    let lastStat = prevT;
    renderer.setAnimationLoop(() => {
      const nowT = performance.now();
      const dt = Math.min(0.05, (nowT - prevT) / 1000);
      prevT = nowT;
      assembly.rotation.y += dt * 0.3;
      controls.update();

      const sel = selectedRef.current;
      if (sel) {
        const hs = hotspotMeshes.find((m) => m.userData.partId === sel);
        if (hs) {
          hs.getWorldPosition(vStart);
          outward.set(vStart.x, 0, vStart.z);
          if (outward.lengthSq() < 1e-4) outward.set(1, 0, 0);
          outward.normalize();
          vEnd.copy(vStart).addScaledVector(outward, 0.38);
          vEnd.y += 0.22;
          linePos[0] = vStart.x;
          linePos[1] = vStart.y;
          linePos[2] = vStart.z;
          linePos[3] = vEnd.x;
          linePos[4] = vEnd.y;
          linePos[5] = vEnd.z;
          lineAttr.needsUpdate = true;
          if (labelEl) {
            vEnd.project(camera);
            if (vEnd.z > 1) {
              labelEl.classList.add("hidden");
            } else {
              labelEl.classList.remove("hidden");
              const x = (vEnd.x * 0.5 + 0.5) * mount.clientWidth;
              const y = (-vEnd.y * 0.5 + 0.5) * mount.clientHeight;
              labelEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -115%)`;
            }
          }
        }
      }

      renderer.render(scene, camera);
      frames += 1;
      const now = performance.now();
      if (now - lastStat >= 500) {
        cbRef.current.onStats({
          tris: Math.round(tris),
          fps: Math.round((frames * 1000) / (now - lastStat)),
          loaded,
        });
        frames = 0;
        lastStat = now;
      }
    });

    return () => {
      disposed = true;
      apiRef.current = null;
      ro.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      const geoSet = new Set<THREE.BufferGeometry>();
      const matSet = new Set<THREE.Material>();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && mesh.geometry) geoSet.add(mesh.geometry as THREE.BufferGeometry);
        const withMat = o as THREE.Mesh | THREE.Line;
        if (withMat.material) {
          const mats = Array.isArray(withMat.material) ? withMat.material : [withMat.material];
          mats.forEach((m) => m && matSet.add(m));
        }
      });
      geoSet.forEach((g) => g.dispose());
      matSet.forEach((m) => m.dispose());
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    };
  }, [modelUrl]);

  return (
    <div ref={mountRef} className="absolute inset-0" style={{ touchAction: "none" }}>
      {/* 引线标签：位置由动画循环逐帧写入 transform */}
      <div
        ref={labelRef}
        className="pointer-events-none absolute left-0 top-0 z-10 hidden whitespace-nowrap rounded-md border border-cobalt-300/40 bg-carbon-950/90 px-2 py-0.5 font-mono text-[11px] text-cobalt-150"
      />
    </div>
  );
}

export default memo(Body3DScene);

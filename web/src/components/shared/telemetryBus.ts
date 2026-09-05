"use client";
// 跨Tab联动总线（演示用）：模拟器 → 患者端「设备在线」感知
// 说明：患者端训练曲线由本地 useSession（同 sessionId、同种子）确定性驱动，
// 此总线只广播模拟器心跳/状态，用于「推流到患者端」的联动呈现。

const CHANNEL = "airflow-knee-demo-bus";

export interface BusMsg {
  type: "hello" | "state" | "bye";
  sessionId: string;
  mode?: string;
  state?: string;
  t?: number;
  ts: number;
}

export function postBus(msg: Omit<BusMsg, "ts">) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage({ ...msg, ts: Date.now() } satisfies BusMsg);
    ch.close();
  } catch {
    /* 总线失败不影响主流程 */
  }
}

export function onBus(cb: (msg: BusMsg) => void): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return () => undefined;
  try {
    const ch = new BroadcastChannel(CHANNEL);
    const handler = (e: MessageEvent) => cb(e.data as BusMsg);
    ch.addEventListener("message", handler);
    return () => {
      ch.removeEventListener("message", handler);
      ch.close();
    };
  } catch {
    return () => undefined;
  }
}

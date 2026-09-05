/* Read-only USB transport. There is deliberately NO serial write, DTR override,
   remote start, stop, valve command or assistance-level command in this file. */
(function () {
  'use strict';
  const {parseLine, LineFramer} = window.AirflowProtocol;
  class AirflowDevice extends EventTarget {
    constructor() {
      super();
      this.port = null; this.reader = null; this.readTask = null;
      this.closing = false; this.demoTimer = null;
      this.connection = 'disconnected'; this.source = 'none';
      this.protocol = null; this.last = null; this.lastAt = 0; this.lastSampleAt = 0;
      this.points = []; this.events = []; this.invalid = 0; this.sampleCount = 0;
      this.lowEdges = 0; this.generation = 0; this.lastSeq = null; this.lastUptime = null;
      this.error = ''; this.startedAt = 0;
      if ('serial' in navigator) navigator.serial.addEventListener('disconnect', e => {
        if ((e.target === this.port || e.port === this.port) && !this.closing) {
          this.error = 'USB 已拔出；页面不再接收数据。断开数据连接不等于气泵已停止。';
          this.disconnect('USB 断开');
        }
      });
    }
    notify(name = 'change', detail = null) { this.dispatchEvent(new CustomEvent(name, {detail})); }
    log(text, level = 'info') {
      this.events.unshift({at: Date.now(), text, level});
      this.events.length = Math.min(this.events.length, 120);
      this.notify('event');
    }
    clearStream() {
      this.last = null; this.lastAt = 0; this.lastSampleAt = 0;
      this.protocol = null; this.points = []; this.sampleCount = 0; this.invalid = 0;
      this.lowEdges = 0; this.lastSeq = null; this.lastUptime = null; this.generation++;
      this.startedAt = Date.now();
    }
    get snapshot() {
      const now = Date.now();
      return { connection: this.connection, source: this.source, protocol: this.protocol,
        last: this.last, lastAt: this.lastAt, lastSampleAt: this.lastSampleAt,
        age: this.lastAt ? now - this.lastAt : Infinity,
        sampleAge: this.lastSampleAt ? now - this.lastSampleAt : Infinity,
        stale: Boolean(this.lastAt && now - this.lastAt > 7000),
        live: this.connection === 'connected' || this.connection === 'demo',
        sampleCount: this.sampleCount, invalid: this.invalid, lowEdges: this.lowEdges,
        error: this.error, generation: this.generation };
    }
    async connect() {
      if (this.connection === 'connecting' || this.port) return;
      if (!window.isSecureContext || !('serial' in navigator)) {
        this.error = '当前环境未提供 Web Serial。请在电脑 Chrome/Edge 中打开 http://localhost:8000，不要嵌入预览框。';
        this.notify(); return;
      }
      if (!window.confirm('这是只读监测连接，不是急停控制。打开串口可能使 UNO 复位并重新运行原程序。请先断开气泵外部电源，核对接线及停止方式，再连接。继续？')) return;
      this.stopDemo(); this.clearStream(); this.error = '';
      this.connection = 'connecting'; this.source = 'none'; this.notify();
      let port = null;
      try {
        // requestPort must stay in the button's user-gesture call chain.
        port = await navigator.serial.requestPort();
        await port.open({baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none', bufferSize: 4096});
        this.port = port; this.closing = false; this.source = 'serial'; this.connection = 'connected';
        this.log('已打开 USB 串口 · 115200 baud · 等待设备完整数据行');
        this.notify(); this.readTask = this.readLoop(port);
      } catch (e) {
        if (port && !this.port) { try { await port.close(); } catch (_) {} }
        this.connection = 'disconnected'; this.source = 'none';
        this.error = e.name === 'NotFoundError' ? '未选择串口。' :
          '无法打开串口：' + (e.message || e.name) + '。请关闭 Arduino 串口监视器/绘图器和其他占用端口的页面。';
        this.log(this.error, 'warn'); this.notify();
      }
    }
    async readLoop(port) {
      const decoder = new TextDecoder();
      const framer = new LineFramer();
      let failure = '';
      try {
        if (!port.readable) throw new Error('串口没有可读数据流');
        this.reader = port.readable.getReader();
        while (!this.closing) {
          const {value, done} = await this.reader.read();
          if (done) break;
          const text = decoder.decode(value, {stream: true});
          for (const line of framer.push(text)) {
            if (!line.trim()) continue;
            const parsed = parseLine(line);
            if (parsed) this.ingest(parsed);
            else { this.invalid++; if (this.invalid === 1 || this.invalid % 100 === 0) this.log('忽略未识别数据行（启动信息、格式或波特率需检查）', 'warn'); }
          }
        }
      } catch (e) { if (!this.closing) failure = e.message || '读取中断'; }
      finally {
        if (this.reader) { try { this.reader.releaseLock(); } catch (_) {} this.reader = null; }
        if (!this.closing && this.port === port) {
          try { await port.close(); } catch (_) {}
          this.port = null; this.connection = 'disconnected';
          this.error = failure ? '串口读取中断：' + failure : '设备数据流已关闭。';
          this.log(this.error + ' 请使用实物停止/泄压方式。', 'warn');
          this.notify('ended', '串口读取结束'); this.notify();
        }
      }
    }
    async disconnect(reason = '手动断开') {
      if (this.closing) return;
      if (this.source === 'simulated') { this.stopDemo(); return; }
      this.closing = true;
      const port = this.port;
      if (this.reader) { try { await this.reader.cancel(); } catch (_) {} }
      if (this.readTask) { try { await this.readTask; } catch (_) {} }
      if (port) { try { await port.close(); } catch (_) {} }
      this.port = null; this.reader = null; this.readTask = null;
      this.connection = 'disconnected'; this.closing = false;
      this.log(reason + '；仅断开数据，不控制气动装置', 'warn');
      this.notify('ended', reason); this.notify();
    }
    ingest(packet) {
      const now = Date.now();
      if (packet.kind === 'boot') {
        this.notify('ended', '固件重启'); this.clearStream();
        this.log('收到固件启动标记；已清空上次连接的实时数值'); this.notify(); return;
      }
      if (!['telemetry', 'legacy'].includes(packet.kind)) return;
      const incoming = packet.kind;
      const reset = this.protocol && this.protocol !== incoming;
      // A millis wrap is not a reboot. A backwards sample sequence is treated as a new stream.
      const seqReset = packet.kind === 'telemetry' && this.lastSeq !== null && packet.seq < this.lastSeq && this.lastSeq - packet.seq < 0x80000000;
      if (reset || seqReset) {
        this.notify('ended', '协议变化或设备重启'); this.clearStream();
        this.log('检测到新数据流，已重置实时统计', 'warn');
      }
      const previous = this.last;
      const isNewSample = incoming === 'legacy' || this.lastSeq !== packet.seq;
      this.protocol = incoming; this.last = packet; this.lastAt = now;
      this.lastSampleAt = now - (packet.sampleAge || 0);
      if (!previous) this.log(incoming === 'legacy' ? '识别到原版单数值固件：仅肌电可读，A5 未上报' : '识别到 v1 遥测固件：肌电 + A5 指令状态');
      if (incoming === 'telemetry') {
        if (previous && previous.a5 !== undefined && previous.a5 !== packet.a5) {
          if (previous.a5 === 'HIGH' && packet.a5 === 'LOW') this.lowEdges++;
          this.log('控制器上报 A5 → ' + packet.a5 + '（非压力或实际气泵反馈）');
          this.notify('gpio', {at: now, a5: packet.a5});
        }
        this.lastSeq = packet.seq; this.lastUptime = packet.t_ms;
      }
      if (isNewSample) {
        this.lastSampleAt = now - (packet.sampleAge || 0);
        this.sampleCount++;
        const point = {at: this.lastSampleAt, receivedAt: now, source: this.source, protocol: incoming,
          emg: packet.emg, raw: packet.raw ?? null, a5: packet.a5 ?? null, seq: packet.seq ?? null,
          threshold: packet.threshold ?? null, t_ms: packet.t_ms ?? null, sample_ms: packet.sample_ms ?? null};
        this.points.push(point);
        if (this.points.length > 2400) this.points.shift();
        this.notify('sample', point);
      }
      this.notify();
    }
    startDemo() {
      if (this.port || this.connection === 'connecting') return;
      this.stopDemo(); this.clearStream(); this.error = '';
      this.source = 'simulated'; this.connection = 'demo';
      this.log('已显式开启合成演示：数值不来自实物', 'warn');
      let seq = 0;
      const start = Date.now();
      const tick = () => {
        const t = Date.now() - start;
        const emg = 25 + 70 * Math.max(0, Math.sin(t / 900)) + 4 * Math.sin(t / 83);
        this.ingest({kind: 'telemetry', emg, raw: Math.round(510 + 35 * Math.sin(t / 110)),
          threshold: 66, a5: emg >= 66 ? 'LOW' : 'HIGH', phase: emg >= 66 ? 'trigger_hold' : 'rest',
          seq: ++seq, t_ms: t, sample_ms: t, sampleAge: 0});
      };
      tick(); this.demoTimer = setInterval(tick, 100); this.notify();
    }
    stopDemo() {
      if (!this.demoTimer && this.connection !== 'demo') return;
      clearInterval(this.demoTimer); this.demoTimer = null;
      this.connection = 'disconnected'; this.notify('ended', '合成演示结束'); this.notify();
    }
  }
  window.AirflowDevice = AirflowDevice;
})();

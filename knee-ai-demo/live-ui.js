/* Existing app integration: telemetry, chart, local recordings. No dependencies. */
(function () {
  'use strict';
  const device = new window.AirflowDevice();
  const sessions = window.AirflowSessions;
  const STORAGE_KEY = 'airflowUsbSessionsV1';
  const MAX_RECORD_SAMPLES = 10000;
  let recording = null, lastRecording = null, summaries = [];
  let seenEventSignature = '', storageNotice = '', getContext = () => ({});
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    summaries = Array.isArray(parsed) ? parsed.filter(x => x && typeof x.id === 'string' && typeof x.startedAt === 'number').slice(0, 40) : [];
  } catch (_) { storageNotice = '本地历史不可读；当前连接与记录仍可使用。'; }
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = n => Number.isFinite(n) ? n.toFixed(2) : '—';
  const clock = ms => new Date(ms).toLocaleTimeString('zh-CN', {hour12: false});
  const dateTime = ms => new Date(ms).toLocaleString('zh-CN', {hour12: false});
  function set(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
  function sourceLabel(s = device.snapshot) {
    if (s.connection === 'connecting') return '等待选择 USB';
    if (s.connection === 'demo') return '合成演示 · 非实测';
    if (s.connection === 'connected') return s.last && (s.stale || s.sampleAge > 7000) ? 'USB 已连接 · 数据过期' : s.last ? 'USB 串口 · 只读实测' : 'USB 已打开 · 等待数据';
    return '实物未连接';
  }
  function panel(title = '今天，留下一次行动记录') {
    return `
    <div class="page-title usb-page-title"><div><div class="eyebrow">TODAY / CAPTURE & REVIEW</div><h1>${esc(title)}</h1><p class="lead usb-intro">预设任务：由队员演示一次受控动作。任务来源为团队路演脚本；不构成个人训练处方。</p></div><span class="chip" id="liveSourceBadge">实物未连接</span></div>
    <div class="usb-safety"><b>台架演示 / 非急停界面</b><span>连接前先断开气泵外部电源。打开串口可能让 UNO 复位。停止记录、关闭网页或断开 USB 都不代表已经停泵或泄压。</span></div>
    <div class="roadshow-path"><span>01 采集一次动作</span><span>02 解释记录</span><span>03 专业复核</span></div>
    <section class="glass-card usb-connect-card">
      <div><div class="eyebrow">01 / CONNECT</div><h2>连接肌电记录</h2><p>USB 接在当前电脑；传感来源与摄像头来源分别标记。</p></div>
      <div class="usb-actions"><button class="btn primary" id="connectDevice">连接 Arduino USB</button><button class="btn" id="disconnectDevice" disabled>断开数据连接</button><button class="btn ghost" id="toggleDemo">显式开启合成演示</button></div>
      <p id="usbError" class="usb-error" role="status"></p>
    </section>
    <div class="card roadshow-capture-controls"><div><div class="eyebrow">TEAM DEMO TASK</div><h2>记录今天这一次</h2><p class="usb-caption">一次动作、一个人工事件、一份共同查看的记录。</p></div><div class="usb-actions"><button class="btn cobalt" id="startUsbRecord" disabled>开始记录（不启动气泵）</button><button class="btn" id="markManualPause" disabled>标注暂停</button><button class="btn" id="markManualEnd" disabled>主动结束并标注</button><button class="btn ghost" data-role-nav="therapist">打开专业复核 →</button></div></div>
    <div id="cameraObserverMount"></div>
    <details class="usb-technical"><summary>肌电与控制器读数 · 详细参数</summary><div class="usb-metrics">
      <div class="card"><div class="card-label">FILTERED EMG / 滤波肌电</div><strong class="usb-value" id="emgValue">—</strong><span class="usb-unit">固件数值 · 非肌力百分比</span></div>
      <div class="card"><div class="card-label">RAW A0 / 原始读数</div><strong class="usb-value" id="rawValue">—</strong><span class="usb-unit" id="rawHint">原版固件不输出此项</span></div>
      <div class="card"><div class="card-label">GPIO A5 / 指令状态</div><strong class="usb-value" id="gpioValue">—</strong><span class="usb-unit" id="gpioHint">不是气泵或压力反馈</span></div>
      <div class="card"><div class="card-label">SAMPLE AGE / 样本年龄</div><strong class="usb-value" id="sampleAgeValue">—</strong><span class="usb-unit" id="sampleAgeHint">等待设备数据</span></div>
    </div>
    </details>
    <section class="usb-main-grid">
      <div class="card usb-chart-card">
        <div class="usb-card-head"><div><div class="eyebrow">02 / SENSE</div><h2>肌电输入轨迹</h2></div><span class="chip" id="protocolBadge">未识别协议</span></div>
        <div class="usb-chart-wrap"><canvas id="emgCanvas" aria-label="最近 60 秒肌电采样点" role="img"></canvas><span class="usb-chart-empty" id="chartOverlay">连接设备后显示真实数据<br>不会自动填入演示波形</span></div>
        <div class="usb-chart-meta"><span id="sampleCount">0 个采样点</span><span id="thresholdText">比较阈值：等待固件信息</span></div>
        <p class="usb-caption">仅连接实际收到的采样点，不补点、不预测。原固件包含 1 秒等待，触发后另有 4 秒等待；这不是连续 500 Hz 的肌电波形。</p>
      </div>
      <div class="card usb-decision-card">
        <div class="eyebrow">03 / UNDERSTAND</div><h2>护膝实际做了什么？</h2>
        <div class="usb-flow">
          <div><i>1</i><span><b>感知</b><small id="flowSense">等待 A0 滤波值</small></span></div>
          <div><i>2</i><span><b>规则判断</b><small id="flowDecide">当前接入的是固件规则，不是 AI 模型</small></span></div>
          <div><i>3</i><span><b>控制器输出</b><small id="flowOutput">A5 尚未上报</small></span></div>
          <div><i>4</i><span><b>物理结果</b><small>气泵动作、气囊压力与助力大小：未接入反馈</small></span></div>
        </div>
        <div class="session-note" id="hardwareExplanation">现有单数值协议只能验证输入数据已到达网页，不能证明泵的实际工作状态。</div>
      </div>
    </section>
    ${window.AirflowAIView ? window.AirflowAIView.panel() : ""}
    <section class="usb-main-grid usb-bottom-grid">
      <div class="card">
        <div class="usb-card-head"><div><div class="eyebrow">04 / RECORD</div><h2>留下一次可追溯记录</h2></div><span class="chip" id="recordingBadge">未开始记录</span></div>
        <p class="usb-caption">这里的开始/结束按钮只控制网页记录。真实数据与合成演示分别标记，来源变化或连接中断时结束当前记录。</p>
        <div class="usb-record-stats"><div><b id="recordDuration">00:00</b><small>本次记录时长</small></div><div><b id="recordSamples">0</b><small>本次采样数</small></div><div><b id="recordEdges">—</b><small>已观察的 HIGH → LOW</small></div></div>
        <div class="usb-actions"><button class="btn" id="finishUsbRecord" disabled>结束记录（不停止气泵）</button><button class="btn" id="exportUsbRecord" disabled>导出本次 CSV</button><button class="btn" id="exportUsbFullSession" disabled>导出完整会话 JSON</button><button class="btn ghost" data-nav="records">查看记录 →</button></div>
        <p class="usb-caption" id="storageNotice"></p>
      </div>
      <details class="card usb-debug usb-connection-log"><summary>连接与指令日志 · 联调详情</summary><div id="usbEvents" class="usb-event-log" aria-label="事件记录"><p>等待事件。</p></div></details>
    </section>
    ${window.AirflowRoadshow ? window.AirflowRoadshow.sessionPanel() : ""}
    <details class="card usb-debug"><summary>联调详情 / 最近一帧 / 接入边界</summary><p class="usb-caption" id="diagnosticText"></p><pre id="lastPacket">尚未收到数据</pre><p class="usb-caption">肌电单位与实际板型需核对；气压、实际辅助力、步数、电量、疲劳和 AI 控制未接入。摄像头提供单独标记的二维角度估计；同机角色共享当前会话，不代表跨设备同步。</p></details>`;
  }
  function refresh() {
    const s = device.snapshot;
    const available = s.live && !s.stale && s.sampleAge <= 7000 && s.last;
    const label = sourceLabel(s);
    const top = document.getElementById('globalDeviceStatus');
    if (top) {
      top.dataset.source = s.connection === 'demo' ? 'demo' : s.connection === 'connected' && !s.stale && s.last ? 'live' : 'offline';
      set('globalStatusText', label);
    }
    set('connectionStripText', label + ' · 当前电脑共享一份会话；摄像头与肌电分别标记来源');
    set('liveSourceBadge', label);
    const panelBadge = document.getElementById('liveSourceBadge');
    if (panelBadge) panelBadge.dataset.source = s.source;
    set('usbError', s.error || ((!window.isSecureContext || !('serial' in navigator)) ? '此浏览器/页面没有 Web Serial。请用电脑 Chrome/Edge 打开 localhost 页面。' : ''));
    const controls = {
      connectDevice: s.connection === 'connected' || s.connection === 'connecting',
      disconnectDevice: s.connection !== 'connected',
      toggleDemo: s.connection === 'connected' || s.connection === 'connecting',
      startUsbRecord: !available || Boolean(recording), finishUsbRecord: !recording, markManualPause: !recording, markManualEnd: !recording,
      exportUsbRecord: !(recording?.samples.length || lastRecording?.samples.length),
      exportUsbFullSession: !(recording?.samples.length || lastRecording?.samples.length)
    };
    for (const [id, disabled] of Object.entries(controls)) { const el = document.getElementById(id); if (el) el.disabled = disabled; }
    set('toggleDemo', s.connection === 'demo' ? '停止合成演示' : '显式开启合成演示');
    set('emgValue', available ? number(s.last.emg) : '—');
    set('rawValue', available && s.last.raw !== undefined ? String(s.last.raw) : '—');
    set('rawHint', s.protocol === 'telemetry' ? (s.source === 'simulated' ? '合成 A0 · 非实测' : 'A0 ADC 读数 · 0–1023') : '原版固件不输出此项');
    set('gpioValue', available && s.last.a5 ? (s.source === 'simulated' ? '模拟 ' : '') + s.last.a5 : '—');
    set('gpioHint', s.protocol === 'legacy' ? '原版未上报，不能推断气泵状态' : '控制器上报 · 非实际压力反馈');
    set('sampleAgeValue', s.live && s.last ? (s.sampleAge / 1000).toFixed(1) + ' s' : '—');
    set('sampleAgeHint', s.stale ? '超过 7 秒无完整帧 · 数值已隐藏' : !available ? '等待设备数据' : s.sampleAge > 1500 ? '保持的是旧样本，未持续采样' : '距最近一次采样');
    set('protocolBadge', s.protocol === 'legacy' ? '原版 · 纯数值' : s.protocol === 'telemetry' ? '遥测 v1 · JSON' : '未识别协议');
    set('sampleCount', `${s.sampleCount} 个采样点 · ${s.invalid} 行未识别`);
    const threshold = s.last?.threshold ?? (s.protocol === 'legacy' ? 66 : null);
    set('thresholdText', threshold === null ? '比较阈值：等待固件信息' : '阈值 ' + number(threshold) + (s.protocol === 'legacy' ? ' · 原文件参考值，未回读' : s.source === 'simulated' ? ' · 模拟值' : ' · 固件上报'));
    set('flowSense', available ? `滤波数值 ${number(s.last.emg)}（非百分比）` : '等待有效采样值');
    set('flowDecide', available && threshold !== null ? `${number(s.last.emg)} ${s.last.emg >= threshold ? '≥' : '<'} ${number(threshold)} · ${s.protocol === 'legacy' ? '参考比较，不是回读决策' : '规则阈值'}` : '当前接入的是固件规则，不是 AI 模型');
    set('flowOutput', available && s.last.a5 ? `A5 = ${s.last.a5}${s.source === 'simulated' ? '（合成演示）' : '（固件上报）'}` : 'A5 未上报或当前数据不可用');
    set('hardwareExplanation', s.source === 'simulated' && s.live ? '当前全部曲线和状态均为合成演示，没有连接实体设备。' :
      !available ? '未获得当前有效数据；不会用模拟值补上断开的实物数据。' :
      s.protocol === 'legacy' ? '原固件仅输出肌电数值。网页没有收到 A5、气压或角度，不会按阈值把气泵状态猜成“开启”。' :
      `控制器最后上报 A5=${s.last.a5}。LOW/HIGH 与继电器、泵、阀的实际动作对应关系仍需接线核验；页面不把电平换算成助力比例。`);
    const activeRecord = recording || lastRecording;
    const duration = activeRecord ? (recording ? Date.now() : activeRecord.endedAt) - activeRecord.startedAt : 0;
    set('recordDuration', String(Math.floor(duration / 60000)).padStart(2, '0') + ':' + String(Math.floor(duration / 1000) % 60).padStart(2, '0'));
    set('recordSamples', activeRecord ? String(activeRecord.samples.length) : '0');
    set('recordEdges', activeRecord?.protocol === 'telemetry' ? String(activeRecord.lowEdges) : '—');
    set('recordingBadge', recording ? (recording.source === 'serial' ? '正在记录 · USB 实测' : '正在记录 · 合成演示') : lastRecording ? '已结束 · ' + lastRecording.reason : '未开始记录');
    set('storageNotice', storageNotice || '同机角色共享当前记录。完整数据仅保留在本页内存，刷新前请导出完整会话。');
    const eventSignature = device.events.map(x => x.at + x.text).join('|');
    const eventEl = document.getElementById('usbEvents');
    if (eventEl && (eventSignature !== seenEventSignature || !eventEl.dataset.ready)) {
      eventEl.innerHTML = device.events.length ? device.events.slice(0, 15).map(e => `<div class="usb-event ${e.level === 'warn' ? 'warn' : ''}"><time>${clock(e.at)}</time><span>${esc(e.text)}</span></div>`).join('') : '<p>等待事件。</p>';
      seenEventSignature = eventSignature; eventEl.dataset.ready = '1';
    }
    set('diagnosticText', '连接：' + s.connection + ' / 来源：' + s.source + ' / 协议：' + (s.protocol || '尚未识别') + ' / 采样记录保存在本地；AI 仅在授权并手动分析时发送窗口摘要。');
    set('lastPacket', s.last ? JSON.stringify(s.last, null, 2) : '尚未收到数据');
    const overlay = document.getElementById('chartOverlay');
    if (overlay) {
      overlay.hidden = Boolean(available);
      overlay.textContent = s.last && (s.stale || s.sampleAge > 7000) ? '数据已过期 · 历史曲线仅供回看' : !s.live && device.points.length ? '连接已结束 · 历史曲线仅供回看' : '等待数据 · 不自动生成模拟波形';
    }
    drawChart(s, threshold);
    window.AirflowAIView?.refresh();
    window.AirflowRoadshow?.refresh();
    if (recording && (s.stale || s.sampleAge > 7000)) finishRecord('数据超过 7 秒未更新');
  }
  function drawChart(s, threshold) {
    const canvas = document.getElementById('emgCanvas'); if (!canvas) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const end = Date.now(), start = end - 60000;
    const points = device.points.filter(p => p.at >= start && p.at <= end);
    const values = points.map(p => p.emg); if (threshold !== null) values.push(threshold);
    let low = Math.min(0, ...values), high = Math.max(10, ...values); const pad = (high - low) * .15;
    low -= pad; high += pad;
    const left = 48, right = width - 16, top = 18, bottom = height - 30;
    const x = time => left + (time - start) / 60000 * (right - left);
    const y = v => bottom - (v - low) / (high - low) * (bottom - top);
    ctx.font = '11px ui-monospace, monospace'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const val = low + (high - low) * i / 4, yy = y(val);
      ctx.strokeStyle = '#232428'; ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(right, yy); ctx.stroke();
      ctx.fillStyle = '#8B909A'; ctx.textAlign = 'right'; ctx.fillText(val.toFixed(0), left - 8, yy + 4);
    }
    ctx.textAlign = 'center';
    [-60, -45, -30, -15, 0].forEach(sec => ctx.fillText(sec === 0 ? '现在' : `${sec}s`, x(end + sec * 1000), height - 8));
    if (threshold !== null) {
      ctx.strokeStyle = '#FFFFFF'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(left, y(threshold)); ctx.lineTo(right, y(threshold)); ctx.stroke(); ctx.setLineDash([]);
    }
    if (points.length) {
      ctx.strokeStyle = '#4376EB'; ctx.lineWidth = 2; ctx.beginPath();
      points.forEach((p, i) => { if (!i || p.at - points[i - 1].at > 7000) ctx.moveTo(x(p.at), y(p.emg)); else ctx.lineTo(x(p.at), y(p.emg)); }); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      points.filter((_, i) => points.length < 150 || i % 5 === 0).forEach(p => { ctx.beginPath(); ctx.arc(x(p.at), y(p.emg), 2.5, 0, Math.PI * 2); ctx.fill(); });
    }
  }
  function startRecord() {
    const s = device.snapshot;
    if (recording || !s.live || s.stale || !s.last) return;
    recording = sessions.start(s, getContext());
    if (!recording) return;
    device.log('开始网页记录 · 不向硬件发送命令'); refresh();
  }
  function finishRecord(reason = '手动结束') {
    if (!recording) return;
    lastRecording = sessions.finish(reason); recording = null;
    const samples = lastRecording.samples;
    const vals = samples.map(x => x.emg);
    const summary = {id: lastRecording.id, startedAt: lastRecording.startedAt, endedAt: lastRecording.endedAt,
      source: lastRecording.source, protocol: lastRecording.protocol, sampleCount: samples.length,
      min: vals.length ? Math.min(...vals) : null, max: vals.length ? Math.max(...vals) : null,
      mean: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
      lowEdges: lastRecording.protocol === 'telemetry' ? lastRecording.lowEdges : null,
      reason, context: lastRecording.context};
    summaries.unshift(summary); summaries = summaries.slice(0, 40);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries)); }
    catch (_) { storageNotice = '摘要未写入本地存储（权限或容量限制）。请立即导出 CSV。'; }
    device.log('网页记录结束：' + reason + '；未向气泵发送停止命令'); refresh();
  }
  function downloadBlob(filename, text, type) {
    const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportCSV() {
    const rec = recording || lastRecording; if (!rec?.samples.length) return;
    const head = ['sample_time','received_time','source','protocol','emg_firmware_units','raw_adc','a5_command','sample_seq','threshold_reported','mcu_ms','mcu_sample_ms'];
    const rows = rec.samples.map(p => [new Date(p.at).toISOString(), new Date(p.receivedAt).toISOString(), p.source, p.protocol, p.emg, p.raw ?? '', p.a5 ?? '', p.seq ?? '', p.threshold ?? '', p.t_ms ?? '', p.sample_ms ?? '']);
    const csv = [head, ...rows].map(row => row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    downloadBlob(`AIRFLOW-${rec.source}-${rec.id}.csv`, '\ufeff' + csv, 'text/csv;charset=utf-8');
  }
  function records() { return window.AirflowRoadshow.records(summaries); }
  document.addEventListener('click', e => {
    const id = e.target.closest('button')?.id;
    if (id === 'connectDevice') device.connect();
    if (id === 'disconnectDevice') device.disconnect();
    if (id === 'toggleDemo') { if (device.connection === 'demo') device.stopDemo(); else device.startDemo(); }
    if (id === 'startUsbRecord') startRecord();
    if (id === 'finishUsbRecord') finishRecord();
    if (id === 'markManualPause') sessions.addManualEvent('manual_pause');
    if (id === 'markManualEnd' && recording) { sessions.addManualEvent('manual_end'); finishRecord('主动结束（人工标注）'); }
    if (id === 'exportUsbRecord') exportCSV();
    if (id === 'exportUsbFullSession') { const rec = recording || lastRecording; if (rec) downloadBlob(`AIRFLOW-full-${rec.source}-${rec.id}.json`, JSON.stringify(rec, null, 2), 'application/json'); }
    if (id === 'exportUsbSummaries') downloadBlob('AIRFLOW-session-summaries.json', JSON.stringify(summaries, null, 2), 'application/json');
  });
  device.addEventListener('sample', e => {
    if (!recording) return;
    if (recording.source !== e.detail.source || recording.generation !== device.generation) { finishRecord('来源变化'); return; }
    sessions.addSample(e.detail, device.generation);
    if (recording.samples.length >= MAX_RECORD_SAMPLES) finishRecord('达到 10000 点记录上限');
  });
  device.addEventListener('gpio', e => sessions.addGPIO(e.detail, device.snapshot));
  window.addEventListener('airflow:camera-observation', e => sessions.addCamera(e.detail));
  window.addEventListener('airflow:ai-history', e => sessions.aiChanged(e.detail.entry));
  device.addEventListener('ended', e => finishRecord(e.detail || '连接结束'));
  device.addEventListener('change', refresh);
  window.addEventListener('beforeunload', e => {
    if (recording || device.port) { e.preventDefault(); e.returnValue = ''; }
  });
  setInterval(refresh, 250);
  window.AirflowLive = {device, panel, records, refresh, downloadBlob, startRecord, finishRecord,
    attachAI: entry => sessions.attachAI(entry), setContextReader: fn => { getContext = fn; }};
})();

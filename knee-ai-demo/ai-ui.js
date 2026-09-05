/* AI view integration; one observer and one delegated listener across route changes. */
(function () {
  'use strict';
  const live = window.AirflowLive, {Observer, SUGGESTIONS, rule} = window.AirflowAI;
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const source = value => ({serial: 'USB 串口输入', simulated: '合成输入 · 非实测', replay: '回放输入'})[value] || '无输入';
  const stamp = time => new Date(time).toLocaleString('zh-CN', {hour12: false});
  const eventLabels = {manual_end: '人工标注：主动结束', manual_pause: '人工标注：暂停', review_requested: '请求专业复核', recording_started: '开始记录', recording_ended: '结束记录'};
  let historySignature = '';
  const notified = new WeakMap();
  const observer = new Observer(live.device, {
    getSessionContext: () => window.AirflowSessions?.active || window.AirflowSessions?.current || null,
    onChange: () => { notifyHistory(); refresh(); }, onRecord: entry => live.attachAI(entry)
  });
  function notifyHistory() {
    for (const entry of observer.history) {
      const signature = `${entry.status}/${entry.mode}/${entry.completedAt || ''}`;
      if (notified.get(entry) === signature) continue;
      notified.set(entry, signature);
      window.dispatchEvent(new CustomEvent('airflow:ai-history', {detail: {entry, sessionId: entry.input.sessionId || null,
        phase: entry.status === 'pending' ? 'pending' : entry.status === 'discarded' ? 'discarded' : 'completed'}}));
    }
  }
  function panel() {
    return `<section class="card ai-observer" aria-label="AI 只读观察">
      <div class="usb-card-head"><div><div class="eyebrow">AI / OBSERVE & EXPLAIN</div><h2>AI 能解释什么？</h2></div><span class="chip" id="aiMode">AI 未连接</span></div>
      <p class="usb-caption">AI Adaptive Mobility Assist System · Assist, not replace。本阶段仅观察与建议，尚未完成 AI 物理控制闭环。</p>
      <p id="aiService" class="usb-caption"></p>
      <details class="ai-consent-details"><summary>发送字段与授权范围</summary><p class="usb-caption">仅在点击分析时，经本机服务发送：请求/窗口/会话标识、generation、来源、协议、窗口起止时间、新样本数、样本/完整帧年龄、滤波最小/最大/均值、采样间隔、阈值及来源、已上报 A5 标签与变化次数、baseline=null。会话事件仅含固定类型、时间和编号（开始/结束记录、人工暂停/主动结束、复核请求）。下方可查看精确 JSON。不会发送事件自由文字、姓名、联系方式、摄像头画面或角度、原始流及完整健康历史。授权只保留在本页内存；换源/重连需重新确认。撤销后不再发送，已送达服务商的数据无法撤回。</p></details>
      <label class="ai-consent"><input type="checkbox" id="aiConsent">我确认上方模型服务，并同意手动发送所列窗口摘要</label>
      <div class="usb-actions"><button class="btn cobalt" id="analyzeAI" disabled>分析当前窗口</button><button class="btn" id="reloadAI">重新检查模型配置</button><button class="btn ghost" id="exportAI">导出 AI 历史 JSON</button></div>
      <p id="aiStatus" class="usb-caption" role="status" aria-live="polite">等待数据/模型未配置</p>
      <p id="aiInput" class="usb-caption"></p><p id="aiGates" class="usb-caption"></p>
      <details><summary>当前可发送的窗口摘要（程序计算）</summary><pre id="aiSummary">暂无有效窗口</pre></details>
      <div class="ai-result"><h3>模型观察</h3><p id="aiObservation">等待数据/模型未配置</p><h3>下一步建议</h3><p id="aiSuggestion">尚无模型建议</p><p id="aiExplanation"></p><h3>数据依据</h3><pre id="aiEvidence">暂无模型引用</pre><div id="aiEventReferences" aria-label="引用的记录事件"></div><h3>交给专业人员复核的问题</h3><div id="aiReviewQuestions">尚无模型复核问题</div><p id="aiMeta" class="usb-caption"></p><details><summary>本次模型结果对应的固定输入窗口</summary><pre id="aiResultInput">尚无模型结果</pre></details></div>
      <p id="aiRule" class="session-note"></p>
      <p class="usb-caption">本次模型输入限于 A0 单路稀疏滤波摘要与上述固定事件；不含摄像头角度。无人工标注基线、压力或实际辅助力。不能推断疲劳、肌力、坡度、上下楼或临床效果。A5 是控制输出。人工主动结束只表示操作者标记，不推断结束原因。本次建议未应用到硬件，也不是此前固件响应的原因。模型文本仍需人工核对。</p>
      <details><summary>AI 分析历史（本页最近 100 次；完整会话保留记录期间的调用）</summary><div id="aiHistory" class="ai-history"></div></details>
    </section>`;
  }
  function refresh() {
    if (!document.getElementById('aiStatus')) return;
    const {summary, reason} = observer.window(), config = observer.config;
    const current = observer.current, result = current && !current.expired ? current.result : null;
    set('aiService', config?.configured ? `模型服务：${config.service} · 模型：${config.model} · ${config.adapter}` : '模型未配置：请队友按 README 在服务端填写 .env 并重启。');
    set('aiStatus', observer.message);
    set('aiMode', result ? (result.source === 'simulated' ? '真实模型 + 合成输入' : result.source === 'replay' ? '真实模型 + 回放输入' : '模型分析 · USB 输入') : observer.pending ? '分析中' : current?.expired ? '过期 · 历史保留' : '规则解释 / AI 未连接');
    set('aiInput', summary ? `待分析窗口：${source(summary.source)} · ${stamp(summary.windowStartMs)} 至 ${stamp(summary.windowEndMs)} · ${summary.sampleCount} 个新样本 · ${summary.sessionId ? '会话 ' + summary.sessionId : '未开始会话'} · 未采集人工基线` : `数据不足：${reason}`);
    const g = observer.gates;
    set('aiGates', `工程门槛（非医学标准）：最近 ${g.windowMs / 1000} 秒、至少 ${g.minSamples} 点且跨度 ${g.minSpanMs / 1000} 秒；样本/帧年龄 ≤ ${g.maxSampleAgeMs / 1000} 秒；调用间隔 ≥ ${g.minIntervalMs / 1000} 秒。`);
    set('aiSummary', summary ? JSON.stringify(summary, null, 2) : '暂无有效窗口');
    set('aiObservation', result?.observation || (current?.expired ? '之前结果已过期，请查看历史。' : '等待有效模型结果'));
    set('aiSuggestion', result ? SUGGESTIONS[result.suggestionCode] : '尚无当前模型建议');
    set('aiExplanation', result?.explanation || '');
    set('aiEvidence', result ? result.evidence.map(e => `${e.path} = ${JSON.stringify(e.value)}`).join('\n') : '暂无模型引用');
    const refs = document.getElementById('aiEventReferences'); refs.replaceChildren();
    for (const id of result?.eventReferences || []) {
      const event = current.input.events?.find(e => e.eventId === id);
      if (!event) continue;
      const button = document.createElement('button'); button.className = 'btn ghost'; button.type = 'button';
      button.dataset.aiEventId = id; button.dataset.aiSessionId = current.input.sessionId;
      button.textContent = `${eventLabels[event.type]} · ${stamp(event.capturedAt)} · 查看记录`;
      refs.append(button);
    }
    if (!refs.childNodes.length) refs.textContent = result ? '模型未引用人工事件。' : '暂无事件引用。';
    const questions = document.getElementById('aiReviewQuestions'); questions.replaceChildren();
    for (const question of result?.reviewQuestions || []) { const p = document.createElement('p'); p.textContent = question; questions.append(p); }
    if (!questions.childNodes.length) questions.textContent = result ? '本次模型未提供复核问题；可在专业端查看记录。' : '尚无模型复核问题。';
    set('aiMeta', result ? `${result.model} / model · 生成 ${stamp(result.generatedAt)} · ${result.latencyMs} ms · ${result.windowId} · 未应用到硬件` : '未应用到硬件');
    set('aiResultInput', current ? JSON.stringify(current.input, null, 2) : '尚无模型结果');
    set('aiRule', result ? '当前结果来自已返回并通过校验的模型调用；对应固定输入窗口，不随新采样自动更新。' : rule(summary));
    const consent = document.getElementById('aiConsent'); consent.checked = observer.consent; consent.disabled = !config?.configured;
    document.getElementById('analyzeAI').disabled = !summary || !config?.configured || !observer.consent || Boolean(observer.pending) || observer.now() - observer.lastCall < g.minIntervalMs;
    document.getElementById('reloadAI').disabled = Boolean(observer.pending);
    document.getElementById('exportAI').disabled = !observer.history.length;
    const signature = JSON.stringify(observer.history);
    const history = document.getElementById('aiHistory');
    if (historySignature !== signature || !history.dataset.ready) {
      history.replaceChildren();
      for (const entry of [...observer.history].reverse()) {
        const details = document.createElement('details'), title = document.createElement('summary'), pre = document.createElement('pre');
        title.textContent = `${stamp(entry.requestedAt)} · ${source(entry.input.source)} · ${entry.status} / ${entry.mode}`;
        pre.textContent = JSON.stringify(entry, null, 2); details.append(title, pre); history.append(details);
      }
      if (!observer.history.length) history.textContent = '暂无调用。';
      historySignature = signature; history.dataset.ready = '1';
    }
  }
  document.addEventListener('change', event => { if (event.target.id === 'aiConsent') observer.authorize(event.target.checked); });
  document.addEventListener('click', event => {
    const reference = event.target.closest('[data-ai-event-id]');
    if (reference) window.dispatchEvent(new CustomEvent('airflow:focus-event', {detail: {sessionId: reference.dataset.aiSessionId, eventId: reference.dataset.aiEventId}}));
    const id = event.target.closest('button')?.id;
    if (id === 'analyzeAI') observer.analyze();
    if (id === 'reloadAI') observer.loadStatus();
    if (id === 'exportAI') live.downloadBlob('AIRFLOW-ai-history.json', JSON.stringify(observer.history, null, 2), 'application/json');
  });
  window.AirflowAIView = {panel, refresh, observer};
  setInterval(() => observer.tick(), 250);
  observer.loadStatus();
})();

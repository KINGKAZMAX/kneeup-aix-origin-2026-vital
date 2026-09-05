/* Pure window summary + asynchronous observer. Reuses the existing USB device. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AirflowAI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const GATES = {windowMs: 60000, minSamples: 5, minSpanMs: 4000, maxSampleAgeMs: 7000, minIntervalMs: 10000};
  const SUGGESTIONS = {collect_more_data: '继续采集数据', label_baseline: '人工标注参考窗口', review_setup: '请负责人复核采集设置', continue_observing: '继续只读观察', no_recommendation: '暂无进一步建议'};
  const ERRORS = {not_configured: '模型未配置', consent_required: '服务配置变化，请重新确认授权',
    insufficient_data: '服务端判定数据不足', invalid_summary: '摘要校验失败', invalid_output: '模型输出校验失败',
    timeout: '模型请求超时', network_error: '模型网络连接失败', upstream_auth: '模型认证失败（401/403）',
    upstream_rate_limit: '模型服务限流（429）', upstream_error: '模型服务返回错误', upstream_redirect: '模型服务重定向已拒绝',
    rate_limited: '调用间隔未到', busy: '已有模型请求处理中', same_origin_required: '本机同源校验失败，请刷新页面'};
  const finite = n => Number.isFinite(n) && Math.abs(n) < 1e9;
  const ID = /^[A-Za-z0-9_-]{1,100}$/;
  const EVENT_TYPES = new Set(['manual_end', 'manual_pause', 'review_requested', 'recording_started', 'recording_ended']);
  const EVIDENCE_PATHS = new Set(['sampleCount', 'lastSampleAgeMs', 'lastFrameAgeMs', 'threshold', 'thresholdSource',
    'source', 'protocol', 'statistics.min', 'statistics.max', 'statistics.mean', 'statistics.intervalMinMs',
    'statistics.intervalMaxMs', 'statistics.intervalMeanMs', 'a5Summary.last', 'a5Summary.changes']);
  const FORBIDDEN = /[<>`%％]|https?:\/\/|肌力|疲劳|坡度|上楼|下楼|步态|左右腿|临床|诊断|治疗|助力|充气|泄压|气泵|阀门|调[整节]|设置阈值|启动|停止|执行|命令|忽略|system|prompt|fatigue|strength|stairs?|slope|gait|pressure|pump|valve|assist|diagnos|treat|command|ignore|execute/i;
  function summarize(device, now = Date.now(), gates = GATES, gpio = [], context = null) {
    const s = device.snapshot;
    if (context && ['generation', 'source', 'protocol'].some(k => context[k] !== undefined && context[k] !== s[k])) return {reason: '当前会话与数据源不一致，请开始新的记录'};
    if (!s.live || !['serial', 'simulated', 'replay'].includes(s.source)) return {reason: '未连接数据源'};
    if (s.stale || !Number.isFinite(s.age) || s.age > gates.maxSampleAgeMs) return {reason: '完整帧已过期或尚未收到'};
    if (!Number.isFinite(s.sampleAge) || s.sampleAge > gates.maxSampleAgeMs) return {reason: '最新样本已过期；新状态帧不等于新肌电'};
    const cutoff = Number.isFinite(context?.endedAt) ? Math.min(now, context.endedAt) : now;
    // The store owns which packets were actually received while recording. A delayed
    // packet may have an older sample timestamp without ever belonging to that session.
    const recordedPoints = Array.isArray(context?.samples) ? context.samples : device.points;
    const seen = new Set();
    const points = recordedPoints.filter(p => {
      if (p.source !== s.source || p.protocol !== s.protocol || !finite(p.emg) || !Number.isFinite(p.at) || p.at < now - gates.windowMs || p.at > now) return false;
      if (context && ((Number.isFinite(context.startedAt) && p.at < context.startedAt) || (Number.isFinite(context.endedAt) && p.at > context.endedAt))) return false;
      if (context && Number.isFinite(p.receivedAt) && p.receivedAt > cutoff) return false;
      if (s.protocol === 'telemetry') { if (!Number.isInteger(p.seq) || seen.has(p.seq)) return false; seen.add(p.seq); }
      return true;
    }).sort((a, b) => a.at - b.at);
    if (points.length < gates.minSamples) return {reason: `有效新样本不足：${points.length}/${gates.minSamples}`} ;
    const start = points[0].at, end = points.at(-1).at;
    if (end - start < gates.minSpanMs) return {reason: `窗口跨度不足 ${gates.minSpanMs / 1000} 秒`};
    if (now - end > gates.maxSampleAgeMs) return {reason: '窗口最后一个新样本已过期'};
    const values = points.map(p => p.emg), intervals = points.slice(1).map((p, i) => p.at - points[i].at);
    const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const telemetry = s.protocol === 'telemetry';
    const lastPoint = points.at(-1), reading = context ? lastPoint : s.last;
    if (telemetry && (!finite(reading?.threshold) || !['HIGH', 'LOW'].includes(reading?.a5))) return {reason: '遥测阈值或 A5 缺失'};
    const boundedGPIO = gpio.filter(e => Number.isFinite(e.at) && e.at >= start && e.at <= cutoff && ['HIGH', 'LOW'].includes(e.a5)).sort((a, b) => a.at - b.at);
    const lastPointReceivedAt = Number.isFinite(lastPoint.receivedAt) ? lastPoint.receivedAt : lastPoint.at;
    const lastRecordedGPIO = boundedGPIO.at(-1);
    const lastA5 = context && lastRecordedGPIO && lastRecordedGPIO.at >= lastPointReceivedAt ? lastRecordedGPIO.a5 : reading?.a5;
    const recordedFrameAt = Math.max(lastPointReceivedAt, lastRecordedGPIO?.at ?? lastPointReceivedAt);
    const summary = {requestId: '', generation: s.generation, source: s.source, protocol: s.protocol,
      windowId: `g${s.generation}-${s.source}-${start}-${end}-${points.length}`,
      windowStartMs: start, windowEndMs: end, sampleCount: points.length,
      lastSampleAgeMs: Math.max(0, s.sampleAge, now - end), lastFrameAgeMs: Math.max(0, context ? now - recordedFrameAt : s.age),
      statistics: {min: Math.min(...values), max: Math.max(...values), mean: mean(values),
        intervalMinMs: Math.min(...intervals), intervalMaxMs: Math.max(...intervals), intervalMeanMs: mean(intervals)},
      threshold: telemetry ? reading.threshold : 66, thresholdSource: telemetry ? 'firmware_reported' : 'source_reference',
      a5Summary: telemetry ? {last: lastA5, changes: boundedGPIO.length} : null,
      baseline: null};
    if (context) {
      if (typeof context.sessionId !== 'string' || !ID.test(context.sessionId)) return {reason: '会话标识无效'};
      summary.sessionId = context.sessionId;
      const ids = new Set();
      summary.events = (Array.isArray(context.events) ? context.events : []).filter(e => {
        if (!e || typeof e.eventId !== 'string' || !ID.test(e.eventId) || ids.has(e.eventId) || !EVENT_TYPES.has(e.type)
          || !Number.isSafeInteger(e.capturedAt) || e.capturedAt < start || e.capturedAt > cutoff) return false;
        ids.add(e.eventId); return true;
      }).slice(-20).map(e => ({eventId: e.eventId, type: e.type, capturedAt: e.capturedAt}));
    }
    return {summary};
  }
  function rule(summary) {
    if (!summary) return '等待有效窗口。';
    return `规则解释 / AI 未连接：${summary.sampleCount} 个新样本；滤波数值范围 ${summary.statistics.min.toFixed(2)}～${summary.statistics.max.toFixed(2)}，均值 ${summary.statistics.mean.toFixed(2)}。阈值 ${summary.threshold} 为${summary.thresholdSource === 'source_reference' ? '源码参考值，未回读' : '遥测上报值'}。没有人工标注基线。`;
  }
  function validResult(result, input) {
    if (!result || result.mode !== 'model' || result.appliedToHardware !== false || !SUGGESTIONS[result.suggestionCode]) return false;
    if (!['requestId', 'windowId', 'generation', 'source'].every(k => result[k] === input[k])) return false;
    if (result.sessionId !== input.sessionId) return false;
    if (!['observation', 'explanation', 'model', 'generatedAt'].every(k => typeof result[k] === 'string' && result[k].length > 0 && result[k].length <= 500)) return false;
    if (!Number.isFinite(Date.parse(result.generatedAt)) || !Number.isFinite(result.latencyMs) || result.latencyMs < 0) return false;
    if (!Array.isArray(result.limitations) || !result.limitations.length || !result.limitations.every(x => typeof x === 'string' && x.length <= 500)) return false;
    const references = result.eventReferences ?? [], questions = result.reviewQuestions ?? [];
    if (!Array.isArray(references) || references.length > 20 || new Set(references).size !== references.length
      || !references.every(id => (input.events || []).some(e => e.eventId === id))) return false;
    if (!Array.isArray(questions) || questions.length > 3 || !questions.every(q => typeof q === 'string' && q.trim().length > 0 && q.length <= 500 && !FORBIDDEN.test(q))) return false;
    if (!(Array.isArray(result.evidence) && result.evidence.length > 0 && result.evidence.length <= 8 && result.evidence.every(e => {
      if (!e || !EVIDENCE_PATHS.has(e.path)) return false;
      const value = e.path.split('.').reduce((v, k) => v && Object.hasOwn(v, k) ? v[k] : undefined, input);
      return value !== undefined && value !== null && ['number', 'string'].includes(typeof value) && value === e.value;
    }))) return false;
    const numbers = result.evidence.map(e => e.value).filter(v => typeof v === 'number');
    return [result.observation, result.explanation, ...questions].every(value => !FORBIDDEN.test(value)
      && (value.replace(/A[05]/g, '').match(/[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g) || []).every(token => numbers.some(n => Math.abs(Number(token) - n) <= .01)));
  }
  class Observer {
    constructor(device, {fetcher = (...args) => fetch(...args), now = () => Date.now(), onChange = () => {}, onRecord = () => {}, getSessionContext = () => null} = {}) {
      this.device = device; this.fetcher = fetcher; this.now = now; this.onChange = onChange; this.onRecord = onRecord;
      this.getSessionContext = getSessionContext;
      this.gates = {...GATES}; this.config = null; this.consent = false; this.current = null;
      this.history = []; this.pending = null; this.serial = 0; this.lastCall = -Infinity;
      this.message = '等待本机模型配置'; this.gpio = []; this.key = this.streamKey();
      this.sessionKey = this.getSessionContext()?.sessionId ?? null;
      device.addEventListener('ended', () => this.invalidate('数据源结束或重启', true));
      device.addEventListener('change', () => this.tick());
      device.addEventListener('gpio', e => { this.gpio.push({...e.detail}); this.gpio = this.gpio.filter(x => x.at >= this.now() - this.gates.windowMs); });
    }
    streamKey() { const s = this.device.snapshot; return `${s.generation}/${s.source}/${s.protocol}`; }
    window() { return summarize(this.device, this.now(), this.gates, this.gpio, this.getSessionContext()); }
    async loadStatus() {
      try {
        const response = await this.fetcher('/api/ai/status', {signal: AbortSignal.timeout(5000)});
        if (!response.ok) throw new Error();
        const config = await response.json();
        if (typeof config.configured !== 'boolean' || typeof config.csrfToken !== 'string' || !config.gates) throw new Error();
        if (this.config?.configId !== config.configId) this.invalidate('配置已更新，需确认服务与发送字段', true);
        this.config = config; this.gates = {...GATES, ...config.gates};
        this.message = config.configured ? (this.consent ? '已授权，仅手动点击时发送当前摘要' : '待授权：确认服务与摘要字段后可分析') : '模型未配置 · 规则解释 / AI 未连接';
      } catch (_) { this.config = null; this.invalidate('本机 AI 服务不可用 · USB 观察仍可使用', true); }
      this.onChange();
    }
    authorize(value) {
      this.consent = Boolean(value && this.config?.configured);
      if (!this.consent) this.invalidate('授权已撤销；已发送的摘要无法撤回', false);
      else this.message = '已授权，仅手动点击时发送当前摘要';
      this.onChange();
    }
    invalidate(reason, revoke = false) {
      if (revoke) this.consent = false;
      if (this.pending) {
        this.pending.controller.abort(); this.pending.entry.status = 'discarded';
        this.pending.entry.reason = reason; this.pending.entry.completedAt = this.now(); this.pending = null;
      }
      if (this.current) this.current.expired = true;
      this.serial++; this.message = reason; this.onChange();
    }
    tick() {
      const sessionKey = this.getSessionContext()?.sessionId ?? null;
      if (this.sessionKey !== sessionKey) {
        this.sessionKey = sessionKey; this.invalidate('记录会话已变化，旧结果仅保留在原会话历史');
      }
      if (this.key !== this.streamKey()) {
        this.key = this.streamKey(); this.gpio = []; this.invalidate('数据来源/协议已变化，请重新授权', true);
      }
      const input = this.pending?.entry.input || (this.current && !this.current.expired ? this.current.input : null);
      const s = this.device.snapshot;
      const stale = !s.live || s.stale || !Number.isFinite(s.sampleAge) || !Number.isFinite(s.age) || Math.max(s.sampleAge, s.age) > this.gates.maxSampleAgeMs;
      if (input && (stale || this.now() - input.windowEndMs > this.gates.windowMs)) this.invalidate('结果已过期：数据不新鲜或输入窗口超过有效期');
      this.onChange();
    }
    async analyze() {
      this.tick();
      const {summary, reason} = this.window();
      if (reason) { this.message = `数据不足：${reason}`; this.onChange(); return; }
      if (!this.config?.configured || !this.consent) { this.message = this.config?.configured ? '待授权' : '模型未配置 · 规则解释 / AI 未连接'; this.onChange(); return; }
      if (this.pending || this.now() - this.lastCall < this.gates.minIntervalMs) { this.message = '已有请求或调用间隔未到'; this.onChange(); return; }
      const token = ++this.serial, controller = new AbortController();
      summary.requestId = `r${this.now()}-${token}`;
      const entry = {input: summary, requestedAt: this.now(), status: 'pending', mode: 'unavailable',
        model: this.config.model, service: this.config.service, result: null};
      this.history.push(entry); if (this.history.length > 100) this.history.shift();
      this.onRecord(entry); this.lastCall = this.now();
      if (this.current) this.current.expired = true;
      this.pending = {controller, entry}; this.message = '分析中 · USB 曲线持续更新'; this.onChange();
      const timeout = setTimeout(() => controller.abort(), 25000);
      try {
        const response = await this.fetcher('/api/ai/analyze', {method: 'POST', signal: controller.signal,
          headers: {'Content-Type': 'application/json', 'X-Airflow-CSRF': this.config.csrfToken},
          body: JSON.stringify({consent: true, configId: this.config.configId, summary})});
        const result = await response.json();
        if (token !== this.serial) return;
        this.tick(); if (token !== this.serial) return;
        if (!response.ok) throw new Error(ERRORS[result.error] || '模型请求失败');
        if (!validResult(result, summary)) throw new Error('模型响应归属或结构校验失败');
        entry.status = 'success'; entry.mode = 'model'; entry.result = result; entry.completedAt = this.now();
        this.current = {input: summary, result, expired: false};
        this.message = summary.source === 'serial' ? '模型分析 · USB 串口输入' : summary.source === 'simulated' ? '真实模型 + 合成输入' : '真实模型 + 回放输入';
      } catch (error) {
        if (token !== this.serial) return;
        entry.status = 'failed'; entry.reason = error.name === 'AbortError' ? '请求超时/已中止' : error.message;
        entry.completedAt = this.now(); entry.mode = 'rule_fallback';
        entry.ruleExplanation = rule(summary);
        this.message = `${entry.reason} · 规则解释 / AI 未连接`;
      } finally {
        clearTimeout(timeout);
        if (token === this.serial) this.pending = null;
        this.onChange();
      }
    }
  }
  return {GATES, SUGGESTIONS, summarize, rule, validResult, Observer};
});

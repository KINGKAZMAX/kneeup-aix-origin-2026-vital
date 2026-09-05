// Synthetic inputs and mocked HTTP only. No model or physical USB used.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {summarize, Observer, rule} = require('../ai-observer.js');
let now = 100000;
class Device extends EventTarget {
  constructor(protocol = 'legacy') { super(); this.s = {generation: 1, source: 'simulated', protocol, live: true, stale: false, age: 0, sampleAge: 0, last: {threshold: 66, a5: 'HIGH'}};
    this.points = Array.from({length: 5}, (_, i) => ({at: now - 4000 + i * 1000, emg: i - 2, source: 'simulated', protocol, seq: i})); }
  get snapshot() { return this.s; }
}
const config = {configured: true, model: 'MOCK_NOT_REAL', service: 'http://localhost/mock', configId: 'test', csrfToken: 'test', gates: require('../ai-observer.js').GATES};
const response = (input, extra = {}) => ({requestId: input.requestId, windowId: input.windowId, generation: input.generation, source: input.source,
  mode: 'model', model: 'MOCK_NOT_REAL', generatedAt: new Date(now).toISOString(), latencyMs: 10, appliedToHardware: false,
  observation: '测试替身', explanation: '测试解释', suggestionCode: 'label_baseline', evidence: [{path: 'sampleCount', value: 5}], limitations: ['仅软件替身测试'], ...extra});
function setup() { const device = new Device(); let resolve, input;
  const observer = new Observer(device, {now: () => now, fetcher: async (_, options) => { input = JSON.parse(options.body).summary; return new Promise(r => resolve = r); }});
  observer.config = config; observer.authorize(true);
  return {device, observer, complete: extra => resolve({ok: true, json: async () => response(input, extra)})}; }

test('legacy summary preserves negative values, reference threshold and absent baseline/A5', () => {
  const s = summarize(new Device(), now).summary;
  assert.equal(s.statistics.min, -2); assert.equal(s.statistics.mean, 0); assert.equal(s.thresholdSource, 'source_reference'); assert.equal(s.a5Summary, null); assert.equal(s.baseline, null);
  assert.match(rule(s), /AI 未连接/);
});
test('telemetry duplicate seq, invalid and wrong-source points do not inflate summary', () => {
  const d = new Device('telemetry'); d.points.push({...d.points[0]}, {...d.points[1], seq: 88, emg: Infinity}, {...d.points[1], source: 'serial'});
  const s = summarize(d, now, undefined, [{at: now - 2000, a5: 'LOW'}]).summary;
  assert.equal(s.sampleCount, 5); assert.equal(s.a5Summary.changes, 1); assert.equal(s.thresholdSource, 'firmware_reported');
});
test('fresh status frame cannot freshen an old sample or cached point', () => {
  const d = new Device('telemetry'); d.s.sampleAge = 8000;
  assert.match(summarize(d, now).reason, /样本已过期/);
  d.s.sampleAge = 0; d.points.forEach(p => p.at -= 9000);
  assert.match(summarize(d, now).reason, /新样本已过期/);
});
test('insufficient count/span, no source and missing telemetry reject analysis', () => {
  const d = new Device(); d.points.pop(); assert.match(summarize(d, now).reason, /不足/);
  d.s.live = false; assert.match(summarize(d, now).reason, /未连接/);
  const t = new Device('telemetry'); t.s.last = {}; assert.match(summarize(t, now).reason, /缺失/);
});
test('without consent/config or sufficient data, no HTTP call', async () => {
  let count = 0; const o = new Observer(new Device(), {now: () => now, fetcher: () => count++});
  await o.analyze(); o.config = config; await o.analyze(); assert.equal(count, 0);
  o.authorize(true); o.device.points = []; await o.analyze(); assert.equal(count, 0);
});
test('valid mocked response binds exact window, source, history and mode', async () => {
  const t = setup(), promise = t.observer.analyze(); t.complete(); await promise;
  assert.equal(t.observer.history[0].status, 'success'); assert.equal(t.observer.current.input.source, 'simulated'); assert.match(t.observer.message, /合成输入/);
  assert.equal(t.observer.current.result.appliedToHardware, false);
});
for (const action of ['reconnect', 'source', 'protocol', 'ended', 'revoke', 'stale']) test(`late mock response is discarded after ${action}`, async () => {
  const t = setup(), promise = t.observer.analyze();
  if (action === 'reconnect') t.device.s.generation++;
  if (action === 'source') t.device.s.source = 'serial';
  if (action === 'protocol') t.device.s.protocol = 'telemetry';
  if (action === 'ended') t.device.dispatchEvent(new Event('ended'));
  if (action === 'revoke') t.observer.authorize(false);
  if (action === 'stale') t.device.s.sampleAge = 8000;
  t.observer.tick(); t.complete(); await promise;
  assert.equal(t.observer.current, null); assert.equal(t.observer.history[0].status, 'discarded');
});
test('wrong binding, unknown suggestion, wrong evidence or mode cannot be accepted', async () => {
  for (const extra of [{generation: 99}, {suggestionCode: 'pump_on'}, {mode: 'rule_fallback'}, {evidence: [{path: 'statistics.mean', value: 888}]}]) {
    const t = setup(), promise = t.observer.analyze(); t.complete(extra); await promise;
    assert.equal(t.observer.current, null); assert.equal(t.observer.history[0].mode, 'rule_fallback');
  }
});
test('network failure creates explicit rule history; concurrent clicks send once', async () => {
  const t = setup(), p = t.observer.analyze(); await t.observer.analyze(); assert.equal(t.observer.history.length, 1); t.complete(); await p;
  const o = new Observer(new Device(), {now: () => now, fetcher: async () => { throw new Error('offline'); }});
  o.config = config; o.authorize(true); await o.analyze(); assert.equal(o.history[0].mode, 'rule_fallback'); assert.match(o.message, /AI 未连接/);
});
test('a successful window expires even if fresh samples continue', async () => {
  const t = setup(), p = t.observer.analyze(); t.complete(); await p;
  now += 61000; t.device.points = new Device().points; t.observer.tick();
  assert.equal(t.observer.current.expired, true); now -= 61000;
});

test('session context clips pre-session samples and excludes private or unrelated events', () => {
  const device = new Device();
  const context = {sessionId: 'session-1', startedAt: now - 4000, person: 'PRIVATE', events: [
    {eventId: 'e-end', type: 'manual_end', capturedAt: now, text: 'PRIVATE'},
    {eventId: 'e-camera', type: 'camera_observation', capturedAt: now, text: 'PRIVATE'},
    {eventId: 'e-old', type: 'manual_pause', capturedAt: now - 90000}]};
  const observer = new Observer(device, {now: () => now, getSessionContext: () => context});
  const summary = observer.window().summary;
  assert.equal(summary.sessionId, 'session-1');
  assert.deepEqual(summary.events, [{eventId: 'e-end', type: 'manual_end', capturedAt: now}]);
  assert.ok(!JSON.stringify(summary).includes('PRIVATE'));
  context.startedAt = now - 1000;
  assert.match(observer.window().reason, /不足/);
});

test('late response cannot move from an ended session into a new session', async () => {
  const device = new Device(); let context = {sessionId: 'session-1', startedAt: now - 4000, events: []}, resolve, input;
  const observer = new Observer(device, {now: () => now, getSessionContext: () => context,
    fetcher: async (_, options) => { input = JSON.parse(options.body).summary; return new Promise(r => resolve = r); }});
  observer.config = config; observer.authorize(true);
  const pending = observer.analyze();
  context = {sessionId: 'session-2', startedAt: now, events: []}; observer.tick();
  resolve({ok: true, json: async () => response(input, {sessionId: 'session-1'})}); await pending;
  assert.equal(observer.current, null); assert.equal(observer.history[0].status, 'discarded');
  assert.equal(observer.history[0].input.sessionId, 'session-1');
});

test('session identity and event references must be exact and questions contain no commands', () => {
  const {validResult} = require('../ai-observer.js');
  const input = {...summarize(new Device(), now).summary, sessionId: 's1', events: [{eventId: 'e1', type: 'manual_end', capturedAt: now}]};
  const valid = response(input, {sessionId: 's1', eventReferences: ['e1'], reviewQuestions: ['本次记录是否完整？']});
  assert.equal(validResult(valid, input), true);
  for (const extra of [{sessionId: 's2'}, {eventReferences: ['missing']}, {reviewQuestions: ['启动气泵']}, {reviewQuestions: ['<script>bad</script>']}]) {
    assert.equal(validResult({...valid, ...extra}, input), false);
  }
});

test('a selected session from another generation or source cannot claim the current stream', () => {
  const device = new Device();
  for (const changed of [{generation: 0}, {source: 'serial'}, {protocol: 'telemetry'}]) {
    const observer = new Observer(device, {now: () => now, getSessionContext: () => ({sessionId: 's1', startedAt: now - 4000,
      source: 'simulated', generation: 1, protocol: 'legacy', ...changed})});
    assert.match(observer.window().reason, /会话.*数据源/);
  }
});

test('finished session excludes future points and has a short analysis-start lifetime', () => {
  const device = new Device();
  const context = {sessionId: 's1', startedAt: now - 4000, endedAt: now, events: []};
  let clock = now;
  const observer = new Observer(device, {now: () => clock, getSessionContext: () => context});
  device.points.push({...device.points.at(-1), at: now + 1000, emg: 999}); clock += 1000;
  assert.equal(observer.window().summary.statistics.max, 2);
  clock += 7000;
  assert.match(observer.window().reason, /过期/);
});

test('client rejects uncited question numbers and non-allowlisted evidence paths', () => {
  const {validResult} = require('../ai-observer.js'); const input = summarize(new Device(), now).summary;
  assert.equal(validResult(response(input, {reviewQuestions: ['记录包含 999 次吗？']}), input), false);
  assert.equal(validResult(response(input, {evidence: [{path: 'windowId', value: input.windowId}]}), input), false);
});

test('finished telemetry session excludes later threshold, A5 and GPIO state', () => {
  const device = new Device('telemetry');
  device.points = Array.from({length:5}, (_, i) => ({at:1000+i*1000, receivedAt:1000+i*1000, emg:20,
    source:'simulated', protocol:'telemetry', seq:i, threshold:66, a5:'HIGH'}));
  device.s.last = {threshold:99, a5:'LOW'};
  const context = {sessionId:'s-frozen', startedAt:1000, endedAt:5500};
  const result = summarize(device, 7000, undefined, [{at:6500, a5:'LOW'}], context).summary;
  assert.equal(result.sampleCount,5); assert.equal(result.statistics.mean,20);
  assert.equal(result.threshold,66); assert.deepEqual(result.a5Summary,{last:'HIGH',changes:0});
  assert.equal(result.lastFrameAgeMs,2000);
});

test('finished session uses its recorded points and only GPIO received within the record', () => {
  const device = new Device('telemetry');
  const samples = Array.from({length:5}, (_, i) => ({at:1000+i*1000, receivedAt:1000+i*1000, emg:20,
    source:'simulated', protocol:'telemetry', seq:i, threshold:66, a5:'HIGH'}));
  device.points = [...samples, {...samples.at(-1), at:5200, receivedAt:6000, seq:99, emg:999, threshold:99, a5:'LOW'}];
  device.s.last = {threshold:99, a5:'HIGH'};
  const context = {sessionId:'s-frozen', startedAt:1000, endedAt:5500, samples};
  const gpio = [{at:5200,a5:'LOW'}, {at:6500,a5:'HIGH'}];
  const result = summarize(device, 7000, undefined, gpio, context).summary;
  assert.equal(result.sampleCount,5); assert.equal(result.threshold,66);
  assert.deepEqual(result.a5Summary,{last:'LOW',changes:1});
  assert.equal(result.lastFrameAgeMs,1800);
});

test('session missing recorded telemetry metadata cannot use future snapshot as evidence', () => {
  const device = new Device('telemetry');
  const context = {sessionId:'s-missing', startedAt:now-4000, endedAt:now};
  assert.match(summarize(device,now,undefined,[],context).reason,/遥测阈值或 A5 缺失/);
});

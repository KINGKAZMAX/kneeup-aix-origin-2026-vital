// Synthetic software fixtures. These tests do not exercise physical sensors or a model.
const {test} = require('node:test');
const assert = require('node:assert/strict');
let SessionStore;
try { ({SessionStore} = require('../session-store.js')); } catch (_) {}
const snapshot = (extra = {}) => ({source:'simulated', generation:1, protocol:'telemetry', ...extra});
const sample = (extra = {}) => ({source:'simulated', protocol:'telemetry', at:1100, receivedAt:1100, seq:1, emg:12, raw:null, a5:null, ...extra});
function setup() { assert.equal(typeof SessionStore, 'function', 'the shared session store is available'); let time=1000; return {store:new SessionStore({now:()=>time}), tick:ms=>time+=ms}; }
test('all views read the same record and review is an explicit revision-bound action', () => {
  const {store,tick}=setup(); const record=store.start(snapshot());
  assert.equal(store.current,record); assert.equal(store.active,record); assert.equal(record.review.status,'pending');
  store.addSample(sample(),1); tick(1000); store.finish('手动结束');
  assert.equal(store.review(record.id,'reviewed','同一份记录已查看'),true);
  assert.equal(store.get(record.id).review.status,'reviewed'); assert.equal(store.current.review.note,'同一份记录已查看');
  assert.equal(store.review(record.id,'auto_approved'),false);
});
test('same-millisecond sessions have unique IDs and source changes cannot enter an old record', () => {
  const {store}=setup(); const one=store.start(snapshot()); store.addSample(sample(),1); store.finish();
  const two=store.start(snapshot({source:'serial',generation:2}));
  assert.notEqual(one.id,two.id); assert.equal(store.addSample(sample(),1),false); assert.equal(two.samples.length,0);
  assert.equal(store.addSample(sample({source:'serial',seq:2}),2),true); assert.equal(one.samples.length,1);
});
test('duplicate telemetry sequence does not inflate samples while a source cannot be relabelled', () => {
  const {store}=setup(); const record=store.start(snapshot());
  assert.equal(store.addSample(sample(),1),true); assert.equal(store.addSample(sample({receivedAt:1200}),1),false);
  assert.equal(store.addSample(sample({source:'serial',seq:2}),1),false); assert.equal(store.addSample(sample({seq:3,emg:NaN}),1),false);
  assert.equal(record.samples.length,1); assert.equal(record.samples[0].source,'simulated'); assert.equal(record.samples[0].raw,null);
});
test('camera/replay observations preserve their independent source, absent angle and capture time', () => {
  const {store}=setup(); const record=store.start(snapshot());
  assert.equal(store.addCamera({source:'camera',capturedAt:1100,angleDeg:42,validity:'valid'}),true);
  assert.equal(store.addCamera({source:'replay',capturedAt:1200,angleDeg:null,validity:'unavailable',mediaTime:5}),true);
  assert.equal(store.addCamera({source:'camera',capturedAt:999,angleDeg:35,validity:'valid'}),false);
  assert.equal(store.addCamera({source:'serial',capturedAt:1300,angleDeg:50,validity:'valid'}),false);
  assert.equal(record.cameraObservations[1].angleDeg,null); assert.equal(record.cameraObservations[1].source,'replay');
  assert.deepEqual(record.sources,['simulated','camera','replay']); assert.equal(record.samples.length,0);
});
test('manual ending is operator supplied and exports do not invent physical feedback', () => {
  const {store,tick}=setup(); const record=store.start(snapshot()); tick(1000);
  store.addManualEvent('manual_end'); store.finish('主动结束（人工标注）');
  const exported=store.export(record.id);
  assert.equal(exported.events.find(e=>e.type==='manual_end').source,'manual');
  assert.equal(exported.physicalFeedback.pressure,null); assert.equal(exported.physicalFeedback.assistance,null);
  assert.equal(exported.events.filter(e=>e.type==='manual_end').length,1);
  assert.equal(store.addCamera({source:'camera',capturedAt:2100,angleDeg:5,validity:'valid'}),false);
});
test('late AI entries attach only to exact original session and history is never a sample', () => {
  const {store}=setup(); const one=store.start(snapshot()); store.finish(); const two=store.start(snapshot());
  const entry={input:{sessionId:one.id,generation:1,source:'simulated',requestId:'r1'},status:'discarded',mode:'unavailable'};
  assert.equal(store.attachAI(entry),true); assert.equal(store.attachAI({...entry,status:'discarded'}),true);
  assert.equal(store.attachAI({input:{generation:1,source:'simulated',requestId:'missing'}}),false);
  assert.equal(one.aiHistory.length,1); assert.equal(two.aiHistory.length,0); assert.equal(one.samples.length,0);
  assert.equal(store.attachAI({...entry,input:{...entry.input,source:'serial'}}),false);
});
test('ended sessions can be selected and reviewed while a new capture keeps its own identity', () => {
  const {store}=setup(); const one=store.start(snapshot()); store.finish(); const two=store.start(snapshot());
  store.select(one.id); assert.equal(store.current,one); assert.equal(store.active,two);
  store.review(one.id,'needs_more','补充来源说明'); assert.equal(two.review.status,'pending');
  assert.equal(store.get(one.id).review.status,'needs_more');
});
test('new evidence after a review is visible as requiring a fresh review', () => {
  const {store}=setup(); const record=store.start(snapshot()); store.addSample(sample(),1);
  store.review(record.id,'reviewed'); assert.equal(store.needsReview(record),false);
  store.addSample(sample({seq:2,at:1200,receivedAt:1200}),1); assert.equal(store.needsReview(record),true);
});
test('legacy records keep separate serial lines received in the same millisecond', () => {
  const {store}=setup(); const r=store.start(snapshot({protocol:'legacy'}));
  assert.equal(store.addSample(sample({protocol:'legacy',seq:null}),1),true);
  assert.equal(store.addSample(sample({protocol:'legacy',seq:null,emg:14}),1),true);
  assert.equal(r.samples.length,2);
});
test('camera export preserves verified side and fixed angle semantics and distinguishes side changes', () => {
  const {store}=setup(); const r=store.start(snapshot());
  store.addCamera({source:'camera',capturedAt:1100,angleDeg:42,validity:'valid',side:'left',measurement:'projected_2d_flexion',unit:'degree'});
  store.addCamera({source:'camera',capturedAt:1100,angleDeg:35,validity:'valid',side:'right',measurement:'projected_2d_flexion',unit:'degree'});
  store.addCamera({source:'replay',capturedAt:1200,angleDeg:null,validity:'unavailable',side:'unsupported'});
  const data=store.export(r.id);
  assert.equal(data.cameraObservations.length,3);
  assert.deepEqual(data.cameraObservations.map(o=>o.side),['left','right','unknown']);
  assert.ok(data.cameraObservations.every(o=>o.measurement==='projected_2d_flexion'&&o.unit==='degree'));
  const events=data.events.filter(e=>e.type==='camera_observation');
  assert.match(events[0].text,/左侧/);assert.match(events[1].text,/右侧/);assert.match(events[2].text,/侧别未知/);
  assert.equal(events[1].side,'right');
});
test('camera input with conflicting units or measurement meaning is rejected instead of relabelled', () => {
  const {store}=setup(); const r=store.start(snapshot());
  assert.equal(store.addCamera({source:'camera',capturedAt:1100,angleDeg:1.2,validity:'valid',side:'left',unit:'radian'}),false);
  assert.equal(store.addCamera({source:'camera',capturedAt:1200,angleDeg:35,validity:'valid',side:'left',measurement:'3d_angle'}),false);
  assert.equal(r.cameraObservations.length,0);
});

// Browser-independent integration of the actual serial device, session store and live bridge.
// The transport is synthetic; no serial port, webcam or AI provider is used.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
class DetailEvent extends Event { constructor(name,{detail}={}){super(name);this.detail=detail;} }
function setup(){
  let now=100000;
  class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  const window=new EventTarget(), document=new EventTarget();
  const nodes=new Map(['emgValue','gpioValue','chartOverlay'].map(id=>[id,{textContent:'',dataset:{}}]));
  document.getElementById=id=>nodes.get(id)||null;
  window.document=document;window.isSecureContext=true;window.confirm=()=>true;
  const context=vm.createContext({window,document,navigator:{},localStorage:{getItem:()=>null,setItem:()=>{}},
    globalThis:window,Date:Clock,CustomEvent:DetailEvent,Event,EventTarget,setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>1,
    TextDecoder,Blob,URL,console});
  for(const file of ['serial-protocol.js','serial-device.js','session-store.js','live-ui.js'])
    vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),context,{filename:file});
  const device=window.AirflowLive.device;
  device.source='simulated';device.connection='demo';device.generation=1;
  const packet=(seq,emg=20)=>({kind:'telemetry',seq,emg,raw:500,threshold:66,a5:'HIGH',t_ms:seq*1000,sample_ms:seq*1000,sampleAge:0});
  return {window,document,nodes,device,store:window.AirflowSessions,live:window.AirflowLive,
    packet,tick:ms=>{now+=ms;},click:id=>document.dispatchEvent(new DetailEvent('click',{detail:null})),
    button:id=>{const e=new Event('click');Object.defineProperty(e,'target',{value:{closest:()=>({id})}});document.dispatchEvent(e);}};
}
test('real bridge creates one session, receives deduplicated synthetic input and independent camera source',()=>{
  const t=setup();t.device.ingest(t.packet(1));t.live.startRecord();t.tick(1000);
  t.device.ingest(t.packet(2));t.device.ingest(t.packet(2));
  t.window.dispatchEvent(new DetailEvent('airflow:camera-observation',{detail:{source:'replay',capturedAt:101000,angleDeg:45,validity:'valid',mediaTime:1}}));
  assert.equal(t.store.active.samples.length,1);assert.equal(t.store.active.cameraObservations.length,1);
  assert.equal(t.store.active.cameraObservations[0].source,'replay');assert.equal(t.store.active.samples[0].source,'simulated');
});
test('source disconnection ends only the web record and hides cached live values',()=>{
  const t=setup();t.device.ingest(t.packet(1));t.live.startRecord();t.tick(1000);t.device.ingest(t.packet(2));
  assert.equal(t.nodes.get('emgValue').textContent,'20.00');t.device.stopDemo();
  assert.equal(t.store.active,null);assert.equal(t.store.current.reason,'合成演示结束');
  assert.equal(t.nodes.get('emgValue').textContent,'—');assert.equal(t.nodes.get('gpioValue').textContent,'—');
  assert.equal(t.store.current.samples.length,1);
});
test('fresh status frames containing an old sample do not remain live or keep recording',()=>{
  const t=setup();t.device.ingest(t.packet(1));t.live.startRecord();t.tick(8000);
  t.device.ingest({...t.packet(1),sampleAge:8000,t_ms:9000,sample_ms:1000});
  assert.equal(t.store.active,null);assert.match(t.store.current.reason,/7 秒/);
  assert.equal(t.nodes.get('emgValue').textContent,'—');
  assert.match(t.nodes.get('chartOverlay').textContent,/数据已过期/);
});
test('manual ending button creates an explicitly manual event and profession can review exact export',()=>{
  const t=setup();t.device.ingest(t.packet(1));t.live.startRecord();t.tick(1000);t.device.ingest(t.packet(2));
  t.button('markManualEnd');const r=t.store.current;
  assert.equal(t.store.active,null);assert.equal(r.events.find(e=>e.type==='manual_end').source,'manual');
  t.store.review(r.id,'reviewed','仅软件流程');const data=t.store.export();
  assert.equal(data.review.status,'reviewed');assert.equal(data.samples[0].source,'simulated');assert.equal(data.physicalFeedback.pressure,null);
  t.live.startRecord();t.tick(1000);t.device.ingest(t.packet(3));
  assert.notEqual(t.store.active.id,r.id);assert.equal(t.store.active.review.status,'pending');assert.equal(r.samples.length,1);
});

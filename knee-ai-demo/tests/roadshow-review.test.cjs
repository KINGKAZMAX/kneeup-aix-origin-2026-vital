// DOM adapter test of actual review UI logic; no browser, network or physiology is involved.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {SessionStore}=require('../session-store.js');
function setup(){
  const store=new SessionStore({now:()=>1000});
  const one=store.start({source:'simulated',generation:1,protocol:'legacy'});store.finish();
  const two=store.start({source:'simulated',generation:1,protocol:'legacy'});store.finish();
  store.review(two.id,'reviewed','第二份已保存备注');store.select(one.id);
  const nodes=new Map(['sharedSession','sharedEmpty','sharedContent','selectSharedSession','professionalNote','sharedTimeline'].map(id=>[id,{id,dataset:{},value:'',textContent:'',innerHTML:'',hidden:false}]));
  const document=new EventTarget();document.getElementById=id=>nodes.get(id)||null;
  const window=new EventTarget();window.AirflowSessions=store;
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..','roadshow-ui.js'),'utf8'),vm.createContext({window,document,Date,JSON,setTimeout:()=>1}));
  const emit=(type,target)=>{const e=new Event(type);Object.defineProperty(e,'target',{value:target});document.dispatchEvent(e);};
  const edit=value=>{const node=nodes.get('professionalNote');node.value=value;emit('input',node);};
  window.AirflowRoadshow.refresh();
  return {store,one,two,window,document,nodes,edit,emit};
}
test('switching sessions isolates review drafts and never overwrites an in-progress note on refresh',()=>{
  const t=setup(),note=t.nodes.get('professionalNote');
  t.edit('第一份未提交草稿');t.window.AirflowRoadshow.refresh();assert.equal(note.value,'第一份未提交草稿');
  t.store.select(t.two.id);assert.equal(note.value,'第二份已保存备注');
  t.edit('第二份待补充草稿');t.store.select(t.one.id);assert.equal(note.value,'第一份未提交草稿');
  t.store.select(t.two.id);assert.equal(note.value,'第二份待补充草稿');
});
test('review action saves only the selected session draft and a remount restores that draft',()=>{
  const t=setup();t.edit('仅第一份草稿');t.store.select(t.two.id);t.edit('仅第二份草稿');
  t.nodes.set('professionalNote',{id:'professionalNote',dataset:{},value:''});t.window.AirflowRoadshow.refresh();
  assert.equal(t.nodes.get('professionalNote').value,'仅第二份草稿');
  t.emit('click',{closest:()=>({id:'reviewSharedSession',dataset:{}})});
  assert.equal(t.two.review.note,'仅第二份草稿');assert.equal(t.one.review.note,'');
  t.store.select(t.one.id);assert.equal(t.nodes.get('professionalNote').value,'仅第一份草稿');
});
test('professional review controls precede evidence while older events stay available without altering export',()=>{
  const t=setup();for(let i=0;i<12;i++)t.store.event(t.one,'manual_pause','manual',1100+i,'人工暂停');
  const page=t.window.AirflowRoadshow.professional();
  assert.ok(page.indexOf('id="reviewSharedSession"')<page.indexOf('id="sharedTimeline"'));
  const html=t.nodes.get('sharedTimeline').innerHTML;
  const visible=html.split('<details')[0];
  assert.equal((visible.match(/data-event-id=/g)||[]).length,8);
  assert.match(html,/<details[^>]*id="sharedOlderEvents"/);
  assert.equal((html.match(/data-event-id=/g)||[]).length,t.one.events.length);
  assert.equal(t.store.export(t.one.id).events.length,14);
});
test('AI reference navigation expands a hidden older event before focusing it',()=>{
  const t=setup(),older={open:false};let focused=false;
  const node={dataset:{eventId:t.one.events[0].eventId},closest:()=>older,scrollIntoView:()=>assert.equal(older.open,true),focus:()=>focused=true,classList:{add:()=>{},remove:()=>{}}};
  t.document.querySelectorAll=()=>[node];
  const e=new Event('airflow:focus-event');e.detail={sessionId:t.one.id,eventId:t.one.events[0].eventId};
  t.window.dispatchEvent(e);assert.equal(older.open,true);assert.equal(focused,true);
});

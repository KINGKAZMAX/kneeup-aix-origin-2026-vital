const test = require('node:test');
const assert = require('node:assert/strict');
const {parseLine, LineFramer} = require('../serial-protocol.js');
const base = {v:1,type:'telemetry',t_ms:6000,sample_ms:1000,seq:1,raw:512,emg:67.25,threshold:66,a5:'LOW',phase:'rest'};
test('original firmware: signed floating numbers, CRLF, no units inferred', () => {
  for (const line of ['12.34\r', '-2.6', '+1', '1.2e2']) assert.equal(parseLine(line).kind, 'legacy');
  assert.deepEqual(parseLine(' -2.6\r'), {kind:'legacy',emg:-2.6});
});
test('rejects NaN, Infinity, trailing junk, percent, JSON in place of a number', () => {
  for (const line of ['NaN','Infinity','12x','12%','0x10','','\n','[]','{}','<script>alert(1)</script>','1e999','"42"']) assert.equal(parseLine(line), null);
});
test('valid telemetry preserves LOW during a five-second-old sample', () => {
  const p = parseLine(JSON.stringify(base));
  assert.equal(p.a5,'LOW'); assert.equal(p.sampleAge,5000); assert.equal(p.raw,512);
});
test('invalid v1 JSON fields are rejected rather than interpreted', () => {
  for (const patch of [{v:2},{raw:1024},{raw:-1},{raw:1.1},{a5:'ON'},{emg:'42'},{seq:-1},{threshold:null},{phase:'inflating'},{sample_ms:6200},{t_ms:-1}]) assert.equal(parseLine(JSON.stringify({...base,...patch})), null);
});
test('explicit firmware boot marker', () => {
  assert.equal(parseLine('{"v":1,"type":"boot","fw":"airflow-observer-v1"}').kind,'boot');
  assert.equal(parseLine('{"v":1,"type":"boot","fw":"arbitrary"}'), null);
});
test('millis rollover age is unsigned', () => {
  const p=parseLine(JSON.stringify({...base,t_ms:20,sample_ms:4294967290}));
  assert.equal(p.sampleAge,26);
});
test('serial chunk splitting and CRLF across read boundaries', () => {
  const f=new LineFramer();
  assert.deepEqual(f.push('12.'),[]);
  assert.deepEqual(f.push('34\r'),[]);
  assert.deepEqual(f.push('\n-2.6\n99'),['12.34','-2.6']);
  assert.deepEqual(f.push('\n'),['99']);
});
test('oversized lines are dropped until newline and parser recovers', () => {
  const f=new LineFramer(8);
  assert.deepEqual(f.push('X'.repeat(99)),[]);
  assert.deepEqual(f.push('more\n12.2\n'),['12.2']);
  assert.equal(parseLine('1'.repeat(1025)),null);
});
test('UTF8 input is not treated as data', () => assert.equal(parseLine('启动中'),null));

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const file = require('node:path').join(__dirname, '../camera-observer.js');
function api() {
  const context = {window: {}, console};
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context);
  return context.window.AirflowCamera;
}
function points(hip, knee, ankle) {
  const p = Array.from({length: 33}, () => null);
  [23,25,27].forEach((i,j) => p[i] = {...[hip,knee,ankle][j], visibility: .9});
  return p;
}
test('straight leg is zero flexion, a right angle is 90 degrees', () => {
  const a = api();
  assert.equal(a.projectedFlexion(points({x:.5,y:.1},{x:.5,y:.5},{x:.5,y:.9}), 1600, 900, 'left'), 0);
  assert.equal(a.projectedFlexion(points({x:.5,y:.1},{x:.5,y:.5},{x:.9,y:.5}), 1600, 900, 'left'), 90);
});
test('uses pixel aspect ratio rather than distorted normalized angles', () => {
  const p=points({x:0,y:0},{x:.5,y:.5},{x:1,y:0});
  assert.ok(Math.abs(api().projectedFlexion(p, 1600, 900, 'left') - 58.7155070856) < .00001);
});
test('missing, occluded, nonfinite or degenerate landmarks remain null', () => {
  const a=api(),p=points({x:.5,y:.1},{x:.5,y:.5},{x:.5,y:.9});
  p[27].visibility=.1;
  assert.equal(a.projectedFlexion(p,1280,720,'left'),null);
  p[27].visibility=.9;p[27].x=NaN;
  assert.equal(a.projectedFlexion(p,1280,720,'left'),null);
  assert.equal(a.projectedFlexion([],1280,720,'left'),null);
  assert.equal(a.projectedFlexion(points({x:.5,y:.5},{x:.5,y:.5},{x:.5,y:.5}),1280,720,'left'),null);
});

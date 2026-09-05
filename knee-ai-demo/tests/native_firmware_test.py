"""Compare C++ logic under Arduino STUBS. Does NOT validate AVR timing or hardware."""
import json, subprocess, tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
native=root/'tests/native'
files=[root/'firmware/original/ZY_Knee_sketch.ino',root/'firmware/AIR_FLOW_Telemetry/AIR_FLOW_Telemetry.ino']
runs=[]
with tempfile.TemporaryDirectory() as d:
  for i,f in enumerate(files):
    exe=Path(d)/f'run{i}'
    subprocess.run(['g++','-std=c++11','-Wall','-Wextra','-I',str(native),f'-DTEST_SKETCH="{f}"',str(native/'runner.cpp'),'-o',str(exe)],check=True,capture_output=True)
    runs.append(subprocess.run([str(exe)],check=True,capture_output=True,text=True))
assert runs[0].stderr==runs[1].stderr, 'Logical GPIO/delay trace differs'
text0,text1=(f.read_text() for f in files)
assert text0[text0.index('float Filter(float input)\n'):]==text1[text1.index('float Filter(float input)\n'):], 'Filter coefficients changed'
packets=[json.loads(line) for line in runs[1].stdout.splitlines()]
telemetry=[p for p in packets if p['type']=='telemetry']
assert any(p['a5']=='LOW' for p in telemetry), 'Fixture failed to exercise LOW path'
assert any(p['a5']=='HIGH' for p in telemetry), 'Fixture failed to exercise HIGH path'
assert any(p['a5']=='LOW' and p['phase']=='rest' and p['t_ms']-p['sample_ms']>=4000 for p in telemetry), 'LOW was not observed through rest phase'
assert all(0<=p['raw']<=1023 for p in telemetry)
seqs={p['seq'] for p in telemetry}
assert len(telemetry)>len(seqs), 'Control-only frames not exercised'
out=root/'docs/test-output'
out.mkdir(parents=True,exist_ok=True)
(out/'firmware-native-telemetry.ndjson').write_text(runs[1].stdout)
report={'scope':'Host g++ with mocked Arduino functions, delay, serial and ADC. NOT an AVR/Arduino-core build or physical test.',
'checks':['C++ syntax under host stubs','70 loop logical GPIO/delay traces match original excluding documented setup difference','Filter() text is unchanged','Both HIGH and LOW paths observed','LOW retained through original rest delay','Control-only packets retain sample sequence'],
'loops':70,'telemetry_frames':len(telemetry),'unique_samples':len(seqs),'passed':6}
(out/'firmware-native-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))

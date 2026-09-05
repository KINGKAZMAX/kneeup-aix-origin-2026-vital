"""Real local HTTP round trip with MOCK upstream and SYNTHETIC demo. No real AI/USB."""
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from serve import make_server
from ai_backend import AIService
from ai_fixtures import model_output
OUT=ROOT/'docs/test-output'
OUT.mkdir(exist_ok=True,parents=True)
mode={'value':'success','calls':0,'inputs':[]}
release=threading.Event()


class Upstream(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def do_POST(self):
        payload=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        data=json.loads(payload['messages'][1]['content'])
        mode['calls']+=1; mode['inputs'].append(data)
        state=mode['value']
        if state=='delayed': release.wait(5)
        output=model_output(data)
        output.update(eventReferences=[e['eventId'] for e in data.get('events',[])][-1:], reviewQuestions=['本次记录是否完整？'])
        if state=='invalid': output['suggestionCode']='pump_on'
        if state=='html': output['observation']='<img src=x onerror=alert(1)>'
        raw=json.dumps({'choices':[{'finish_reason':'stop','message':{'content':json.dumps(output)}}]}).encode()
        self.send_response(401 if state=='auth' else 200); self.send_header('Content-Type','application/json'); self.end_headers()
        self.wfile.write(raw)


upstream=ThreadingHTTPServer(('127.0.0.1',0),Upstream)
threading.Thread(target=upstream.serve_forever,daemon=True).start()
ai=AIService(dict(ADAPTER='chat_completions',BASE_URL=f'http://127.0.0.1:{upstream.server_port}/v1',MODEL='MOCK_NOT_REAL',AUTH_MODE='local_no_auth'))
# Tests shorten cooldown only; data gates match production.
ai.gates['minIntervalMs']=0
server=make_server(0,ai)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://localhost:{server.server_port}/?view=hardware'
checks=[]; errors=[]
def check(name,ok=True):
    assert ok,name
    checks.append(name); print('PASS',name,flush=True)

def wait(expression):
    deadline=time.monotonic()+8
    while time.monotonic()<deadline:
        if page.evaluate(expression): return
        page.wait_for_timeout(50)
    raise AssertionError('Timed out: '+expression+'; '+page.locator('#aiStatus').inner_text())


try:
  with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1100},accept_downloads=True)
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(url,wait_until='networkidle')
    check('AI card preserves original EMG, firmware rule and A5 cards',all(page.locator('#'+id).count()==1 for id in ['aiStatus','emgValue','flowDecide','gpioValue']))
    check('No data or consent means no model request',page.locator('#analyzeAI').is_disabled() and not page.locator('#aiConsent').is_checked() and mode['calls']==0)
    page.locator('#toggleDemo').click()
    page.wait_for_timeout(4400)
    check('Sufficient synthetic input still requires consent',page.locator('#analyzeAI').is_disabled() and mode['calls']==0)
    page.locator('#startUsbRecord').click()
    page.wait_for_timeout(4400)  # Only samples captured inside this session may be analyzed.
    page.locator('#aiConsent').check()
    mode['value']='delayed'; page.locator('#analyzeAI').click()
    wait('AirflowAIView.observer.pending !== null')
    before=page.evaluate('AirflowLive.device.sampleCount'); page.wait_for_timeout(500)
    check('Curve samples keep arriving while local HTTP model request is pending',page.evaluate('AirflowLive.device.sampleCount')>before)
    release.set()
    wait('AirflowAIView.observer.current !== null')
    check('MOCK upstream via production adapter is visibly tied to synthetic source and model label','合成输入' in page.locator('#aiMode').inner_text() and 'MOCK_NOT_REAL' in page.locator('#aiMeta').inner_text())
    check('Input, evidence, generation time and no hardware application shown','sampleCount' in page.locator('#aiEvidence').inner_text() and '未应用到硬件' in page.locator('#aiMeta').inner_text())
    original=page.evaluate('AirflowAIView.observer.current.result.observation')
    page.evaluate("() => {AirflowAIView.observer.current.result.observation='<img src=x onerror=alert(1)> 测试文本'; AirflowAIView.refresh();}")
    check('Untrusted model text renders as literal text nodes',page.locator('#aiObservation img').count()==0 and '<img' in page.locator('#aiObservation').inner_text())
    page.evaluate('(value) => {AirflowAIView.observer.current.result.observation=value; AirflowAIView.refresh();}',original)
    check('Only bounded summary and event identifiers leave browser; no free text or raw samples',mode['inputs'][0]['baseline'] is None and 'samples' not in mode['inputs'][0] and 'context' not in mode['inputs'][0] and all(set(e)=={'eventId','type','capturedAt'} for e in mode['inputs'][0]['events']))
    check('Model result and current store share one session',page.evaluate('AirflowAIView.observer.current.result.sessionId === AirflowSessions.current.sessionId'))
    check('Review questions are visible', '记录是否完整' in page.locator('#aiReviewQuestions').inner_text())
    with page.expect_download() as download: page.locator('#exportUsbFullSession').click()
    record=json.loads(Path(download.value.path()).read_text())
    check('Full session JSON includes matching AI input/result and separate samples',record['source']=='simulated' and record['aiHistory'][0]['input']['source']=='simulated' and record['aiHistory'][0]['result']['model']=='MOCK_NOT_REAL' and len(record['samples'])>0)
    for failure in ['invalid','html','auth']:
      mode['value']=failure; page.locator('#analyzeAI').click()
      wait('AirflowAIView.observer.pending === null')
      check('Explicit rule fallback on '+failure,'AI 未连接' in page.locator('#aiStatus').inner_text() and page.locator('#aiObservation img').count()==0)
    mode['value']='delayed'; release.clear(); page.locator('#analyzeAI').click(); page.wait_for_timeout(150)
    page.locator('#aiConsent').uncheck(); release.set(); page.wait_for_timeout(250)
    check('Revocation discards pending result and removes current advice',page.evaluate('AirflowAIView.observer.history.at(-1).status')=='discarded' and '过期' in page.locator('#aiMode').inner_text())
    page.locator('#aiConsent').check(); mode['value']='success'
    page.locator('.nav-btn[data-nav="records"]').click(); page.locator('.nav-btn[data-nav="hardware"]').click()
    count=mode['calls']; page.locator('#analyzeAI').click(); wait('AirflowAIView.observer.pending === null')
    check('Route changes keep one observer and one call per click',mode['calls']==count+1)
    page.evaluate('AirflowLive.device.lastSampleAt -= 8000; AirflowAIView.observer.tick()')
    check('Old sample invalidates result despite otherwise live connection','过期' in page.locator('#aiMode').inner_text())
    page.locator('#finishUsbRecord').click()
    page.locator('#toggleDemo').click()
    check('Stopping source revokes consent',not page.locator('#aiConsent').is_checked())
    page.locator('#toggleDemo').click(); page.wait_for_timeout(4400)
    page.locator('#startUsbRecord').click(); page.wait_for_timeout(4400)
    page.locator('#aiConsent').check(); mode['value']='success'; page.locator('#analyzeAI').click(); wait('AirflowAIView.observer.pending === null')
    page.evaluate("() => {const banner=document.createElement('p'); banner.textContent='软件测试：MOCK_NOT_REAL 接口替身 + 合成输入；非真实模型/USB 验证'; banner.style.cssText='padding:16px;background:#fff0d9;font-size:16px;position:relative;z-index:100'; document.querySelector('#app').prepend(banner); window.scrollTo(0,0);}")
    page.screenshot(path=str(OUT/'ai-synthetic-mock-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844}); page.screenshot(path=str(OUT/'ai-synthetic-mock-mobile.png'),full_page=True)
    check('AI card and raw JSON do not overflow mobile viewport',page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
    page.locator('#aiConsent').uncheck()
    ai.config={}; page.locator('#reloadAI').click(); wait('AirflowAIView.observer.config?.configured === false')
    check('Unconfigured server is explicit and never fabricates model success','模型未配置' in page.locator('#aiStatus').inner_text() and page.locator('#analyzeAI').is_disabled())
    check('No uncaught browser JS errors',not errors)
    browser.close()
finally:
    release.set(); server.shutdown(); server.server_close(); upstream.shutdown(); upstream.server_close()
report={'scope':'Synthetic demo + MOCK_NOT_REAL local upstream, production HTTP adapter. NOT real provider or USB verification.', 'passed':len(checks),'checks':checks,'page_errors':errors}
(OUT/'ai-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))

"""Browser integration tests with a MOCK serial stream. NOT a USB hardware test.
Run: python3 tests/browser_smoke.py (requires playwright + a Chromium browser).
"""
import json
import os
import shutil
import re
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'test-output'
OUT.mkdir(parents=True, exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://localhost:{server.server_port}'
MOCK = r"""
(() => {
  let controller = null;
  const stats = {requests:0, opens:0, closes:0, writes:0, nextError:null, options:null};
  const serial = new EventTarget();
  serial.requestPort = async () => {
    stats.requests++;
    if (stats.nextError) {const n=stats.nextError; stats.nextError=null; throw new DOMException(n,n);}
    const port = {
      readable:null,
      async open(options) {stats.options=options;stats.opens++; this.readable=new ReadableStream({start(c){controller=c;},cancel(){controller=null;}});},
      async close() {if(this.readable?.locked) throw Error('CLOSE WHILE LOCKED');stats.closes++;this.readable=null;},
      get writable(){stats.writes++;throw Error('Unexpected hardware write');}
    };
    return port;
  };
  Object.defineProperty(navigator,'serial',{value:serial,configurable:true});
  window.__testSerial = {
    stats,
    push(text){if(!controller)throw Error('No readable stream');controller.enqueue(new TextEncoder().encode(text));},
    fail(){controller.error(new DOMException('Mock USB removed','NetworkError'));controller=null;}
  };
})();
"""

ISOLATED = os.environ.get('AIRFLOW_ISOLATED_BROWSER') == '1'
def load_page(page, use_serial=True, hardware=False):
    if not ISOLATED:
        page.goto(url + ('/?view=hardware' if hardware else ''), wait_until='networkidle')
        return
    # Managed browser navigation is disabled in this environment. Load the exact
    # HTML/CSS/JS directly into about:blank; mock secure context, storage and
    # download click in addition to the serial stream. No browser policy changed.
    page.goto('about:blank')
    page.evaluate("""() => {
      Object.defineProperty(window,'isSecureContext',{value:true,configurable:true});
      const store={};Object.defineProperty(window,'localStorage',{value:{
        getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}
      },configurable:true});
      const create=URL.createObjectURL.bind(URL),blobs={};
      URL.createObjectURL=b=>{const u=create(b);blobs[u]=b;return u};
      HTMLAnchorElement.prototype.click=function(){window.__downloadBlob=blobs[this.href];};
    }""")
    if use_serial: page.add_script_tag(content=MOCK)
    else: page.evaluate('delete Navigator.prototype.serial; delete navigator.serial;')
    html=(ROOT/'index.html').read_text()
    html=re.sub(r'<link[^>]+rel="stylesheet"[^>]*>', '', html)
    html=re.sub(r'<script src="[^"]+"></script>', '', html)
    page.set_content(html)
    for name in ['styles.css','hardware.css']: page.add_style_tag(content=(ROOT/name).read_text())
    for name in ['serial-protocol.js','serial-device.js','live-ui.js','ai-observer.js','ai-ui.js','app.js']: page.add_script_tag(content=(ROOT/name).read_text())
    if hardware: page.evaluate("state.page='hardware';render()")

checks=[]
errors=[]
def check(name, condition=True):
    assert condition, name
    checks.append(name)
    print('PASS',name)

def packet(seq=1, emg=15.5, a5='HIGH', t_ms=1000, sample_ms=1000):
    return json.dumps(dict(v=1,type='telemetry',t_ms=t_ms,sample_ms=sample_ms,seq=seq,raw=512,emg=emg,threshold=66,a5=a5,phase='rest'))+'\n'
try:
  with sync_playwright() as p:
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    browser=p.chromium.launch(executable_path=exe,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    context=browser.new_context(viewport={'width':1440,'height':1050},accept_downloads=True)
    context.add_init_script(MOCK)
    page=context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    load_page(page)
    check('Original landing page is preserved and explicitly labelled concept data',page.locator('.concept-notice').is_visible() and '林先生' in page.locator('#app').inner_text())
    page.locator('.nav-btn[data-nav="hardware"]').click()
    check('Initial state has no generated real measurements',page.locator('#emgValue').inner_text()=='—' and page.locator('#startUsbRecord').is_disabled())
    page.screenshot(path=str(OUT/'hardware-offline-desktop.png'),full_page=True)
    page.locator('#toggleDemo').click()
    page.wait_for_timeout(600)
    check('Explicit demo is clearly labelled synthetic', '合成演示' in page.locator('#liveSourceBadge').inner_text())
    page.locator('#startUsbRecord').click()
    page.wait_for_timeout(600)
    page.locator('#finishUsbRecord').click()
    if ISOLATED:
      page.locator('#exportUsbRecord').click()
      text=page.evaluate('window.__downloadBlob.text()')
      (OUT/'synthetic-session.csv').write_text(text)
      check('Export CSV content preserves the synthetic source label', 'simulated' in text)
    else:
      with page.expect_download() as info: page.locator('#exportUsbRecord').click()
      download=info.value
      download.save_as(str(OUT/'synthetic-session.csv'))
      check('CSV is downloadable and retains synthetic source label','simulated' in Path(download.path()).read_text())
    page.screenshot(path=str(OUT/'hardware-synthetic-desktop.png'),full_page=True)
    page.locator('#toggleDemo').click()
    page.locator('#connectDevice').click()
    page.wait_for_timeout(100)
    check('Mock serial port opens at 115200',page.evaluate('__testSerial.stats.options.baudRate')==115200)
    page.evaluate("__testSerial.push('12.')")
    page.wait_for_timeout(50)
    check('Partial data line does not update measurements',page.locator('#emgValue').inner_text()=='—')
    page.evaluate("__testSerial.push('34\\r\\n')")
    page.wait_for_timeout(100)
    check('Legacy numeric firmware is accepted without fabricated GPIO',page.locator('#emgValue').inner_text()=='12.34' and page.locator('#gpioValue').inner_text()=='—')
    page.locator('#startUsbRecord').click()
    page.evaluate("__testSerial.push('22.5\\nNaN\\n<script>bad</script>\\n')")
    page.wait_for_timeout(100)
    check('Malformed lines are counted and not rendered as values',page.evaluate('AirflowLive.device.invalid')==2 and page.locator('#emgValue').inner_text()=='22.50')
    page.evaluate('AirflowLive.device.lastAt -= 8000; AirflowLive.refresh()')
    check('Stale data is hidden and recording ends, without demo fallback',page.locator('#emgValue').inner_text()=='—' and page.locator('#startUsbRecord').is_disabled() and '7 秒' in page.locator('#recordingBadge').inner_text())
    page.evaluate('__testSerial.fail()')
    page.wait_for_timeout(200)
    check('Read failure closes unlocked stream and leaves offline UI',page.evaluate('AirflowLive.device.connection')=='disconnected' and page.locator('#emgValue').inner_text()=='—')
    page.locator('#connectDevice').click()
    page.wait_for_timeout(100)
    check('Reconnect clears previous measurements and statistics',page.evaluate('AirflowLive.device.sampleCount')==0)
    page.evaluate('(text)=>__testSerial.push(text)',packet())
    page.wait_for_timeout(100)
    page.locator('#startUsbRecord').click()
    page.evaluate('(text)=>__testSerial.push(text)',packet(seq=2,emg=70,a5='LOW',t_ms=2000,sample_ms=2000))
    page.evaluate('(text)=>__testSerial.push(text)',packet(seq=2,emg=70,a5='LOW',t_ms=6000,sample_ms=2000))
    page.wait_for_timeout(150)
    check('Telemetry displays commanded LOW, not an inferred pump or pressure',page.locator('#gpioValue').inner_text()=='LOW' and '非实际压力' in page.locator('#gpioHint').inner_text())
    check('Duplicate sample in a GPIO/status frame does not add chart sample',page.evaluate('AirflowLive.device.sampleCount')==2)
    check('A confirmed HIGH to LOW edge is counted once',page.evaluate('AirflowLive.device.lowEdges')==1)
    page.evaluate("__testSerial.push('{\"v\":1,\"type\":\"boot\",\"fw\":\"airflow-observer-v1\"}\\n')")
    page.wait_for_timeout(100)
    check('Firmware reboot clears live data and ends current recording',page.locator('#emgValue').inner_text()=='—' and '固件重启' in page.locator('#recordingBadge').inner_text())
    page.locator('#disconnectDevice').click()
    page.wait_for_timeout(100)
    check('Manual disconnect releases read lock before close',page.evaluate('__testSerial.stats.closes')==2)
    check('Production transport never requested serial writable stream',page.evaluate('__testSerial.stats.writes')==0)
    page.evaluate("__testSerial.stats.nextError='NotFoundError'")
    page.locator('#connectDevice').click()
    page.wait_for_timeout(100)
    check('Port chooser cancellation returns a usable disconnected UI',page.locator('#connectDevice').is_enabled() and '未选择串口' in page.locator('#usbError').inner_text())
    page.locator('.nav-btn[data-nav="records"]').click()
    check('Records keep USB and synthetic sessions separate', 'USB 实测' in page.locator('#app').inner_text() and '合成演示' in page.locator('#app').inner_text())
    page.locator('.role-btn[data-role="therapist"]').click()
    check('Caregiver overview is still explicitly example data',page.locator('.concept-notice').is_visible())
    page.locator('.nav-btn[data-nav="hardware"]').click()
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(OUT/'hardware-offline-mobile.png'),full_page=True)
    check('Mobile hardware page does not overflow horizontally',page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
    page.set_viewport_size({'width':1440,'height':1050})
    # A separate environment without the API validates feature detection.
    unsupported=browser.new_context(viewport={'width':1280,'height':800})
    unsupported.add_init_script('delete Navigator.prototype.serial;')
    other=unsupported.new_page()
    other.on('pageerror',lambda e: errors.append(str(e)))
    load_page(other, use_serial=False, hardware=True)
    check('Browser without Web Serial shows actionable fallback message','Web Serial' in other.locator('#usbError').inner_text())
    check('No uncaught JavaScript errors across routes and stream lifecycle',not errors)
    browser.close()
finally:
  server.shutdown()
report={'scope':'Software-only browser tests with an injected mock serial stream. NOT tested with an Arduino or pump.', 'isolated_dom_harness':ISOLATED, 'additional_mocks_if_isolated':['secure context','localStorage','download click'] if ISOLATED else [],'passed':len(checks),'checks':checks,'page_errors':errors}
(OUT/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'passed':len(checks),'errors':errors},ensure_ascii=False))

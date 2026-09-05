#!/usr/bin/env python3
"""Loopback-only AIR-FLOW observer and AI proxy; Python standard library."""
import argparse
import json
import secrets
import sys
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATIC = {name: mime for names, mime in [
    (['index.html'], 'text/html; charset=utf-8'),
    (['tokens.css', 'styles.css', 'hardware.css', 'roadshow.css', 'camera.css'], 'text/css; charset=utf-8'),
    (['app.js', 'serial-protocol.js', 'serial-device.js', 'live-ui.js',
      'ai-observer.js', 'ai-ui.js', 'session-store.js', 'roadshow-ui.js', 'camera-observer.js',
      'vision-vendor/vision_bundle.mjs', 'vision-vendor/vision_wasm_internal.js',
      'vision-vendor/vision_wasm_nosimd_internal.js'], 'text/javascript; charset=utf-8'),
    (['vision-vendor/vision_wasm_internal.wasm', 'vision-vendor/vision_wasm_nosimd_internal.wasm'], 'application/wasm'),
    (['vision-vendor/pose_landmarker_lite.task'], 'application/octet-stream')
] for name in names}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Never log request input, upstream exceptions or credentials.

    def setup(self):
        super().setup()
        self.connection.settimeout(5)

    def reply(self, status, value, mime='application/json; charset=utf-8'):
        data = value if isinstance(value, bytes) else json.dumps(value, ensure_ascii=False, allow_nan=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Permissions-Policy', 'serial=(self), camera=(self), microphone=()')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        self.end_headers()
        if self.command != 'HEAD':
            try:
                self.wfile.write(data)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def same_host(self):
        return self.headers.get_all('Host', []) in ([f'localhost:{self.server.server_port}'], [f'127.0.0.1:{self.server.server_port}'])

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if not self.same_host():
            return self.reply(403, {'error': 'invalid_host'})
        path = self.requestline.split()[1].split('?', 1)[0]
        if path == '/api/ai/status':
            return self.reply(200, {**self.server.ai.status(), 'csrfToken': self.server.csrf})
        name = 'index.html' if path == '/' else path.removeprefix('/')
        if name not in STATIC or path not in ('/', '/' + name):
            return self.reply(404, {'error': 'not_found'})
        file = ROOT / name
        # Exact whitelist only; every intermediate path must also be a real directory.
        components = [ROOT.joinpath(*Path(name).parts[:i]) for i in range(1, len(Path(name).parts) + 1)]
        if (any(part.is_symlink() for part in components) or not file.is_file()
                or ROOT not in file.resolve().parents):
            return self.reply(404, {'error': 'not_found'})
        self.reply(200, file.read_bytes(), STATIC[name])

    def do_POST(self):
        from ai_backend import AIError, strict_json
        origin = 'http://' + (self.headers.get('Host') or '')
        if (not self.same_host() or self.headers.get_all('Origin', []) != [origin]
                or self.headers.get('X-Airflow-CSRF') != self.server.csrf
                or self.headers.get('Sec-Fetch-Site') not in (None, 'same-origin')):
            return self.reply(403, {'error': 'same_origin_required', 'mode': 'unavailable'})
        if self.path != '/api/ai/analyze':
            return self.reply(404, {'error': 'not_found'})
        if self.headers.get('Content-Type') != 'application/json' or self.headers.get('Transfer-Encoding'):
            return self.reply(415, {'error': 'json_required'})
        lengths = self.headers.get_all('Content-Length', [])
        if len(lengths) != 1 or not lengths[0].isdigit() or not 1 <= int(lengths[0]) <= 16384:
            return self.reply(413, {'error': 'body_size'})
        try:
            body = strict_json(self.rfile.read(int(lengths[0])))
            self.reply(200, self.server.ai.analyze(body))
        except AIError as exc:
            self.reply(exc.status, {'error': exc.code, 'mode': 'unavailable'})
        except (ValueError, UnicodeError, TimeoutError, RecursionError):
            self.reply(400, {'error': 'invalid_json', 'mode': 'unavailable'})


def make_server(port=8000, ai=None):
    from ai_backend import AIService
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.daemon_threads = True
    server.ai = ai or AIService.from_environment(ROOT)
    server.csrf = secrets.token_urlsafe(32)
    return server


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error('Use a port between 1024 and 65535.')
    try:
        server = make_server(args.port)
    except OSError:
        print('Cannot start local server. Try: python3 serve.py --port 8001', file=sys.stderr)
        return 1
    url = f'http://localhost:{args.port}/'
    print(f'\nAIR-FLOW observer: {url}\nAI configured: {server.ai.status()["configured"]}', flush=True)
    print('Closing this server does NOT stop the pump. Ctrl+C stops the web server.', flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

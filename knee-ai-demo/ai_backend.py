"""Validated, bounded Chat Completions adapter. No hardware control path."""
import hashlib
import json
import math
import os
import re
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urlsplit

# Engineering gates, not medical thresholds. Returned to the browser by status.
GATES = dict(windowMs=60000, minSamples=5, minSpanMs=4000,
             maxSampleAgeMs=7000, minIntervalMs=10000)
LIMITATIONS = ['仅 A0 单路稀疏滤波数值；不是持续 500 Hz 采样。',
               '无人工标注基线；本次模型摘要不含摄像头角度，压力与实际辅助力未测得。',
               '不能判断疲劳、肌力、坡度、上下楼或临床效果。',
               'A5 仅为控制输出；本次 AI 文本未应用到硬件，不构成物理闭环。']
SUGGESTIONS = {'collect_more_data', 'label_baseline', 'review_setup',
               'continue_observing', 'no_recommendation'}
FIELDS = {'requestId', 'generation', 'source', 'protocol', 'windowId',
          'windowStartMs', 'windowEndMs', 'sampleCount', 'lastSampleAgeMs',
          'lastFrameAgeMs', 'statistics', 'threshold', 'thresholdSource',
          'a5Summary', 'baseline'}
SESSION_FIELDS = {'sessionId', 'events'}
EVENT_TYPES = {'manual_end', 'manual_pause', 'review_requested', 'recording_started', 'recording_ended'}
EVIDENCE_PATHS = {'sampleCount', 'lastSampleAgeMs', 'lastFrameAgeMs', 'threshold',
                  'thresholdSource', 'source', 'protocol', 'statistics.min',
                  'statistics.max', 'statistics.mean', 'statistics.intervalMinMs',
                  'statistics.intervalMaxMs', 'statistics.intervalMeanMs',
                  'a5Summary.last', 'a5Summary.changes'}


class AIError(Exception):
    def __init__(self, code, status=400):
        self.code, self.status = code, status


def strict_json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('duplicate key')
            result[key] = value
        return result
    def bad_constant(_):
        raise ValueError('nonfinite')
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=bad_constant)


def number(value, low, high, integer=False):
    return (type(value) in (int, float) and math.isfinite(value) and low <= value <= high
            and (not integer or int(value) == value))


def validate_input(data, gates=GATES):
    def require(ok):
        if not ok:
            raise AIError('invalid_summary')
    require(type(data) is dict and set(data) in (FIELDS, FIELDS | SESSION_FIELDS))
    for field in ('requestId', 'windowId'):
        require(type(data[field]) is str and re.fullmatch(r'[A-Za-z0-9_-]{1,100}', data[field]))
    require(number(data['generation'], 0, 2**53 - 1, True))
    require(data['source'] in ('serial', 'simulated', 'replay'))
    require(data['protocol'] in ('legacy', 'telemetry'))
    for field in ('windowStartMs', 'windowEndMs'):
        require(number(data[field], 0, 2**53 - 1, True))
    span = data['windowEndMs'] - data['windowStartMs']
    require(0 <= span <= gates['windowMs'])
    require(number(data['sampleCount'], 1, 2400, True))
    for field in ('lastSampleAgeMs', 'lastFrameAgeMs'):
        require(number(data[field], 0, 86400000))
    if 'sessionId' in data:
        require(type(data['sessionId']) is str and re.fullmatch(r'[A-Za-z0-9_-]{1,100}', data['sessionId']))
        require(type(data['events']) is list and len(data['events']) <= 20)
        ids = set()
        for event in data['events']:
            require(type(event) is dict and set(event) == {'eventId', 'type', 'capturedAt'})
            require(type(event['eventId']) is str and re.fullmatch(r'[A-Za-z0-9_-]{1,100}', event['eventId']))
            require(event['eventId'] not in ids and type(event['type']) is str and event['type'] in EVENT_TYPES)
            require(number(event['capturedAt'], data['windowStartMs'], data['windowEndMs'] + data['lastSampleAgeMs'], True))
            ids.add(event['eventId'])
    if (data['sampleCount'] < gates['minSamples'] or span < gates['minSpanMs']
            or max(data['lastSampleAgeMs'], data['lastFrameAgeMs']) > gates['maxSampleAgeMs']):
        raise AIError('insufficient_data', 422)
    stats = data['statistics']
    require(type(stats) is dict and set(stats) == {'min', 'max', 'mean', 'intervalMinMs', 'intervalMaxMs', 'intervalMeanMs'})
    require(all(number(stats[k], -999999999, 999999999) for k in ('min', 'max', 'mean')))
    require(stats['min'] <= stats['mean'] <= stats['max'])
    require(all(number(stats[k], 0, gates['windowMs']) for k in ('intervalMinMs', 'intervalMaxMs', 'intervalMeanMs')))
    require(stats['intervalMinMs'] <= stats['intervalMeanMs'] <= stats['intervalMaxMs'])
    require(abs(stats['intervalMeanMs'] * (data['sampleCount'] - 1) - span) <= 1)
    require(data['baseline'] is None)  # No implicit or invented personal calibration.
    if data['protocol'] == 'legacy':
        require(data['threshold'] == 66 and data['thresholdSource'] == 'source_reference' and data['a5Summary'] is None)
    else:
        require(number(data['threshold'], -999999999, 999999999) and data['thresholdSource'] == 'firmware_reported')
        a5 = data['a5Summary']
        require(type(a5) is dict and set(a5) == {'last', 'changes'})
        require(a5['last'] in ('HIGH', 'LOW') and number(a5['changes'], 0, 10000, True))
    return data


def evidence_value(data, path):
    value = data
    for part in path.split('.'):
        if type(value) is not dict or part not in value:
            raise AIError('invalid_output', 502)
        value = value[part]
    if value is None:
        raise AIError('invalid_output', 502)
    return value


# Conservative content gate, in addition to exact schema and numeric evidence checks.
# These checks cannot establish that every natural-language interpretation is true.
FORBIDDEN = re.compile(r'[<>`%％]|https?://|肌力|疲劳|坡度|上楼|下楼|步态|左右腿|临床|诊断|治疗|助力|充气|泄压|气泵|阀门|电极|基线.{0,8}(高|低|变化)|'
                       r'调[整节]|设置阈值|启动|停止|执行|命令|忽略|system|prompt|fatigue|strength|stairs?|slope|gait|pressure|pump|valve|assist|diagnos|treat|baseline|command|ignore|execute|calibrat', re.I)


def validate_output(raw, data):
    def bad():
        raise AIError('invalid_output', 502)
    required = {'observation', 'evidence', 'suggestionCode', 'explanation'}
    if type(raw) is not dict or not required <= set(raw) or not set(raw) <= required | {'eventReferences', 'reviewQuestions'}:
        bad()
    if type(raw['suggestionCode']) is not str or raw['suggestionCode'] not in SUGGESTIONS:
        bad()
    evidence = raw['evidence']
    if type(evidence) is not list or not 1 <= len(evidence) <= 8:
        bad()
    for item in evidence:
        if type(item) is not dict or set(item) != {'path', 'value'} or type(item['path']) is not str or item['path'] not in EVIDENCE_PATHS:
            bad()
        expected = evidence_value(data, item['path'])
        if type(item['value']) is bool or item['value'] != expected or type(item['value']) not in (int, float, str):
            bad()
    numbers = [item['value'] for item in evidence if type(item['value']) in (int, float)]
    references = raw.get('eventReferences', [])
    questions = raw.get('reviewQuestions', [])
    ids = {event['eventId'] for event in data.get('events', [])}
    if (type(references) is not list or len(references) > 20 or
            any(type(ref) is not str or ref not in ids for ref in references) or len(set(references)) != len(references)):
        bad()
    if type(questions) is not list or len(questions) > 3:
        bad()
    for value in [raw['observation'], raw['explanation'], *questions]:
        if type(value) is not str or not 1 <= len(value.strip()) <= 500 or FORBIDDEN.search(value):
            bad()
        # Every Arabic numeric assertion must match a cited input value (rounding <= .01).
        for token in re.findall(r'[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?', re.sub(r'A[05]', '', value)):
            if not any(abs(float(token) - num) <= .01 for num in numbers):
                bad()
    return {**raw, 'eventReferences': references, 'reviewQuestions': questions}


SYSTEM = '''You observe a read-only sparse A0 filtered numeric summary, never a person or hardware action.
Return ONLY a JSON object with exactly observation (Chinese text), explanation (Chinese text),
suggestionCode (collect_more_data / label_baseline / review_setup / continue_observing / no_recommendation),
evidence (1-8 objects with path and exact input value), eventReferences (array of exact eventId strings from input events),
reviewQuestions (up to 3 short Chinese questions about recording completeness, timing or provenance).
When sessionId and events are absent, eventReferences must be empty. Event types are labels recorded by the operator or application,
not inferred physical actions; never invent why an operator labeled manual_end/manual_pause. Do not repeat event identifiers or
timestamps in prose; list identifiers only in eventReferences. Ask what needs human review without suggesting a medical conclusion.
Describe only numeric range, sample timing, received HIGH/LOW labels, or source/reference provenance.
Use evidence paths from: ''' + ', '.join(sorted(EVIDENCE_PATHS)) + '''.
Every number in prose must equal cited evidence, with at most two decimal places of rounding.
No commands, HTML, URLs, percentages, health/strength/fatigue/gait/stairs/slope/pressure/assistance claims,
no claims about baseline comparison or electrode quality. Do not discuss these forbidden topics even as disclaimers;
limitations are appended by the server. A5 is only a reported output label, never physical feedback.
There is no labeled baseline. You may choose label_baseline, but use explanation about recording a labeled reference window,
not an inferred comparison. Legacy threshold is source reference, not firmware readback.
Input simulated/replay is not physical measurement. No new sensor facts; no hardware recommendations.'''


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise AIError('upstream_redirect', 502)


class AIService:
    def __init__(self, config=None):
        self.config = config or {}
        self.lock = threading.Lock()
        self.last_call = -math.inf
        self.timeout = 20
        self.gates = dict(GATES)
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

    @classmethod
    def from_environment(cls, root):
        names = ('ADAPTER', 'BASE_URL', 'MODEL', 'API_KEY', 'AUTH_MODE')
        config = {}
        envfile = root / '.env'
        # Literal KEY=value only; never execute a shell or search other directories.
        if envfile.is_file() and not envfile.is_symlink():
            try:
                if envfile.stat().st_size > 16384:
                    return cls()
                for line in envfile.read_text().splitlines():
                    key, sep, value = line.partition('=')
                    if sep and key.strip() in ['AIRFLOW_AI_' + n for n in names]:
                        config[key.strip().removeprefix('AIRFLOW_AI_')] = value.strip().strip('"\'')
            except (OSError, UnicodeError):
                return cls()
        for name in names:
            if 'AIRFLOW_AI_' + name in os.environ:
                config[name] = os.environ['AIRFLOW_AI_' + name].strip()
        return cls(config)

    def status(self):
        c = self.config
        endpoint = c.get('BASE_URL', '')
        model = c.get('MODEL', '')
        configured = False
        try:
            url = urlsplit(endpoint)
            valid = (url.hostname and not url.username and not url.password and not url.query and not url.fragment
                     and url.port != 0 and not re.search(r'[\s\x00-\x1f]', endpoint))
            local = url.hostname in ('localhost', '127.0.0.1', '::1')
            auth = c.get('AUTH_MODE')
            configured = bool(valid and c.get('ADAPTER') == 'chat_completions' and
                              re.fullmatch(r'[A-Za-z0-9_.:/-]{1,150}', model) and
                              ((auth == 'bearer' and c.get('API_KEY') and url.scheme == 'https') or
                               (auth == 'local_no_auth' and local and url.scheme in ('http', 'https'))))
        except ValueError:
            pass
        # Endpoint is shown only after URL validation, never expose embedded credentials.
        public = endpoint.rstrip('/') if configured else None
        config_id = hashlib.sha256(json.dumps([public, model if configured else None, c.get('AUTH_MODE')]).encode()).hexdigest()[:20]
        return dict(configured=configured, model=model if configured else None,
                    service=public, configId=config_id, mode='model' if configured else 'unavailable',
                    adapter='chat_completions', gates=self.gates)

    def analyze(self, body):
        if type(body) is not dict or set(body) != {'consent', 'configId', 'summary'}:
            raise AIError('invalid_request')
        status = self.status()
        if body['consent'] is not True or body['configId'] != status['configId']:
            raise AIError('consent_required', 403)
        data = validate_input(body['summary'], self.gates)
        if not status['configured']:
            raise AIError('not_configured', 503)
        if not self.lock.acquire(blocking=False):
            raise AIError('busy', 429)
        start = time.monotonic()
        try:
            if (start - self.last_call) * 1000 < self.gates['minIntervalMs']:
                raise AIError('rate_limited', 429)
            self.last_call = start
            # Only the validated summary and fixed event type/time/opaque ID leave; never free text or raw streams.
            payload = dict(model=status['model'], messages=[dict(role='system', content=SYSTEM),
                           dict(role='user', content=json.dumps(data, ensure_ascii=False, allow_nan=False))],
                           response_format={'type': 'json_object'}, stream=False)
            headers = {'Content-Type': 'application/json'}
            if self.config.get('AUTH_MODE') == 'bearer':
                headers['Authorization'] = 'Bearer ' + self.config['API_KEY']
            request = urllib.request.Request(status['service'] + '/chat/completions',
                                             data=json.dumps(payload).encode(), headers=headers, method='POST')
            try:
                with self.opener.open(request, timeout=self.timeout) as response:
                    chunks = []; size = 0
                    while size <= 65536:
                        if time.monotonic() - start > self.timeout:
                            raise TimeoutError()
                        chunk = response.read1(min(4096, 65537 - size))
                        if not chunk:
                            break
                        chunks.append(chunk); size += len(chunk)
                    raw = b''.join(chunks)
                if len(raw) > 65536:
                    raise AIError('invalid_output', 502)
                envelope = strict_json(raw)
                choice = envelope['choices'][0]
                if choice.get('finish_reason') != 'stop' or choice['message'].get('tool_calls'):
                    raise AIError('invalid_output', 502)
                result = validate_output(strict_json(choice['message']['content']), data)
            except urllib.error.HTTPError as exc:
                code = 'upstream_auth' if exc.code in (401, 403) else 'upstream_rate_limit' if exc.code == 429 else 'upstream_error'
                raise AIError(code, 502) from None
            except OSError as exc:
                # OSError includes socket/SSL/connection failures; never return raw details.
                raise AIError('timeout' if isinstance(exc, TimeoutError) else 'network_error', 504) from None
            except (ValueError, KeyError, IndexError, TypeError, UnicodeError, RecursionError):
                raise AIError('invalid_output', 502) from None
            return {**{k: data[k] for k in ('requestId', 'windowId', 'generation', 'source')},
                    **({'sessionId': data['sessionId']} if 'sessionId' in data else {}),
                    **result, 'mode': 'model', 'model': status['model'], 'service': status['service'],
                    'generatedAt': datetime.now(timezone.utc).isoformat(),
                    'latencyMs': round((time.monotonic() - start) * 1000),
                    'limitations': LIMITATIONS, 'appliedToHardware': False}
        finally:
            self.lock.release()

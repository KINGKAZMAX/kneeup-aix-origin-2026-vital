"""Explicit SYNTHETIC input and MOCK model response. Never physical measurements."""
import time


def summary():
    now = round(time.time() * 1000)
    return dict(requestId='synthetic-request', generation=1, source='simulated', protocol='legacy',
                windowId='synthetic-window', windowStartMs=now-4000, windowEndMs=now,
                sampleCount=5, lastSampleAgeMs=0, lastFrameAgeMs=0,
                statistics=dict(min=-2, max=2, mean=0, intervalMinMs=1000, intervalMaxMs=1000, intervalMeanMs=1000),
                threshold=66, thresholdSource='source_reference', a5Summary=None, baseline=None)


def model_output(data=None):
    data = data or summary()
    return dict(observation='窗口包含 ' + str(data['sampleCount']) + ' 个新样本。',
                evidence=[dict(path='sampleCount', value=data['sampleCount'])],
                suggestionCode='label_baseline', explanation='建议人工标注后续参考窗口。')

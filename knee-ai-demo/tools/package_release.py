"""Build this release from exact paths; --manifest-only never creates a ZIP.

The generated manifest hashes every included payload file. Its own JSON is not
self-hashed; the final command output reports the ZIP's SHA-256 separately.
"""
import argparse
import hashlib
import json
import os
import stat
import tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'AIR-FLOW-Knee-AI/'
MANIFEST_NAME = 'RELEASE_MANIFEST.json'

# No directory traversal or recursive discovery: a new file needs an explicit entry.
REQUIRED_FILES = '''
index.html tokens.css styles.css hardware.css roadshow.css camera.css
app.js serial-protocol.js serial-device.js session-store.js live-ui.js
roadshow-ui.js camera-observer.js ai-observer.js ai-ui.js serve.py ai_backend.py
start.command start.bat .env.example .gitignore
README.md FIELD_DEMO.md TEST_REPORT.md AGENTS.md HARDWARE_PROTOCOL.md
CODEX_HANDOFF.md CODEX_START_PROMPT.md tools/package_release.py
docs/SHARED_SESSION.md docs/AI_INTEGRATION_SPEC.md docs/HANDOFF_VERIFICATION.md
docs/reference/PROJECT_SOURCE_EXTRACT.md
vision-vendor/vision_bundle.mjs
vision-vendor/vision_wasm_internal.js vision-vendor/vision_wasm_internal.wasm
vision-vendor/vision_wasm_nosimd_internal.js vision-vendor/vision_wasm_nosimd_internal.wasm
vision-vendor/pose_landmarker_lite.task vision-vendor/LICENSE vision-vendor/SOURCES.md
firmware/original/ZY_Knee_sketch.ino
firmware/AIR_FLOW_Telemetry/AIR_FLOW_Telemetry.ino
tests/protocol.test.cjs tests/ai-observer.test.cjs tests/camera-observer.test.cjs
tests/session-store.test.cjs tests/session-integration.test.cjs tests/roadshow-review.test.cjs
tests/ai_backend_test.py tests/ai_fixtures.py tests/native_firmware_test.py
tests/native/Arduino.h tests/native/runner.cpp
'''.split()

# Archive only clearly labeled historical prose, never the old browser results/screenshots.
ARCHIVED_DOCS = '''
docs/archive-previous/README-ARCHIVE.md
docs/archive-previous/README.md docs/archive-previous/FIELD_DEMO.md
docs/archive-previous/CODEX_HANDOFF.md docs/archive-previous/CODEX_START_PROMPT.md
docs/archive-previous/TEST_REPORT.md
docs/archive-previous/docs/HANDOFF_VERIFICATION.md
'''.split()

# Fresh evidence is optional until final verification. Missing paths remain missing.
# Legacy browser scripts, old screenshots and old browser pass reports are not shipped.
OPTIONAL_FILES = '''
docs/test-output/current-ai-js-tests.txt
docs/test-output/current-ai-backend-tests.txt
docs/test-output/current-firmware-tests.txt
docs/test-output/roadshow-js-tests.txt
docs/test-output/color-audit.json
docs/test-output/final-node-tests.txt
docs/test-output/final-backend-tests.txt
docs/test-output/final-firmware-tests.txt
docs/test-output/final-browser-report.json
docs/test-output/final-browser-tests.txt
docs/test-output/final-color-audit.json
docs/test-output/final-roadshow-desktop.png
docs/test-output/final-roadshow-professional.png
docs/test-output/final-roadshow-mobile.png
tests/roadshow_browser_test.py
'''.split()


def checked_path(root, name, required=True):
    """Reject links in every component, including optional paths; never follow one."""
    relative = PurePosixPath(name)
    if (relative.is_absolute() or not relative.parts or str(relative) != name
            or any(part in ('', '.', '..', '.env', '.venv', 'venv', '__pycache__',
                            'dist', '.git', 'private-logs') for part in relative.parts)
            or any(part.startswith('.') and part not in ('.env.example', '.gitignore')
                   for part in relative.parts)):
        raise ValueError(f'Forbidden release path: {name}')
    root = Path(root)
    if root.is_symlink():
        raise ValueError('Release root must not be a symbolic link')
    path = root
    for index, part in enumerate(relative.parts):
        path = path / part
        if path.is_symlink():
            raise ValueError(f'Symbolic link refused: {name}')
        if not path.exists():
            if required:
                raise ValueError(f'Required release file missing: {name}')
            return None
        mode = path.stat().st_mode
        if index < len(relative.parts) - 1 and not stat.S_ISDIR(mode):
            raise ValueError(f'Non-directory parent refused: {name}')
    if not stat.S_ISREG(path.stat().st_mode):
        raise ValueError(f'Non-regular release file refused: {name}')
    if root.resolve() not in path.resolve().parents:
        raise ValueError(f'Path escaped release root: {name}')
    return path


def collect_payload(root=ROOT):
    required = REQUIRED_FILES + ARCHIVED_DOCS
    names = required + OPTIONAL_FILES
    if len(names) != len(set(names)):
        raise ValueError('Duplicate path in release allowlist')
    payload, missing = {}, []
    for name in sorted(names):
        path = checked_path(root, name, required=name in required)
        if path is None:
            missing.append(name)
            continue
        payload[name] = path.read_bytes()
    return payload, missing


def manifest_for(payload, missing):
    return {
        'manifestVersion': 2,
        'generatedAtUTC': datetime.now(timezone.utc).isoformat(),
        'scope': 'Shared-session roadshow source and explicitly listed local software evidence; real API, USB and physical response require separate verification.',
        'hashAlgorithm': 'sha256',
        'manifestSelfHash': 'Excluded: this file is generated from the payload hashes.',
        'files': {name: hashlib.sha256(data).hexdigest() for name, data in sorted(payload.items())},
        'optionalFilesNotPresent': missing,
    }


def atomic_write(path, data):
    if path.is_symlink() or (path.exists() and not path.is_file()):
        raise ValueError(f'Refusing output path: {path.name}')
    handle, temporary = tempfile.mkstemp(prefix='.release-', dir=path.parent)
    try:
        with os.fdopen(handle, 'wb') as output:
            output.write(data)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest-only', action='store_true',
                        help='Validate exact release paths and write SHA manifest without creating a ZIP.')
    args = parser.parse_args()
    try:
        payload, missing = collect_payload()
        manifest = manifest_for(payload, missing)
        raw_manifest = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
        atomic_write(ROOT / MANIFEST_NAME, raw_manifest)
        if args.manifest_only:
            print(json.dumps({'manifest': str(ROOT / MANIFEST_NAME), 'payloadFiles': len(payload),
                              'optionalFilesNotPresent': missing, 'zipCreated': False}, ensure_ascii=False))
            return 0
        out = ROOT / 'dist'
        if out.is_symlink() or (out.exists() and not out.is_dir()):
            raise ValueError('Refusing dist output directory')
        out.mkdir(exist_ok=True)
        archive = out / 'AIR-FLOW-Knee-AI-handoff.zip'
        if archive.is_symlink() or (archive.exists() and not archive.is_file()):
            raise ValueError('Refusing archive output path')
        handle, temporary = tempfile.mkstemp(prefix='.release-', suffix='.zip', dir=out)
        os.close(handle)
        try:
            with ZipFile(temporary, 'w', ZIP_DEFLATED) as zipped:
                for name, data in sorted(payload.items()):
                    zipped.writestr(PREFIX + name, data)
                zipped.writestr(PREFIX + MANIFEST_NAME, raw_manifest)
            with ZipFile(temporary) as zipped:
                expected = {PREFIX + name for name in payload} | {PREFIX + MANIFEST_NAME}
                if set(zipped.namelist()) != expected or len(zipped.namelist()) != len(expected):
                    raise ValueError('Unexpected ZIP contents')
                for name, digest in manifest['files'].items():
                    if hashlib.sha256(zipped.read(PREFIX + name)).hexdigest() != digest:
                        raise ValueError(f'ZIP hash mismatch: {name}')
            os.replace(temporary, archive)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        print(json.dumps({'archive': str(archive), 'files': len(payload) + 1,
                          'bytes': archive.stat().st_size,
                          'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
                          'optionalFilesNotPresent': missing}, ensure_ascii=False))
        return 0
    except (ValueError, OSError) as exc:
        parser.exit(1, f'Release refused: {exc}\n')


if __name__ == '__main__':
    raise SystemExit(main())

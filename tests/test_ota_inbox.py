import base64
import hashlib
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / 'tools' / 'ota_inbox.py'
spec = importlib.util.spec_from_file_location('ota_inbox', MODULE_PATH)
ota_inbox = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ota_inbox)


class OtaInboxTests(unittest.TestCase):
    def make_folder(self, overlay_entries, request_id='req-test', version='3.2.8', build='3280', base='a' * 40):
        overlay_file = tempfile.NamedTemporaryFile(suffix='.zip', delete=False)
        overlay_file.close()
        overlay = Path(overlay_file.name)
        with zipfile.ZipFile(overlay, 'w', zipfile.ZIP_DEFLATED) as package:
            for name, data in overlay_entries.items():
                package.writestr(name, data)
        raw = overlay.read_bytes()
        encoded = base64.b64encode(raw).decode('ascii')
        parts = [encoded[i:i + 41] for i in range(0, len(encoded), 41)]
        request = {
            'schema': 1,
            'extensionId': 'com.ethan.editinghub',
            'repository': 'officiallethan/ethan-editing-hub-updates',
            'requestId': request_id,
            'baseCommit': base,
            'version': version,
            'build': build,
            'name': 'Test Release',
            'notes': 'Test notes',
            'overlayEncoding': 'base64-parts',
            'overlayParts': [f'EHREQ_{request_id}_P{i + 1:03d}.b64' for i in range(len(parts))],
            'overlaySha256': hashlib.sha256(raw).hexdigest().upper(),
            'overlaySize': len(raw),
            'createdAt': '2026-09-03T05:00:00Z',
        }
        folder_file = tempfile.NamedTemporaryFile(suffix='.zip', delete=False)
        folder_file.close()
        folder = Path(folder_file.name)
        with zipfile.ZipFile(folder, 'w', zipfile.ZIP_DEFLATED) as archive:
            archive.writestr(f'EHREQ_{request_id}.json', json.dumps(request))
            for name, part in zip(request['overlayParts'], parts):
                archive.writestr(name, part)
        return folder, request

    def test_reassembles_and_verifies_overlay(self):
        folder, request = self.make_folder({'src/com.ethan.editinghub/js/test.js': 'hello'})
        with tempfile.TemporaryDirectory() as temporary:
            loaded, overlay = ota_inbox.load_request_from_folder_zip(
                folder, Path(temporary), live_version='3.2.7', live_build='3270'
            )
            self.assertEqual(loaded['requestId'], request['requestId'])
            self.assertEqual(hashlib.sha256(overlay.read_bytes()).hexdigest().upper(), request['overlaySha256'])

    def test_rejects_path_outside_extension_source(self):
        folder, _ = self.make_folder({'tools/not_allowed.py': 'nope'})
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaises(ValueError):
                ota_inbox.load_request_from_folder_zip(
                    folder, Path(temporary), live_version='3.2.7', live_build='3270'
                )

    def test_rejects_stale_release(self):
        folder, _ = self.make_folder(
            {'src/com.ethan.editinghub/js/test.js': 'hello'}, version='3.2.7', build='3270'
        )
        with tempfile.TemporaryDirectory() as temporary:
            loaded, overlay = ota_inbox.load_request_from_folder_zip(
                folder, Path(temporary), live_version='3.2.7', live_build='3270'
            )
            self.assertIsNone(loaded)
            self.assertIsNone(overlay)

    def test_rejects_noncanonical_request_identity(self):
        bad = {
            'schema': 1,
            'extensionId': 'wrong.extension',
            'repository': 'officiallethan/ethan-editing-hub-updates',
            'requestId': 'x',
            'baseCommit': 'a' * 40,
            'version': '3.2.8',
            'build': '3280',
            'name': 'Bad',
            'notes': 'Bad request',
            'overlayEncoding': 'base64-parts',
            'overlayParts': ['EHREQ_x_P001.b64'],
            'overlaySha256': 'A' * 64,
            'overlaySize': 1,
            'createdAt': '2026-09-03T05:00:00Z',
        }
        with self.assertRaises(ValueError):
            ota_inbox.validate_request(bad)


if __name__ == '__main__':
    unittest.main()

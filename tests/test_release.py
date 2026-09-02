import hashlib
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from tools import hub_release as release


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'src' / 'com.ethan.editinghub'
        self.metadata = {
            'extensionId': 'com.ethan.editinghub', 'version': '3.2.1',
            'build': '3201', 'name': "Ethan's release", 'notes': 'Repository release.',
            'channel': 'stable',
        }
        files = {
            'index.html': b'<html>Hub</html>',
            'background.html': b'<html>Background</html>',
            'css/style.css': b'body { color: white; }',
            'assets/example.bin': bytes([0, 255, 1, 128]),
            'CSXS/manifest.xml': b'<ExtensionManifest ExtensionBundleId="com.ethan.editinghub" ExtensionBundleVersion="3.1.2"><ExtensionList><Extension Id="com.ethan.editinghub.panel" Version="3.1.2"/><Extension Id="com.ethan.editinghub.background" Version="3.1.2"/></ExtensionList></ExtensionManifest>',
            'js/app.js': ("var CURRENT_VERSION='3.2.0'; var CURRENT_BUILD='3200'; var CURRENT_RELEASE='Liquid Harmony'; function feed(){var def='https://raw.githubusercontent.com/officiallethan/ethan-editing-hub-updates/refs/heads/main/latest.json'; return def;}").encode(),
            'jsx/backend.jsx': ("var ETHAN_HUB_BUILD='PREMIUM 2.0 • 3.2.0 LIQUID HARMONY'; var ETHAN_UPDATE_VERSION='3.2.0'; var ETHAN_UPDATE_BUILD='3200'; var ETHAN_UPDATE_RELEASE='Liquid Harmony';").encode(),
            'updater/current_release.json': json.dumps(self.metadata).encode(),
        }
        for name, data in files.items():
            path = self.source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)

    def build(self):
        return release.build_package(self.root, self.root / 'dist')

    def test_build_contains_complete_payload_and_propagates_version_without_editing_source(self):
        before = {p.relative_to(self.source): p.read_bytes() for p in self.source.rglob('*') if p.is_file()}
        manifest_path, archive_path = self.build()
        manifest = json.loads(manifest_path.read_text())
        self.assertEqual(manifest['version'], '3.2.1')
        self.assertEqual(manifest['packageUrl'], 'https://github.com/officiallethan/ethan-editing-hub-updates/releases/download/v3.2.1/EthanHub_Update_3.2.1.zip')
        self.assertEqual(manifest['sha256'], hashlib.sha256(archive_path.read_bytes()).hexdigest().upper())
        with zipfile.ZipFile(archive_path) as package:
            prefix = 'payload/com.ethan.editinghub/'
            self.assertEqual(package.read(prefix + 'assets/example.bin'), bytes([0, 255, 1, 128]))
            self.assertEqual(len(package.namelist()), len(before))
            self.assertIn('var CURRENT_VERSION="3.2.1";', package.read(prefix + 'js/app.js').decode())
            self.assertIn('var ETHAN_UPDATE_BUILD="3201";', package.read(prefix + 'jsx/backend.jsx').decode())
            self.assertIn('ExtensionBundleVersion="3.2.1"', package.read(prefix + 'CSXS/manifest.xml').decode())
            self.assertEqual(json.loads(package.read(prefix + 'updater/current_release.json'))['name'], "Ethan's release")
        self.assertEqual(before, {p.relative_to(self.source): p.read_bytes() for p in self.source.rglob('*') if p.is_file()})
        release.verify_package(manifest_path, archive_path)

    def test_repeated_builds_produce_identical_package_bytes(self):
        _, archive = self.build()
        first = archive.read_bytes()
        self.build()
        self.assertEqual(first, archive.read_bytes())

    def test_build_cannot_overwrite_the_live_feed_at_repository_root(self):
        live_feed = self.root / 'latest.json'
        live_feed.write_bytes(b'published feed')
        with self.assertRaises(ValueError):
            release.build_package(self.root, self.root)
        self.assertEqual(live_feed.read_bytes(), b'published feed')

    def test_wrong_identity_and_unsafe_version_are_rejected(self):
        for key, value in [('extensionId', 'unrelated.app'), ('version', '../../evil'), ('version', '3.2.1-beta'), ('build', 'not-a-build')]:
            with self.subTest(key=key, value=value):
                metadata = dict(self.metadata, **{key: value})
                (self.source / 'updater/current_release.json').write_text(json.dumps(metadata))
                with self.assertRaises(ValueError):
                    self.build()

    def test_missing_backend_or_metadata_marker_stops_build(self):
        backend = self.source / 'jsx/backend.jsx'
        backend.write_text('var unrelated = 1;')
        with self.assertRaisesRegex(ValueError, 'ETHAN_'):
            self.build()
        backend.unlink()
        with self.assertRaises(ValueError):
            self.build()

    def test_changed_feed_destination_is_rejected(self):
        app = self.source / 'js/app.js'
        app.write_text(app.read_text().replace('officiallethan/ethan-editing-hub-updates', 'someone/else'))
        with self.assertRaisesRegex(ValueError, 'feed'):
            self.build()

    def test_checksum_corruption_is_rejected(self):
        manifest, archive = self.build()
        archive.write_bytes(archive.read_bytes() + b'corruption')
        with self.assertRaisesRegex(ValueError, 'SHA-256'):
            release.verify_package(manifest, archive)

    def test_other_repository_package_url_is_rejected(self):
        manifest, archive = self.build()
        data = json.loads(manifest.read_text())
        data['packageUrl'] = data['packageUrl'].replace('officiallethan/ethan-editing-hub-updates', 'someone/else')
        manifest.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'packageUrl'):
            release.verify_package(manifest, archive)

    def test_traversal_duplicate_and_missing_payload_are_rejected_even_with_matching_hash(self):
        for bad_name in ['../outside.txt', 'payload/com.ethan.editinghub/../../outside.txt', 'payload\\com.ethan.editinghub\\..\\..\\evil.txt', 'payload/com.ethan.editinghub/INDEX.HTML', None]:
            with self.subTest(bad_name=bad_name):
                manifest, archive = self.build()
                if bad_name is None:
                    with zipfile.ZipFile(archive, 'w') as package:
                        package.writestr('payload/com.ethan.editinghub/index.html', 'incomplete')
                else:
                    with zipfile.ZipFile(archive, 'a') as package:
                        package.writestr(bad_name, 'bad')
                data = json.loads(manifest.read_text())
                data['sha256'] = hashlib.sha256(archive.read_bytes()).hexdigest()
                manifest.write_text(json.dumps(data))
                with self.assertRaises(ValueError):
                    release.verify_package(manifest, archive)

    def test_upgrade_requires_newer_version_and_build(self):
        old = dict(self.metadata, version='3.2.0', build='3200')
        release.validate_upgrade(self.metadata, old)
        for changes in [{'version': '3.2.0'}, {'version': '3.1.9'}, {'build': '3200'}, {'build': '3199'}, {'extensionId': 'another.app'}]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                release.validate_upgrade(dict(self.metadata, **changes), old)
        release.validate_upgrade(dict(self.metadata, version='3.10.0'), dict(old, version='3.9.0'))


if __name__ == '__main__':
    unittest.main()

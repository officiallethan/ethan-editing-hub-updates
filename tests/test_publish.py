import base64
import json
import shutil
import subprocess
import unittest
from pathlib import Path

import test_release
from tools import publish_release as publisher


class FakeGitHub:
    """Replace only remote GitHub IO; builds and local Git checks remain real."""
    def __init__(self, root, output):
        self.root, self.output = root, output
        self.head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
        self.current = {'extensionId': 'com.ethan.editinghub', 'version': '3.2.0', 'build': '3200', 'name': 'Liquid Harmony', 'notes': 'Current release'}
        self.events = []
        self.existing = None
        self.existing_tag = None
        self.corrupt_download = False
        self.advance_after_publish = False

    def api(self, endpoint, *, method='GET', payload=None, allow_missing=False):
        self.events.append((method, endpoint, payload))
        if endpoint.endswith('/git/ref/heads/main'):
            return {'object': {'sha': 'b' * 40 if self.advance_after_publish and ('published',) in self.events else self.head}}
        if '/git/ref/tags/' in endpoint:
            return self.existing_tag
        if endpoint.endswith('/contents/latest.json?ref=main'):
            return {'sha': 'feed-before', 'content': base64.b64encode(json.dumps(self.current).encode()).decode()}
        if '/releases/tags/' in endpoint:
            return self.existing
        if endpoint.endswith('/contents/latest.json') and method == 'PUT':
            return {'commit': {'sha': 'c' * 40}}
        raise AssertionError(f'Unexpected GitHub request: {method} {endpoint}')

    def command(self, arguments):
        if arguments[:2] == ['release', 'create']:
            self.events.append(('draft',))
        elif arguments[:2] == ['release', 'download']:
            destination = Path(arguments[arguments.index('--dir') + 1])
            for name in ['latest.json', 'EthanHub_Update_3.2.1.zip']:
                shutil.copyfile(self.output / name, destination / name)
            if self.corrupt_download:
                (destination / 'EthanHub_Update_3.2.1.zip').write_bytes(b'broken')
            self.events.append(('downloaded',))
        elif arguments[:2] == ['release', 'edit']:
            self.events.append(('published',))
        else:
            raise AssertionError(f'Unexpected GitHub command: {arguments}')


class PublishTests(unittest.TestCase):
    def setUp(self):
        test_release.PackageTests.setUp(self)
        (self.root / '.gitignore').write_text('dist/\n')
        commands = [
            ['init', '-b', 'main'], ['config', 'user.name', 'Test'],
            ['config', 'user.email', 'test@example.invalid'],
            ['remote', 'add', 'origin', 'https://github.com/officiallethan/ethan-editing-hub-updates.git'],
            ['add', '.'], ['commit', '-m', 'Fixture source'],
        ]
        for command in commands:
            subprocess.run(['git', *command], cwd=self.root, check=True, capture_output=True)
        test_release.PackageTests.build(self)
        self.output = self.root / 'dist'
        self.github = FakeGitHub(self.root, self.output)

    def download(self, url, destination):
        shutil.copyfile(self.output / url.rsplit('/', 1)[1], destination)
        self.github.events.append(('public-download',))

    def publish(self, download=None):
        return publisher.publish(self.root, self.output, github=self.github, download=download or self.download)

    def test_feed_is_promoted_only_after_private_and_public_verification_with_compare_and_swap(self):
        result = self.publish()
        writes = [(i, e) for i, e in enumerate(self.github.events) if e[0] == 'PUT']
        self.assertEqual(len(writes), 1)
        index, (_, endpoint, payload) = writes[0]
        self.assertEqual(endpoint, 'repos/officiallethan/ethan-editing-hub-updates/contents/latest.json')
        self.assertLess(self.github.events.index(('published',)), index)
        self.assertLess(self.github.events.index(('public-download',)), index)
        self.assertEqual(payload['sha'], 'feed-before')
        self.assertEqual(payload['branch'], 'main')
        self.assertEqual(base64.b64decode(payload['content']), (self.output / 'latest.json').read_bytes())
        self.assertEqual(result, 'c' * 40)

    def test_other_repository_remote_stops_before_any_remote_calls(self):
        subprocess.run(['git', 'remote', 'set-url', 'origin', 'https://github.com/someone/else.git'], cwd=self.root, check=True)
        with self.assertRaisesRegex(ValueError, 'repository'):
            self.publish()
        self.assertEqual(self.github.events, [])

    def test_dirty_source_and_non_main_branch_cannot_publish(self):
        (self.source / 'index.html').write_text('uncommitted')
        with self.assertRaisesRegex(ValueError, 'clean'):
            self.publish()
        subprocess.run(['git', 'checkout', '--', '.'], cwd=self.root, check=True, capture_output=True)
        subprocess.run(['git', 'switch', '-c', 'feature'], cwd=self.root, check=True, capture_output=True)
        with self.assertRaisesRegex(ValueError, 'main'):
            self.publish()
        self.assertEqual(self.github.events, [])

    def test_existing_release_and_non_upgrade_do_not_create_draft(self):
        self.github.existing = {'tag_name': 'v3.2.1'}
        with self.assertRaisesRegex(ValueError, 'exists'):
            self.publish()
        self.github.existing = None
        self.github.current.update(version='3.2.1', build='3201')
        with self.assertRaises(ValueError):
            self.publish()
        self.assertNotIn(('draft',), self.github.events)

    def test_existing_tag_cannot_publish_a_package_from_different_source(self):
        self.github.existing_tag = {'object': {'sha': 'a' * 40}}
        with self.assertRaisesRegex(ValueError, 'tag'):
            self.publish()
        self.assertNotIn(('draft',), self.github.events)

    def test_ignored_source_file_cannot_be_included_in_a_published_package(self):
        (self.root / '.git/info/exclude').write_text('src/com.ethan.editinghub/assets/private.bin\n')
        (self.source / 'assets/private.bin').write_bytes(b'not in the source commit')
        with self.assertRaisesRegex(ValueError, 'ignored'):
            self.publish()
        self.assertEqual(self.github.events, [])

    def test_corrupt_draft_download_never_publishes_or_updates_feed(self):
        self.github.corrupt_download = True
        with self.assertRaises(ValueError):
            self.publish()
        self.assertNotIn(('published',), self.github.events)
        self.assertFalse(any(e[0] == 'PUT' for e in self.github.events))

    def test_failed_public_verification_leaves_previous_feed_live(self):
        def corrupt(url, destination):
            self.download(url, destination)
            if url.endswith('.zip'):
                Path(destination).write_bytes(b'bad public bytes')
        with self.assertRaises(ValueError):
            self.publish(download=corrupt)
        self.assertIn(('published',), self.github.events)
        self.assertFalse(any(e[0] == 'PUT' for e in self.github.events))

    def test_source_advancing_during_release_stops_feed_promotion(self):
        self.github.advance_after_publish = True
        with self.assertRaisesRegex(ValueError, 'main'):
            self.publish()
        self.assertFalse(any(e[0] == 'PUT' for e in self.github.events))


if __name__ == '__main__':
    unittest.main()

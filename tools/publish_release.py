"""Publish a verified OTA release to the single canonical Ethan Hub repository."""

import argparse
import base64
import json
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

try:
    from .hub_release import REPOSITORY, ROOT, build_package, validate_upgrade, verify_package
except ImportError:
    from hub_release import REPOSITORY, ROOT, build_package, validate_upgrade, verify_package

API = f'repos/{REPOSITORY}'


def run(command, root, input_text=None):
    return subprocess.run(command, cwd=root, input=input_text, text=True, encoding='utf-8',
                          capture_output=True, check=False)


def git(root, *arguments):
    result = run(['git', *arguments], root)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or 'Git command failed')
    return result.stdout.strip()


class GitHub:
    def __init__(self, root):
        self.root = root

    def api(self, endpoint, *, method='GET', payload=None, allow_missing=False):
        if not endpoint.startswith(API + '/'):
            raise ValueError('GitHub writes and reads must target the canonical repository')
        arguments = ['gh', 'api', endpoint, '--method', method]
        if payload is not None:
            arguments += ['--input', '-']
        result = run(arguments, self.root, json.dumps(payload) if payload is not None else None)
        if result.returncode:
            if allow_missing and 'HTTP 404' in result.stderr:
                return None
            raise RuntimeError(result.stderr.strip() or 'GitHub API request failed')
        return json.loads(result.stdout)

    def command(self, arguments):
        result = run(['gh', *arguments, '--repo', REPOSITORY], self.root)
        if result.returncode:
            raise RuntimeError(result.stderr.strip() or 'GitHub release command failed')
        return result.stdout.strip()


def check_checkout(root):
    remote = git(root, 'remote', 'get-url', 'origin')
    allowed = {f'https://github.com/{REPOSITORY}', f'https://github.com/{REPOSITORY}.git', f'git@github.com:{REPOSITORY}.git'}
    if remote not in allowed:
        raise ValueError('origin must be the official Ethan Hub repository')
    if git(root, 'branch', '--show-current') != 'main':
        raise ValueError('Publish only from the main branch')
    if git(root, 'status', '--porcelain'):
        raise ValueError('Publish only from a clean committed checkout')
    if git(root, 'ls-files', '--others', '--ignored', '--exclude-standard', '--', 'src/com.ethan.editinghub'):
        raise ValueError('Remove ignored files from extension source before publishing')
    return git(root, 'rev-parse', 'HEAD')


def download_public(url, destination):
    for attempt in range(6):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'EthanHub-Release-Verification'})
            with urllib.request.urlopen(request, timeout=30) as response, Path(destination).open('wb') as output:
                if not response.url.startswith('https://'):
                    raise ValueError('Release download redirected away from HTTPS')
                shutil.copyfileobj(response, output)
            return
        except (urllib.error.URLError, TimeoutError):
            if attempt == 5:
                raise
            time.sleep(3)


def require_main_sha(github, expected):
    if github.api(API + '/git/ref/heads/main')['object']['sha'] != expected:
        raise ValueError('Remote main has changed; update the checkout before publishing')


def verify_download(directory, local_manifest, local_archive):
    downloaded_manifest = directory / 'latest.json'
    downloaded_archive = directory / local_archive.name
    if downloaded_manifest.read_bytes() != local_manifest.read_bytes():
        raise ValueError('Uploaded release manifest differs from the locally verified manifest')
    verify_package(downloaded_manifest, downloaded_archive)


def publish(root, output, *, github=None, download=None):
    root, output = Path(root), Path(output)
    head = check_checkout(root)
    github = github or GitHub(root)
    download = download or download_public
    require_main_sha(github, head)
    live = github.api(API + '/contents/latest.json?ref=main')
    current = json.loads(base64.b64decode(live['content']))
    manifest_path, archive = build_package(root, output)
    manifest = verify_package(manifest_path, archive)
    validate_upgrade(manifest, current)
    tag = 'v' + manifest['version']
    if github.api(API + '/releases/tags/' + tag, allow_missing=True) is not None:
        raise ValueError(f'Release {tag} already exists; published releases are never overwritten')
    if github.api(API + '/git/ref/tags/' + tag, allow_missing=True) is not None:
        raise ValueError(f'Release tag {tag} already exists; use a new version instead of repurposing a tag')

    # The tag is created by GitHub for this exact source commit, never a moving branch.
    github.command(['release', 'create', tag, str(archive), str(manifest_path),
                    '--target', head, '--draft', '--title', f"{manifest['version']} — {manifest['name']}",
                    '--notes-file', str(output / 'release-notes.md')])
    with tempfile.TemporaryDirectory(prefix='ethan-hub-release-') as temporary:
        directory = Path(temporary)
        github.command(['release', 'download', tag, '--pattern', archive.name,
                        '--pattern', 'latest.json', '--dir', str(directory)])
        verify_download(directory, manifest_path, archive)
        github.command(['release', 'edit', tag, '--draft=false', '--latest'])
        download(manifest['packageUrl'], directory / archive.name)
        download(manifest['packageUrl'].rsplit('/', 1)[0] + '/latest.json', directory / 'latest.json')
        verify_download(directory, manifest_path, archive)

    require_main_sha(github, head)
    # Updating one file by its prior SHA preserves concurrent work and fails on a feed conflict.
    result = github.api(API + '/contents/latest.json', method='PUT', payload={
        'message': f"Publish Ethan Hub {manifest['version']} OTA feed",
        'content': base64.b64encode(manifest_path.read_bytes()).decode('ascii'),
        'sha': live['sha'], 'branch': 'main',
    })
    return result['commit']['sha']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    commit = publish(args.root, args.output or args.root / 'dist')
    print(f'Published and promoted verified OTA release. Feed commit: {commit}')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, RuntimeError) as error:
        raise SystemExit(str(error))

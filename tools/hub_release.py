"""Build and validate complete Ethan Hub OTA packages using Python 3.12+."""

import argparse
import hashlib
import json
import re
import stat
import zipfile
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree

REPOSITORY = 'officiallethan/ethan-editing-hub-updates'
EXTENSION_ID = 'com.ethan.editinghub'
FEED_URL = f'https://raw.githubusercontent.com/{REPOSITORY}/refs/heads/main/latest.json'
PREFIX = f'payload/{EXTENSION_ID}/'
REQUIRED_FILES = {
    'index.html', 'background.html', 'js/app.js', 'jsx/backend.jsx',
    'css/style.css', 'CSXS/manifest.xml', 'updater/current_release.json',
}
METADATA_PATH = 'updater/current_release.json'
ROOT = Path(__file__).resolve().parents[1]


def version_parts(value):
    if not isinstance(value, str) or not re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)', value):
        raise ValueError('version must be a stable major.minor.patch number')
    return tuple(int(part) for part in value.split('.'))


def validate_metadata(metadata):
    if metadata.get('extensionId') != EXTENSION_ID:
        raise ValueError(f'extensionId must be {EXTENSION_ID}')
    version_parts(metadata.get('version'))
    if not isinstance(metadata.get('build'), str) or not re.fullmatch(r'[1-9][0-9]*', metadata['build']):
        raise ValueError('build must be a positive integer encoded as a string')
    for field in ('name', 'notes'):
        if not isinstance(metadata.get(field), str) or not metadata[field].strip():
            raise ValueError(f'{field} must be nonempty text')
    if any(ord(c) < 32 for c in metadata['name']):
        raise ValueError('name must not contain control characters')
    if metadata.get('channel', 'stable') != 'stable':
        raise ValueError('Only the stable release channel is supported')
    return metadata


def validate_upgrade(candidate, current):
    validate_metadata(candidate)
    validate_metadata(current)
    if version_parts(candidate['version']) <= version_parts(current['version']):
        raise ValueError('The release version must be newer than the live OTA version')
    if int(candidate['build']) <= int(current['build']):
        raise ValueError('The release build must be greater than the live OTA build')


def json_bytes(value):
    return (json.dumps(value, indent=2, ensure_ascii=True) + '\n').encode('utf-8')


def stamp_variable(text, variable, value):
    pattern = rf'(\bvar\s+{re.escape(variable)}\s*=\s*)(?:\"(?:\\.|[^\"\\])*\"|\x27(?:\\.|[^\x27\\])*\x27)(\s*;)'
    stamped, count = re.subn(pattern, lambda match: match[1] + json.dumps(value, ensure_ascii=True) + match[2], text)
    if count != 1:
        raise ValueError(f'Expected exactly one {variable} release marker, found {count}')
    return stamped


def stamp_payload(files, metadata):
    app = files['js/app.js'].decode('utf-8-sig')
    if FEED_URL not in app:
        raise ValueError('The client must retain the permanent repository feed URL')
    backend = files['jsx/backend.jsx'].decode('utf-8-sig')
    for variable, field in [('CURRENT_VERSION', 'version'), ('CURRENT_BUILD', 'build'), ('CURRENT_RELEASE', 'name')]:
        app = stamp_variable(app, variable, metadata[field])
    for variable, field in [('ETHAN_UPDATE_VERSION', 'version'), ('ETHAN_UPDATE_BUILD', 'build'), ('ETHAN_UPDATE_RELEASE', 'name')]:
        backend = stamp_variable(backend, variable, metadata[field])
    backend = stamp_variable(backend, 'ETHAN_HUB_BUILD', f"PREMIUM 2.0 • {metadata['version']} {metadata['name'].upper()}")
    xml = files['CSXS/manifest.xml'].decode('utf-8-sig')
    document = ElementTree.fromstring(xml)
    if document.get('ExtensionBundleId') != EXTENSION_ID:
        raise ValueError('CEP manifest belongs to another extension')
    xml, bundle_count = re.subn(r'(\bExtensionBundleVersion=)[\"\x27][^\"\x27]+[\"\x27]', lambda m: m[1] + json.dumps(metadata['version']), xml)
    xml, extension_count = re.subn(r'(<Extension\s+Id=[\"\x27]com\.ethan\.editinghub\.(?:panel|background)[\"\x27]\s+Version=)[\"\x27][^\"\x27]+[\"\x27]', lambda m: m[1] + json.dumps(metadata['version']), xml)
    if bundle_count != 1 or extension_count != 2:
        raise ValueError('CEP manifest must contain the expected bundle, panel and background versions')
    files['js/app.js'] = app.encode('utf-8')
    files['jsx/backend.jsx'] = backend.encode('utf-8')
    files['CSXS/manifest.xml'] = xml.encode('utf-8')
    files[METADATA_PATH] = json_bytes(metadata)
    return files


def read_source(root):
    source = Path(root) / 'src' / EXTENSION_ID
    files = {}
    names = set()
    if source.is_symlink():
        raise ValueError('The source directory must not be a symbolic link')
    for path in sorted(source.rglob('*')):
        if path.is_symlink():
            raise ValueError(f'Symbolic links cannot be packaged: {path.name}')
        if not path.is_file():
            continue
        name = path.relative_to(source).as_posix()
        if name.casefold() in names:
            raise ValueError(f'Case-insensitive source path collision: {name}')
        names.add(name.casefold())
        if any(part in {'.git', '.env', '__pycache__', 'node_modules'} for part in path.relative_to(source).parts):
            raise ValueError(f'Non-release file in extension source: {name}')
        files[name] = path.read_bytes()
    missing = REQUIRED_FILES - files.keys()
    if missing:
        raise ValueError('Incomplete extension source: ' + ', '.join(sorted(missing)))
    return files


def build_package(root, output):
    files = read_source(root)
    metadata = validate_metadata(json.loads(files[METADATA_PATH]))
    files = stamp_payload(files, metadata)
    output = Path(output).resolve()
    source = (Path(root) / 'src').resolve()
    if output == Path(root).resolve():
        raise ValueError('Build output cannot overwrite the live feed at the repository root')
    if output == source or source in output.parents:
        raise ValueError('Build output must be outside the source directory')
    output.mkdir(parents=True, exist_ok=True)
    archive = output / f"EthanHub_Update_{metadata['version']}.zip"
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(PREFIX + name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            package.writestr(info, data, compresslevel=9)
    manifest = {key: metadata[key] for key in ('extensionId', 'version', 'build', 'name', 'notes')}
    manifest.update({
        'sizeLabel': f'{archive.stat().st_size / (1024 * 1024):.2f} MB',
        'packageUrl': f"https://github.com/{REPOSITORY}/releases/download/v{metadata['version']}/{archive.name}",
        'sha256': hashlib.sha256(archive.read_bytes()).hexdigest().upper(),
    })
    manifest_path = output / 'latest.json'
    manifest_path.write_bytes(json_bytes(manifest))
    (output / 'release-notes.md').write_text(
        f"# Ethan's Editing Hub {metadata['version']} — {metadata['name']}\n\n{metadata['notes']}\n\nBuild {metadata['build']}. Complete Windows CEP OTA package.\n", encoding='utf-8', newline='\n')
    verify_package(manifest_path, archive)
    return manifest_path, archive


def read_variable(text, variable):
    match = re.search(rf'\bvar\s+{re.escape(variable)}\s*=\s*(\"(?:\\.|[^\"\\])*\")\s*;', text)
    if not match:
        raise ValueError(f'Missing stamped {variable} metadata')
    return json.loads(match[1])


def verify_package(manifest_path, archive_path):
    manifest = validate_metadata(json.loads(Path(manifest_path).read_text(encoding='utf-8-sig')))
    archive_path = Path(archive_path)
    expected_name = f"EthanHub_Update_{manifest['version']}.zip"
    expected_url = f"https://github.com/{REPOSITORY}/releases/download/v{manifest['version']}/{expected_name}"
    if manifest.get('packageUrl') != expected_url or archive_path.name != expected_name:
        raise ValueError('packageUrl and ZIP filename must point to this repository and release version')
    checksum = manifest.get('sha256', '')
    if not isinstance(checksum, str) or not re.fullmatch(r'[A-Fa-f0-9]{64}', checksum) or hashlib.sha256(archive_path.read_bytes()).hexdigest().upper() != checksum.upper():
        raise ValueError('SHA-256 verification failed')
    with zipfile.ZipFile(archive_path) as package:
        seen = set()
        for entry in package.infolist():
            path = PurePosixPath(entry.filename)
            if not entry.filename.startswith(PREFIX) or '\\' in entry.filename or ':' in entry.filename or '..' in path.parts or path.is_absolute():
                raise ValueError(f'Unsafe or unrelated ZIP path: {entry.filename}')
            if entry.filename.casefold() in seen:
                raise ValueError(f'Duplicate ZIP path: {entry.filename}')
            seen.add(entry.filename.casefold())
            if stat.S_ISLNK(entry.external_attr >> 16):
                raise ValueError('ZIP contains a symbolic link')
        if not {PREFIX + name for name in REQUIRED_FILES}.issubset(package.namelist()):
            raise ValueError('ZIP is missing required extension payload files')
        if package.testzip():
            raise ValueError('ZIP integrity check failed')
        metadata = validate_metadata(json.loads(package.read(PREFIX + METADATA_PATH)))
        for key in ('extensionId', 'version', 'build', 'name', 'notes'):
            if metadata[key] != manifest[key]:
                raise ValueError(f'Payload and feed disagree on {key}')
        xml = ElementTree.fromstring(package.read(PREFIX + 'CSXS/manifest.xml'))
        if xml.get('ExtensionBundleId') != EXTENSION_ID or xml.get('ExtensionBundleVersion') != manifest['version']:
            raise ValueError('CEP bundle metadata disagrees with the release')
        extensions = xml.findall('./ExtensionList/Extension')
        if {item.get('Id') for item in extensions} != {EXTENSION_ID + '.panel', EXTENSION_ID + '.background'} or any(item.get('Version') != manifest['version'] for item in extensions):
            raise ValueError('CEP extension versions disagree with the release')
        for name, mappings in [
            ('js/app.js', [('CURRENT_VERSION', 'version'), ('CURRENT_BUILD', 'build'), ('CURRENT_RELEASE', 'name')]),
            ('jsx/backend.jsx', [('ETHAN_UPDATE_VERSION', 'version'), ('ETHAN_UPDATE_BUILD', 'build'), ('ETHAN_UPDATE_RELEASE', 'name')]),
        ]:
            text = package.read(PREFIX + name).decode('utf-8')
            for variable, key in mappings:
                if read_variable(text, variable) != manifest[key]:
                    raise ValueError(f'{variable} disagrees with the release')
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['build', 'verify'])
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    output = args.output or args.root / 'dist'
    if args.command == 'build':
        manifest, archive = build_package(args.root, output)
    else:
        manifest = output / 'latest.json'
        data = json.loads(manifest.read_text(encoding='utf-8-sig'))
        archive = output / f"EthanHub_Update_{data['version']}.zip"
        verify_package(manifest, archive)
    print(f'Verified {archive.name}\nManifest: {manifest}')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, zipfile.BadZipFile, ElementTree.ParseError) as error:
        raise SystemExit(str(error))

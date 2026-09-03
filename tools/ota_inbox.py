"""Process verified Ethan Hub release requests from the public Dropbox OTA inbox.

Normal operation is fail-closed: a request is downloaded, validated, applied only to
src/com.ethan.editinghub/, tested, committed to main, published through the existing
verified release publisher, and finally marked processed.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath

REPOSITORY = "officiallethan/ethan-editing-hub-updates"
EXTENSION_ID = "com.ethan.editinghub"
REQUEST_RE = re.compile(r"^EHREQ_[A-Za-z0-9._-]+\.json$")
SAFE_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,96}$")
SHA_RE = re.compile(r"^[A-Fa-f0-9]{64}$")
COMMIT_RE = re.compile(r"^[A-Fa-f0-9]{40}$")
VERSION_RE = re.compile(r"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$")
ALLOWED_PREFIX = f"src/{EXTENSION_ID}/"
MAX_OVERLAY_BYTES = 10 * 1024 * 1024
MAX_FILES = 200


def run(command, root: Path, *, check=True):
    result = subprocess.run(command, cwd=root, text=True, encoding="utf-8", capture_output=True)
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or f"Command failed: {command}")
    return result


def git(root: Path, *args):
    return run(["git", *args], root).stdout.strip()


def version_parts(value: str):
    if not isinstance(value, str) or not VERSION_RE.fullmatch(value):
        raise ValueError("version must be stable major.minor.patch")
    return tuple(int(x) for x in value.split("."))


def force_dropbox_download(url: str) -> str:
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or "dropbox.com" not in parsed.netloc.lower():
        raise ValueError("OTA inbox must be an HTTPS Dropbox folder URL")
    query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    query = [(k, v) for k, v in query if k.lower() != "dl"]
    query.append(("dl", "1"))
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urllib.parse.urlencode(query), parsed.fragment))


def read_entry_text(archive: zipfile.ZipFile, basename: str) -> str:
    matches = [i for i in archive.infolist() if PurePosixPath(i.filename).name == basename]
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one inbox file named {basename}; found {len(matches)}")
    return archive.read(matches[0]).decode("utf-8-sig")


def validate_request(request: dict):
    required = {
        "schema", "extensionId", "repository", "requestId", "baseCommit",
        "version", "build", "name", "notes", "overlayEncoding", "overlayParts",
        "overlaySha256", "overlaySize", "createdAt",
    }
    missing = sorted(required - request.keys())
    if missing:
        raise ValueError("Release request missing fields: " + ", ".join(missing))
    if request["schema"] != 1:
        raise ValueError("Unsupported release-request schema")
    if request["extensionId"] != EXTENSION_ID or request["repository"] != REPOSITORY:
        raise ValueError("Release request targets the wrong extension or repository")
    if not SAFE_ID_RE.fullmatch(str(request["requestId"])):
        raise ValueError("requestId contains unsafe characters")
    if not COMMIT_RE.fullmatch(str(request["baseCommit"])):
        raise ValueError("baseCommit must be a full 40-character Git commit SHA")
    version_parts(request["version"])
    if not isinstance(request["build"], str) or not request["build"].isdigit() or int(request["build"]) <= 0:
        raise ValueError("build must be a positive integer encoded as text")
    if not isinstance(request["name"], str) or not request["name"].strip():
        raise ValueError("name must be nonempty")
    if not isinstance(request["notes"], str) or not request["notes"].strip():
        raise ValueError("notes must be nonempty")
    if request["overlayEncoding"] != "base64-parts":
        raise ValueError("overlayEncoding must be base64-parts")
    parts = request["overlayParts"]
    if not isinstance(parts, list) or not parts or len(parts) > 500:
        raise ValueError("overlayParts must contain 1-500 filenames")
    if len(parts) != len(set(parts)):
        raise ValueError("overlayParts contains duplicate filenames")
    prefix = f"EHREQ_{request['requestId']}_P"
    for part in parts:
        if not isinstance(part, str) or not part.startswith(prefix) or not part.endswith(".b64"):
            raise ValueError(f"Unsafe overlay part filename: {part}")
        if PurePosixPath(part).name != part or not SAFE_ID_RE.fullmatch(part[:-4]):
            raise ValueError(f"Unsafe overlay part filename: {part}")
    if not SHA_RE.fullmatch(str(request["overlaySha256"])):
        raise ValueError("overlaySha256 must be 64 hexadecimal characters")
    if not isinstance(request["overlaySize"], int) or request["overlaySize"] <= 0 or request["overlaySize"] > MAX_OVERLAY_BYTES:
        raise ValueError("overlaySize is outside the allowed range")
    if not isinstance(request["createdAt"], str) or len(request["createdAt"]) < 10:
        raise ValueError("createdAt is invalid")
    return request


def validate_overlay_zip(path: Path):
    path = Path(path)
    if path.stat().st_size > MAX_OVERLAY_BYTES:
        raise ValueError("Overlay ZIP is too large")
    with zipfile.ZipFile(path) as archive:
        if len(archive.infolist()) > MAX_FILES:
            raise ValueError("Overlay ZIP contains too many files")
        total = 0
        seen = set()
        for info in archive.infolist():
            name = info.filename
            pp = PurePosixPath(name)
            if info.is_dir():
                continue
            if not name.startswith(ALLOWED_PREFIX) or "\\" in name or ":" in name or pp.is_absolute() or ".." in pp.parts:
                raise ValueError(f"Overlay path is outside the allowed extension source: {name}")
            if name.casefold() in seen:
                raise ValueError(f"Duplicate overlay path: {name}")
            seen.add(name.casefold())
            if stat.S_ISLNK(info.external_attr >> 16):
                raise ValueError("Overlay ZIP cannot contain symbolic links")
            total += info.file_size
            if total > MAX_OVERLAY_BYTES:
                raise ValueError("Overlay uncompressed content is too large")
        if archive.testzip():
            raise ValueError("Overlay ZIP integrity check failed")
    return True


def _manifest_candidates(archive: zipfile.ZipFile):
    by_base = {}
    for info in archive.infolist():
        base = PurePosixPath(info.filename).name
        if REQUEST_RE.fullmatch(base):
            by_base.setdefault(base, []).append(info)
    candidates = []
    for base, infos in by_base.items():
        if len(infos) != 1:
            raise ValueError(f"Duplicate request manifest basename: {base}")
        try:
            request = json.loads(archive.read(infos[0]).decode("utf-8-sig"))
            validate_request(request)
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            raise ValueError(f"Invalid release request manifest {base}: {error}") from error
        candidates.append(request)
    return candidates


def load_request_from_folder_zip(folder_zip: Path, output_dir: Path, *, live_version: str, live_build: str, request_id: str | None = None):
    folder_zip, output_dir = Path(folder_zip), Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(folder_zip) as archive:
        candidates = _manifest_candidates(archive)
        if request_id:
            candidates = [r for r in candidates if r["requestId"] == request_id]
        else:
            candidates = [r for r in candidates if version_parts(r["version"]) > version_parts(live_version) and int(r["build"]) > int(live_build)]
        if not candidates:
            return None, None
        candidates.sort(key=lambda r: (version_parts(r["version"]), int(r["build"]), r["createdAt"]), reverse=True)
        request = candidates[0]
        chunks = []
        for part in request["overlayParts"]:
            text = read_entry_text(archive, part)
            chunks.append(re.sub(r"\s+", "", text))
        encoded = "".join(chunks)
        try:
            raw = base64.b64decode(encoded, validate=True)
        except Exception as error:
            raise ValueError("Overlay Base64 could not be decoded") from error
        if len(raw) != request["overlaySize"]:
            raise ValueError(f"Overlay size mismatch. Expected {request['overlaySize']} Actual {len(raw)}")
        actual = hashlib.sha256(raw).hexdigest().upper()
        if actual != request["overlaySha256"].upper():
            raise ValueError(f"Overlay SHA-256 mismatch. Expected {request['overlaySha256']} Actual {actual}")
        overlay = output_dir / "overlay.zip"
        overlay.write_bytes(raw)
    validate_overlay_zip(overlay)
    return request, overlay


def apply_overlay_zip(overlay: Path, root: Path):
    validate_overlay_zip(overlay)
    root = Path(root).resolve()
    with zipfile.ZipFile(overlay) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            relative = PurePosixPath(info.filename)
            destination = root.joinpath(*relative.parts).resolve()
            if root not in destination.parents:
                raise ValueError(f"Unsafe extracted path: {info.filename}")
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(archive.read(info))


def validate_request_metadata(root: Path, request: dict):
    metadata_path = Path(root) / "src" / EXTENSION_ID / "updater" / "current_release.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8-sig"))
    for key in ("extensionId", "version", "build", "name", "notes"):
        if metadata.get(key) != request.get(key):
            raise ValueError(f"Applied source metadata does not match request field {key}")
    if metadata.get("channel", "stable") != "stable":
        raise ValueError("Only the stable release channel is allowed")
    return metadata


def read_json(path: Path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8-sig"))
    except FileNotFoundError:
        return None


def write_json(path: Path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=True) + "\n", encoding="utf-8", newline="\n")


def check_checkout(root: Path):
    root = Path(root)
    allowed = {f"https://github.com/{REPOSITORY}", f"https://github.com/{REPOSITORY}.git", f"git@github.com:{REPOSITORY}.git"}
    if git(root, "remote", "get-url", "origin") not in allowed:
        raise ValueError("origin is not the canonical Ethan Hub repository")
    if git(root, "branch", "--show-current") != "main":
        raise ValueError("OTA inbox processing is allowed only on main")
    if git(root, "status", "--porcelain"):
        raise ValueError("OTA inbox requires a clean checkout")


def download_folder(url: str, destination: Path):
    request = urllib.request.Request(force_dropbox_download(url), headers={"User-Agent": "EthanHub-OTA-Inbox/1"})
    with urllib.request.urlopen(request, timeout=60) as response, Path(destination).open("wb") as output:
        if not response.url.startswith("https://"):
            raise ValueError("Inbox download redirected away from HTTPS")
        shutil.copyfileobj(response, output)
    if Path(destination).stat().st_size < 50:
        raise ValueError("Inbox folder ZIP download was empty")


def run_validation(root: Path):
    commands = [
        [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"],
        [sys.executable, "tools/hub_release.py", "build"],
        [sys.executable, "tools/hub_release.py", "verify"],
        ["node", "--check", f"src/{EXTENSION_ID}/js/app.js"],
    ]
    for command in commands:
        result = run(command, root, check=False)
        if result.returncode:
            raise RuntimeError((result.stdout + "\n" + result.stderr).strip() or f"Validation failed: {command}")


def commit_and_push(root: Path, message: str, *paths: str):
    git(root, "add", "--", *paths)
    if not git(root, "diff", "--cached", "--name-only"):
        return None
    git(root, "commit", "-m", message)
    commit = git(root, "rev-parse", "HEAD")
    git(root, "push", "origin", "main")
    return commit


def process(root: Path, folder_url: str):
    root = Path(root).resolve()
    check_checkout(root)
    live = read_json(root / "latest.json")
    if not live:
        raise ValueError("Repository latest.json is missing")
    pending_path = root / "ota" / "pending_request.json"
    last_path = root / "ota" / "last_request.json"
    pending = read_json(pending_path)

    # Recovery after a release was published but the final marker commit failed.
    if pending and pending.get("version") == live.get("version") and pending.get("build") == live.get("build"):
        write_json(last_path, pending)
        if pending_path.exists():
            pending_path.unlink()
        commit_and_push(root, f"Finalize OTA inbox request {pending['requestId']}", "ota/last_request.json", "ota/pending_request.json")
        print(f"Request {pending['requestId']} was already live; finalized processing marker.")
        return 0

    with tempfile.TemporaryDirectory(prefix="ethan-ota-inbox-") as temporary:
        temp = Path(temporary)
        folder_zip = temp / "dropbox-folder.zip"
        download_folder(folder_url, folder_zip)
        request_id = pending.get("requestId") if pending else None
        request, overlay = load_request_from_folder_zip(
            folder_zip, temp, live_version=live["version"], live_build=live["build"], request_id=request_id
        )
        if request is None:
            if pending:
                raise ValueError(f"Pending request {pending.get('requestId')} is missing from the Dropbox inbox")
            print("No newer valid Ethan Hub release request is waiting in the inbox.")
            return 0

        last = read_json(last_path)
        if last and last.get("requestId") == request["requestId"]:
            print(f"Request {request['requestId']} is already processed.")
            return 0

        if pending:
            if pending.get("requestId") != request["requestId"]:
                raise ValueError("A different OTA request is already pending; refusing concurrent release")
            validate_request_metadata(root, request)
            run_validation(root)
        else:
            head = git(root, "rev-parse", "HEAD")
            if request["baseCommit"].lower() != head.lower():
                raise ValueError(f"Request baseCommit does not match main. Expected {head} Request {request['baseCommit']}")
            apply_overlay_zip(overlay, root)
            validate_request_metadata(root, request)
            run_validation(root)
            write_json(pending_path, request)
            commit_and_push(
                root,
                f"Stage Ethan Hub {request['version']} from verified OTA inbox",
                f"src/{EXTENSION_ID}", "ota/pending_request.json",
            )
            check_checkout(root)

        # publish_release.py is the only code allowed to promote latest.json.
        result = run([sys.executable, "tools/publish_release.py"], root, check=False)
        if result.returncode:
            raise RuntimeError((result.stdout + "\n" + result.stderr).strip() or "Verified release publication failed")

        # publish_release.py advanced latest.json via the GitHub API. Bring the checkout forward.
        git(root, "pull", "--ff-only", "origin", "main")
        live_after = read_json(root / "latest.json")
        if not live_after or live_after.get("version") != request["version"] or live_after.get("build") != request["build"]:
            raise ValueError("Published feed does not match the processed request")
        write_json(last_path, request)
        if pending_path.exists():
            pending_path.unlink()
        commit_and_push(root, f"Finalize OTA inbox request {request['requestId']}", "ota/last_request.json", "ota/pending_request.json")
        print(f"Published Ethan Hub {request['version']} and finalized request {request['requestId']}.")
        return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    process_parser = sub.add_parser("process")
    process_parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    process_parser.add_argument("--folder-url", required=True)
    args = parser.parse_args()
    if args.command == "process":
        return process(args.root, args.folder_url)
    raise AssertionError("unreachable")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError, RuntimeError, zipfile.BadZipFile) as error:
        raise SystemExit(str(error))

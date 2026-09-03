# Permanent OTA Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install the permanent GitHub client channel plus a fail-closed Dropbox-to-GitHub automated release inbox.

**Architecture:** The Hub reads immutable releases from GitHub. ChatGPT stages only small verified source-overlay request parts in Dropbox; a scheduled GitHub Action reassembles and verifies the overlay, commits source, invokes the existing release publisher, and records processing state for recovery/idempotency.

**Tech Stack:** Adobe CEP JavaScript/ExtendScript, Windows PowerShell 5.1, Python 3.12 stdlib, GitHub Actions, GitHub CLI, Dropbox shared-folder ZIP transport.

**Spec:** `docs/superpowers/specs/2026-09-03-permanent-ota-bootstrap-design.md`

## Global Constraints
- Extension ID remains `com.ethan.editinghub`.
- 3.2.7 is build `3270`, name `Permanent GitHub Channel`.
- Locked Viral Edit behavior is unchanged.
- Root `latest.json` is promoted only by `tools/publish_release.py` after public package verification.
- Heavy update preparation runs outside After Effects.
- Legacy Dropbox client transport remains only for recovery compatibility.

---

### Task 1: GitHub client channel
**Files:** `src/com.ethan.editinghub/js/app.js`, `jsx/backend.jsx`, `updater/background_prepare.ps1`, release metadata/CEP manifest.
- [ ] Add failing contract tests for 3.2.7 markers, canonical GitHub default/migration and direct GitHub release download.
- [ ] Run tests and observe 3.2.6 failure.
- [ ] Update release markers and metadata.
- [ ] Change default feed to canonical GitHub and migrate the known Dropbox feed.
- [ ] Add canonical GitHub manifest/package branch to the detached worker; retain Dropbox fallback.
- [ ] Re-run tests and JS syntax check.

### Task 2: Verified Dropbox request protocol
**Files:** `tools/ota_inbox.py`, `tests/test_ota_inbox.py`.
- [ ] Add tests for request identity, version monotonicity, part reassembly, SHA-256 and safe overlay paths.
- [ ] Implement Base64-part reassembly and exact overlay verification.
- [ ] Restrict overlays to `src/com.ethan.editinghub/` and reject traversal/symlinks/duplicates.
- [ ] Apply overlay and require request/current-release metadata equality.
- [ ] Run repository tests/build/verify before any source push.

### Task 3: Idempotent automated publisher
**Files:** `tools/ota_inbox.py`, `ota/README.md`, `.github/workflows/ota-inbox.yml`.
- [ ] Add `pending_request.json` recovery semantics.
- [ ] Commit/push verified source before invoking existing `publish_release.py`.
- [ ] On success, fast-forward local `latest.json`, verify target version/build, move pending to last marker, and push final marker.
- [ ] Add five-minute scheduled/manual workflow using the stable-release concurrency group and contents write permission.

### Task 4: One-time Windows bootstrap
**Files:** bootstrap CMD/PowerShell plus `repo_patch/` and `hub_overlay/` bundle payloads.
- [ ] Require After Effects closed and use a dedicated LocalAppData repo checkout.
- [ ] Ensure Git/GitHub CLI/Python availability; use browser-based `gh auth login` when needed.
- [ ] Apply the repository patch, run local tests/build/verify, detect concurrent main changes, commit and push.
- [ ] Wait for GitHub validation, run the existing verified publisher for 3.2.7, then pull the promoted feed.
- [ ] Back up the live CEP Hub and install the 3.2.7 overlay; fail closed and restore backup on verification failure.
- [ ] Produce a Desktop report with repo commit, published version and rollback path.

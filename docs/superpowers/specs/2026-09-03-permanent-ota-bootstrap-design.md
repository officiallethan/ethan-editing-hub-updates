# Ethan Hub Permanent OTA Bootstrap Design

## Goal
Make future Ethan's Editing Hub changes publish without manual ZIP handling: ChatGPT prepares a verified small-text release request in the existing public/view-only Dropbox `EthanHub OTA` folder, GitHub Actions consumes it, validates/builds/publishes the immutable release, and the Hub checks the canonical GitHub feed.

## Canonical release system
- Repository: `officiallethan/ethan-editing-hub-updates`
- Extension ID: `com.ethan.editinghub`
- Live client feed: `https://raw.githubusercontent.com/officiallethan/ethan-editing-hub-updates/refs/heads/main/latest.json`
- `tools/publish_release.py` remains the only component allowed to promote root `latest.json`.
- Published versions and release assets are immutable.

## Why the inbox exists
The ChatGPT GitHub integration can read the repository but returns HTTP 403 for content writes. Dropbox text writes work for small payloads, but large inline text can truncate. Therefore future source changes are transported as a small ZIP containing only changed files under `src/com.ethan.editinghub/`, Base64-encoded and split into small uniquely named text parts. No user upload/rename step is required.

## Inbox request protocol
A request uses unique files in the existing Dropbox folder:
- `EHREQ_<requestId>.json`
- `EHREQ_<requestId>_P001.b64`, `P002`, ...

The manifest contains schema, extension/repository identity, request ID, exact base commit, version/build/name/notes, ordered part names, overlay ZIP size, overlay ZIP SHA-256 and creation time.

The GitHub worker rejects requests unless:
- identity matches the canonical repo/extension;
- version/build are newer than the live feed;
- base commit matches `main` for a fresh request;
- all parts exist exactly once;
- Base64 decodes exactly to the declared size/hash;
- every overlay path is under `src/com.ethan.editinghub/`;
- the applied `current_release.json` exactly matches the request metadata;
- repository unit tests, package build, package verification and JS syntax checks pass.

## Recovery and idempotency
`ota/pending_request.json` is committed with applied source before publication. If publication fails, the next scheduled run resumes that same pending request instead of reapplying it. If publication succeeds but the final marker commit fails, the next run detects that the live feed already matches the pending request and finalizes `ota/last_request.json` without republishing.

## Client 3.2.7
Version 3.2.7 / build 3270, `Permanent GitHub Channel`, keeps the 3.2.6 UI polish and locked Viral Edit behavior. Its Software Update default migrates from the Dropbox feed to the canonical GitHub raw `latest.json`. Heavy package download, SHA-256 verification, ZIP safety checks, extraction and staging remain outside After Effects in the detached PowerShell worker. Legacy Dropbox transport remains as recovery compatibility, not the normal path.

## User-visible future flow
1. User asks ChatGPT for a Hub change/fix.
2. ChatGPT reads canonical GitHub source, builds/tests the change, creates a verified overlay ZIP and small Dropbox request parts, verifying each persisted part.
3. The unique request manifest is created last.
4. GitHub Actions checks the inbox on its schedule (about every five minutes), applies the request, runs release gates, publishes and promotes the GitHub feed.
5. User opens AE -> Software Update -> Check for Updates -> Update.
6. Update preparation stays responsive because the heavy work runs outside AE.

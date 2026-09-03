# ChatGPT release inbox protocol

This is the transport used when ChatGPT can read GitHub but cannot write to it directly.

## Producer order (fail closed)
1. Read current `main` and record the full 40-character base commit.
2. Build/test the intended source change locally before staging it.
3. Create an overlay ZIP containing only changed files under `src/com.ethan.editinghub/`.
4. Compute exact overlay byte size and SHA-256.
5. Base64-encode the ZIP and split it into small ASCII parts. **Use about 3,500 characters per part** to stay comfortably below the observed ChatGPT/Dropbox inline-write truncation boundary.
6. Use a unique safe request ID. Create each `EHREQ_<id>_P###.b64` in the existing `/EthanHub OTA` Dropbox folder, then read it back and verify exact persisted content/size before creating the next part.
7. Create `EHREQ_<id>.json` **last**. The manifest is the publication trigger.
8. Never change Dropbox public sharing during a release.

## Request manifest
```json
{
  "schema": 1,
  "extensionId": "com.ethan.editinghub",
  "repository": "officiallethan/ethan-editing-hub-updates",
  "requestId": "3.2.8-3280-example",
  "baseCommit": "40-character-git-sha",
  "version": "3.2.8",
  "build": "3280",
  "name": "Release name",
  "notes": "Release notes",
  "overlayEncoding": "base64-parts",
  "overlayParts": ["EHREQ_3.2.8-3280-example_P001.b64"],
  "overlaySha256": "64-character-SHA256",
  "overlaySize": 12345,
  "createdAt": "RFC3339 timestamp"
}
```

Old request files may remain in Dropbox. The workflow ignores releases that are not newer than the live feed and records processed/pending request IDs in `ota/` for idempotent recovery.

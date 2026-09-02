# Ethan's Editing Hub

The permanent source and over-the-air (OTA) release repository for **Ethan's Editing Hub**, a Windows Adobe After Effects CEP extension.

- **Source:** [`src/com.ethan.editinghub/`](src/com.ethan.editinghub/)
- **Stable update feed:** [`latest.json`](https://raw.githubusercontent.com/officiallethan/ethan-editing-hub-updates/refs/heads/main/latest.json)
- **Release downloads:** [GitHub Releases](https://github.com/officiallethan/ethan-editing-hub-updates/releases)
- **Release instructions:** [`docs/RELEASING.md`](docs/RELEASING.md)

## For Ethan

Future Hub changes belong here. Tell your coding assistant what you want changed; the source, update packaging, and release instructions are now in one repository.

The existing **3.2.0 Liquid Harmony** update and its download link remain intact. The repository setup alone does not install or force a new app update. Existing 3.2.0 clients already use the permanent feed above unless a custom feed was saved in Advanced Update Settings.

In the Hub, open **Software Update → Check for Updates**. When a newer release is available, choose **Install Update**, save your project, and close After Effects when instructed. The existing updater stages a complete package and keeps a local rollback backup.

## Working on the source

The complete source and bundled assets were recovered from the existing published 3.2.0 package. [Source provenance](docs/SOURCE_PROVENANCE.md) records the original checksum and the legacy version-metadata inconsistency.

Use Python 3.12+ for release tools; they require no third-party Python packages. Node.js is used only for JavaScript syntax checks. Build an OTA ZIP locally:

```sh
python -m unittest discover -s tests -v
python tools/hub_release.py build
python tools/hub_release.py verify
```

Generated files appear in `dist/`. Building does not publish anything or edit the app source. Source previews in an ordinary browser cannot execute the After Effects bridge.

## Releasing an update

1. Commit the source changes and updated `src/com.ethan.editinghub/updater/current_release.json` to `main`. Increase both `version` and `build`.
2. Wait for **Validate source and OTA package** to pass. Test the candidate in After Effects as appropriate for the change.
3. Open **Actions → Publish OTA release → Run workflow** on `main`. Leave **publish** off to validate only, or turn it on to publish and update the stable feed.

The release job creates a versioned ZIP, verifies the uploaded and public downloads, and then updates the same permanent `latest.json` URL. The workflow uses this repository's built-in GitHub Actions token; no personal token needs to be saved in the repository.

GitHub login permissions are separate from this repository. A local Codex login does not automatically authenticate a different ChatGPT environment.

## Bundled material

Existing presets, media, legacy scripts, and third-party notices are preserved from the published package. Importing them here does not grant a new license or remove their existing terms.

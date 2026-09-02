# Releasing Ethan's Editing Hub

## Permanent locations

- Repository: `officiallethan/ethan-editing-hub-updates`
- Branch: `main`
- Extension identity: `com.ethan.editinghub`
- Feed: `https://raw.githubusercontent.com/officiallethan/ethan-editing-hub-updates/refs/heads/main/latest.json`
- Future package URL: `https://github.com/officiallethan/ethan-editing-hub-updates/releases/download/vVERSION/EthanHub_Update_VERSION.zip`

The feed URL stays fixed. Each release package has a new immutable versioned URL. The existing 3.2.0 raw ZIP URL remains supported.

## Prepare a new release

Edit source under `src/com.ethan.editinghub/`. Update its `updater/current_release.json` with a new stable `major.minor.patch` version, a larger integer build encoded as a string, a release name, and notes. Keep `extensionId` and the stable channel unchanged.

The packaging tool reads that JSON as the authority. It stamps the staged `CURRENT_*` values in `js/app.js`, `ETHAN_UPDATE_*` / `ETHAN_HUB_BUILD` in `jsx/backend.jsx`, and CEP extension versions in `CSXS/manifest.xml`. It does not edit the source files. Changing the expected marker structure requires a matching update to the tooling and tests.

Run:

```sh
python -m unittest discover -s tests -v
python tools/hub_release.py build
python tools/hub_release.py verify
node --check src/com.ethan.editinghub/js/app.js
```

`dist/` contains the ZIP, candidate `latest.json`, and release notes. It is ignored by Git. Every asset in the extension source is included; repository tools, credentials, and Git history are outside the payload. ZIP ordering and timestamps are deterministic within the same Python/zlib toolchain. Different compression-library versions may produce different bytes, so always use the manifest produced alongside the exact archive being published.

For After Effects validation, save the project first and test the candidate on a backed-up installation. Verify panel startup, displayed version, update checks, the changed feature, and rollback where applicable. Automated checks do not run Adobe After Effects or certify every bundled preset.

## Publish from GitHub

Commit to `main`, wait for the validation workflow, then run **Actions → Publish OTA release** on `main`. The default run only builds and verifies. Select **publish** to promote a release.

The publisher:

1. Requires a clean `main` checkout whose origin is this repository and whose commit equals remote `main`, with no ignored files inside the extension source.
2. Rebuilds from committed source and rejects a version/build that is not newer than the live feed.
3. Rejects existing versions/tags, then creates a draft GitHub Release for the exact source commit, with the complete ZIP and candidate manifest.
4. Downloads and checks draft assets against the local manifest and SHA-256.
5. Publishes the release, then verifies anonymous HTTPS downloads of both assets.
6. Checks that `main` has not moved and updates only root `latest.json`, using its previous Git blob SHA to reject conflicting feed updates.

The workflow is restricted to this repository and `main`, serializes releases, and uses `GITHUB_TOKEN` with `contents: write`. It does not use a personal token or modify other repositories. Regular pushes and pull requests never publish an OTA update automatically.

## Publish from an authenticated local terminal

Use a clean clone on `main`, Python 3.12+, Git, and GitHub CLI available on PATH. Authenticate GitHub CLI through its browser sign-in if necessary. Then run the same tests and:

```sh
python tools/publish_release.py
git pull --ff-only
```

The final pull brings in the feed commit created through GitHub's API. Do not put a token in source code, release notes, or chat messages. GitHub may require separate workflow permission when uploading changes to `.github/workflows/`.

## Failure and recovery

Until the final feed commit succeeds, installed clients keep seeing the previous release. If a failed run left a draft, inspect the cause and remove that failed draft before retrying the same version. Do not delete or replace a published release used by the live feed.

If a release became public but feed promotion failed, inspect and verify its assets and the current feed first. The automatic publisher intentionally refuses to overwrite existing releases. A later release with a new version/build can supersede it. For an urgent app regression, users can use **Restore Previous Version** in the existing Hub updater; publish a corrected release with a higher version for the permanent fix. Downgrading the feed will not automatically downgrade installed clients.

GitHub raw content may be cached briefly. If the public feed looks stale immediately after release, compare the GitHub file first and allow the raw-content cache to refresh.

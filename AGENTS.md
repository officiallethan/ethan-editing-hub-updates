# Ethan's Editing Hub repository

This is the permanent source and OTA release repository for Ethan's Editing Hub:
`officiallethan/ethan-editing-hub-updates`.

- Keep GitHub changes for this project within this repository. Do not modify unrelated repositories.
- The application source is `src/com.ethan.editinghub/`. The extension ID remains `com.ethan.editinghub`.
- The permanent client feed is `https://raw.githubusercontent.com/officiallethan/ethan-editing-hub-updates/refs/heads/main/latest.json`. Preserve compatibility with existing installed clients.
- `src/com.ethan.editinghub/updater/current_release.json` is the canonical metadata for the next source build. Packaging stamps its version, build and name into staged JavaScript, ExtendScript and CEP metadata.
- `latest.json` at the repository root is the LIVE release pointer. Do not advance it until the matching package is uploaded and verified. Use `tools/publish_release.py` for new releases.
- Publish complete extension packages under `payload/com.ethan.editinghub/`, never partial patches. Include SHA-256 in the feed.
- Published version numbers and packages are immutable. New changes require a newer version and build. Preserve the original 3.2.0 ZIP while the legacy feed points to it.
- Do not commit credentials, private account files, updater backups, or generated `dist/` contents.
- Run `python -m unittest discover -s tests -v`, `python tools/hub_release.py build`, and `python tools/hub_release.py verify` before publishing. Check `js/app.js` with `node --check`.
- Explain results in simple language. Distinguish automated packaging checks from an actual After Effects installation test. Do not change editing effects or the locked Viral Edit recipe during release infrastructure work.

See `docs/RELEASING.md` for the release and recovery procedure. These repository instructions guide the work; they do not expand the user's authorization to other projects or grant credentials to a new session.

# Source provenance

The initial `src/com.ethan.editinghub/` tree was imported byte for byte from:

- Repository: `officiallethan/ethan-editing-hub-updates`
- Baseline commit: `e259062` — Set latest release to Liquid Harmony 3.2.0
- Archive: `EthanHub_Update_3.2.0_Liquid_Harmony.zip`
- Archive prefix: `payload/com.ethan.editinghub/`
- SHA-256: `ECB726616B3CD1DD0F0CD195E485C7E727936724B1AF9B59924F58EBA4BEDECE`
- Imported app version/build: `3.2.0` / `3200`

The root `latest.json` and original ZIP are preserved unchanged during repository setup. The baseline GitHub Release retains the original archive bytes and historical manifest, not a repackaged candidate.

The original ZIP has CEP bundle/panel/background versions of `3.1.2`, while the JavaScript updater, ExtendScript backend, and `updater/current_release.json` identify `3.2.0`. This is a pre-existing metadata inconsistency. Release tooling stamps all runtime and CEP version markers from `updater/current_release.json` into the staged package, without editing imported source or overwriting the original release. Therefore a freshly built 3.2.0 candidate has a different hash from the historical ZIP and must not replace it. The first new published version must be greater than 3.2.0, with a build greater than 3200.

The original documentation includes historical release notes and installation references. These are preserved as source history, not a promise that every referenced installer exists in this repository. OTA ZIPs are complete extension payloads for the existing updater, not Adobe-signed ZXP installers.

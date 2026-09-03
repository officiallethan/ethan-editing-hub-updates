# Ethan Hub OTA inbox state

`last_request.json` and `pending_request.json` are machine-managed by `.github/workflows/ota-inbox.yml`.

Release requests themselves live in the existing public/view-only Dropbox `EthanHub OTA` folder as uniquely named `EHREQ_*.json` manifests plus small Base64 parts. The workflow verifies request identity, base commit, version/build monotonicity, overlay SHA-256, safe paths, repository tests, package build/verification, public release download and final feed promotion.

Do not hand-edit the state files during a release.

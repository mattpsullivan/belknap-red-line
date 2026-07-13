---
id: ADR-001
title: "Private Release Distribution (GitHub Releases + Obtainium)"
status: Accepted
date: 2026-06-13
---

# ADR-001: Private Release Distribution (GitHub Releases + Obtainium)

## Context

Belknap Tracker is a Capacitor-wrapped PWA for a personal-scale audience (my
phone, maybe one or two others). There is no plan for a public Play listing.
The native wrapper exists for background GPS while the screen is locked during
hikes. We need a way to get signed APK updates onto the phone(s) without
hand-carrying every build, and without a Google account or store review.

This mirrors the channel chosen for the dont-break-the-chain app
([its ADR-010](../../../dont-break-the-chain-app/docs/adr/010-private-release-distribution.md))
and adopted by workout-tracker, adapted here for Capacitor.

## Decision

Distribute via **GitHub Releases**, built by **GitHub Actions on a version
tag**, consumed by **Obtainium** on each phone.

Deploy becomes: `git tag vX.Y.Z && git push --tags` (or the manual "Run
workflow" button, which works from the GitHub mobile app). CI builds the signed
APK and publishes a Release; the phone gets an update notification.

### Build pipeline (`.github/workflows/release.yml`)

Capacitor-specific shape, since the `android/` project is committed (not
generated per build like Expo):

1. `npm ci`
2. `npm run build` (Vite web bundle)
3. `npx cap sync android` (copy web assets + plugins into the native project)
4. `./gradlew assembleRelease` with the keystore decoded from secrets
5. Publish the APK to a GitHub Release

`versionCode` is the git commit count (always increases, so Android accepts the
in-place update); `versionName` is the tag. Both are injected via env and read
in `android/app/build.gradle`, which falls back to `1` / `"1.0"` locally.

### Signing

`android/app/build.gradle` reads a gitignored `android/keystore.properties`
(template committed) for the `release` signing config; absent it, debug builds
are unaffected and release builds are unsigned. CI writes that file from
secrets at runtime on the ephemeral runner.

**The keystore is the one irreplaceable artifact.** Updates only install over
the existing app if signed with the same key; lose it and the only path is
uninstall + reinstall.

## Status / setup checklist

The pipeline code is in place. Remaining one-time setup (manual - involves
secrets and a remote, intentionally not automated):

- [x] **Add a GitHub remote** _(done 2026-07-12 - amended: created **public**, not private.
      Decision revisited with the meal-planner precedent: the app holds no personal data beyond
      trail redline progress Matt is happy to have public, and a public repo lets Obtainium read
      releases with no per-phone PAT. The PAT step below is therefore dropped.)_
- [x] **Create the release keystore** and back it up in the password manager
      _(done 2026-07-12: `~/keystores/belknap-release.jks`, PKCS12 so store/key password are
      one, backed up in 1Password as "Belknap Tracker - Android release signing key")_:
      `keytool -genkeypair -v -keystore belknap-release.jks -alias belknap \
       -keyalg RSA -keysize 2048 -validity 10000`
      Keep the `.jks` outside the repo.
- [ ] **Add four repo secrets** (Settings -> Secrets and variables -> Actions):
      | Secret | Value |
      |--------|-------|
      | `RELEASE_KEYSTORE_BASE64` | `base64 -w0 belknap-release.jks` |
      | `RELEASE_STORE_PASSWORD`  | keystore password |
      | `RELEASE_KEY_ALIAS`       | `belknap` |
      | `RELEASE_KEY_PASSWORD`    | key password |
- [ ] **Cut a test release**: `git tag v1.0.1 && git push --tags`; confirm the
      APK asset publishes.
- [ ] **Install Obtainium** (no PAT needed - public repo);
      add the repo URL; verify the update notification.

Until then, a locally-built debug APK (`~/belknap-apk/`) covers on-device
testing - see that folder's INSTALL.md.

## Consequences

- Shipping is `git push --tags`; the phone self-updates. No Google account, no
  review, nothing public. Reuses the committed signing config + CI.
- Each phone needs a PAT once. Secrets now live in GitHub Actions; the keystore
  exists base64 in repo secrets (and must be backed up separately).
- Two version sources (tag + commit count) to understand, but neither is
  hand-maintained.

### Risk: Android developer verification

Google's announced sideloading-verification program may eventually gate
self-signed Obtainium installs on certified devices. It does not affect the
pipeline (CI still produces a signed APK + Release); it affects the last-mile
install, in the future. Watch the program; no action needed now.

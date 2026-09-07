# Building installers

End users download the installer from GitHub Releases. These instructions are for maintainers.

The current build produces an Apple Silicon macOS DMG for ChatGPT Desktop `26.901.51231` (build `8109`), with ASAR SHA-256 `64fc2f27d2dddfa968acfacbe5e4e0328071bdc406351ff4a7d18f0b4692c83d`. Windows has no verified target or installer yet. A fixture test of the Windows wrapper is not a Windows acceptance test.

On an Apple Silicon Mac, install that application at `/Applications/ChatGPT.app`, Bun `1.4.2`, Python 3, and Xcode Command Line Tools. Then run:

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
bun install --frozen-lockfile
bun run build:installers
bun run check:installer
bun test
bun run check:structure
```

No API key, `.env` file, or translation generation is needed. The build uses the committed translations and creates its runtime in a temporary directory. It bundles that runtime, the catalogs, a compiled launcher, and icons into a standalone installer. The original application is not included in the DMG.

The installer verifies the installed target, prepares a separate app and runtime, verifies the app signature, then replaces the two destinations with rollback on failure. It preserves existing profile data and `codex-home/config.toml`. Installations are serialized with a lock. An interrupted process can leave a lock or backup requiring manual recovery; the installer does not delete these automatically.

The Hebrew launcher forces Electron and AppKit into RTL before native menus are created. It also disables the copied OpenAI Sparkle updater; compatible Hebrew updates are delivered only through a new version-pinned Codex Hebrew installer.

`install:app` and `update` build and open this same installer. There is no separate source-only installation path.

Build outputs are in `dist/installers/`:

- `Codex-Hebrew-macOS-arm64.dmg`
- `SHA256SUMS`
- `release-manifest.json`, recording the supported target and signing state

The current installer is ad-hoc signed and not notarized. Local signature verification does not prove that a downloaded copy passes Gatekeeper. Verify download and first launch on a clean Mac before calling a release stable. Developer ID signing and notarization require the publisher's Apple credentials.

The acceptance command uses a temporary home and the compiled installer with only system tools on PATH. It checks installation, reinstall, profile and settings preservation, runtime integrity, translated metadata, rejection of an unsupported version, and launcher invocation. It does not open the full GUI or test Apple's download approval flow, because a temporary macOS home has no login Keychain and would show a system prompt. To test a mounted image, pass its installer executable to `scripts/validation/check-installer.mjs`.

For a release, upload only the DMG, checksum file, and release manifest after acceptance passes. Do not upload the build cache, original application, profiles, or local reports. A draft in a private repository is not publicly downloadable.

Windows release work requires the actual supported Windows application and a Windows machine. Review its version-specific bundles, build its own runtime and installer, then verify install, launch, reinstall, shortcuts, and profile preservation there before publishing an EXE.

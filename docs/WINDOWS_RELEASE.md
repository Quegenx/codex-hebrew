# Windows development checkpoint — 2026-09-10

This is a local development snapshot, not a published Windows release.
The application is built from the user's matching local Codex installation.

## Preserved in source

- Windows x64 target validation, ASAR adaptation and the build command.
- Hebrew catalog reuse, RTL styling, renderer reattachment and native menus.
- C# launcher with isolated defaults and optional existing shared-data paths.
- Windows icon artwork, generation, launcher embedding and window integration.
- Existing-shortcut repair that preserves the Codex AppUserModelID.
- Runtime tests, launcher self-check and documented compatibility limits.
- Summary close/reopen controls and matching RTL thread/composer displacement.

See `WINDOWS.md` for the build and verification commands. During development,
only changed runtime files or the launcher may be deployed to the local app.
Every product change must also be saved here and included by the build command.
Commit completed, checked changes locally and refresh the source archive before
calling a checkpoint preserved. Record any manual deployment steps and limits.

## Machine-specific state

`shared-data.json`, login state, conversations, project data and existing Windows
shortcut files are local configuration. They are not release source or defaults
for another computer. Their behavior is supported by the launcher and repair
script; actual paths must be selected for each installation. History cleanup
and removal of the unrelated Codex RTL installation were local maintenance.

## Evidence and remaining release work

The Bun suite passes 66 tests, with one macOS integration test skipped. Structure
validation passes. The previous isolated signed-out runtime proof checked Hebrew,
RTL and reload. Embedded and native-window icons matched the ICO pixels. Shared
profile startup was confirmed by the user. The taskbar shortcut paths and icon
references were repaired and read back; the final taskbar appearance after
restart still needs visual confirmation.

The summary layout update was built through `buildRendererInjection`, deployed
as `hebrew-runtime/renderer.js`, and the runtime manifest and build-report hashes
were refreshed. The launcher and ASAR did not need rebuilding for this renderer
change. An isolated signed-in proof checked wide and narrow layouts, native
close/reopen behavior, focus return and reload; see `reports/WINDOWS_LAYOUT.md`.
Only source and sanitized measurements are included in the source archive.

The local shortcut integration check passed preview-only behavior, identity and
icon preservation, backup integrity, leaving unrelated links untouched, and
idempotence. Run `tests/launch/windows-shortcuts-check.ps1 -TestRoot <new-directory>`
in PowerShell on a machine with an existing `Programs/Codex.lnk`; it only edits
fixtures inside that new directory and does not start an application. Run
`bun run check:structure` and `bun test` from the source root; set
`CODEX_HEBREW_PYTHON` to Python with Pillow when it is not the default Python.

Before a public Windows release, complete a fresh-machine build/install check,
an installer/update/uninstall flow, signed-in workflow testing, and verification
of taskbar appearance and relaunch. The target is pinned to Windows package
26.903.8094.0; later upstream versions require a new compatibility check.
Follow `NOTICE.md` when deciding what to distribute. No release or source changes
have been uploaded to GitHub at this checkpoint.

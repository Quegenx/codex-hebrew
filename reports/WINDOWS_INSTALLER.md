# Windows installer verification — 2026-09-10

The single-file Setup EXE installs the Hebrew adaptation from a matching locally
installed Codex package, without an end-user Git clone, Bun or compiler.

## Built artifact

- Windows x64 package: `26.903.8094.0`; application version: `26.903.61454`.
- Installer: `Codex-Hebrew-Setup-26.903.8094.0.exe`, 1,549,312 bytes, unsigned.
- Installer SHA-256: `17930f30fbde13ebc292049a5ccbe9a135f6188996d7bde5ac826a450ae256e1`.
- Original ASAR SHA-256: `3b8e61c9b7afefeda3166f251270724a138af15eb947b7c3907691a695bce66c`.
- Installed ASAR SHA-256: `0e7d60a22e261c8acd3de8da88bd9d0a7a917b0c1088892d7eebb7a554047651`.
- Runtime SHA-256: `696189b67ba49e3e301e6b65d6207555fbe161bcb142d022292e4f7a381b2669`.
- ASAR patch: 47,572 bytes, 13 operations, including 7 native compressed chunks.
- Build tools: Bun 1.4.2, installed .NET Framework C# compiler and Windows MSDelta.

The payload contains an explicit allowlist of launcher, uninstaller, runtime,
licenses/instructions and a source-bound ASAR delta. It contains no private
profile, conversations, tokens or complete original application binaries.
The final build includes upstream main `1feb70b`, including PR #1's platform
compatibility fixes; its Windows runtime and acceptance checks were repeated.

## Checks performed

1. `bun run build:windows-installer <original-exe> <new-setup-exe>` rebuilt the
   Windows wrapper and verified reconstruction of the exact patched ASAR.
2. `scripts/validation/check-windows-installer.ps1 -Setup <exe> -SourceExecutable
   <original-exe> -TestRoot <new-fixture>` passed fresh installation from the
   finished EXE, every embedded file checksum and the final ASAR checksum.
3. Re-running that EXE updated the fixture and preserved shared-data settings
   verbatim and an external conversation sentinel. No recovery backup remained.
4. An unsupported source was rejected before creating its destination. The
   matching original ASAR remained unchanged after all installation checks.
5. The installed launcher factory started the installed application using only
   fixture profile/data paths. `scripts/validation/check-windows-runtime.mjs`
   passed Hebrew text, `lang=he`, `dir=rtl`, attached translation/direction,
   mixed-content preservation, LTR code and reattachment after reload.
   This was a signed-out session; no login or model request was performed.
6. The actual Setup form was rendered offscreen from the finished assembly and
   inspected. Its controls were visible, RTL layout was enabled and automatic
   detection found the matching installed Codex executable. This did not click
   the Install button or modify the user's desktop/Start menu.
7. `bun test`: 68 passed, 1 macOS integration test skipped, 0 failed, 312
   assertions. Native installer checks cover delta corruption, ASAR boundaries,
   source guards, destination overlap, nested-profile rejection, rollback,
   recovery backups, ZIP traversal, fixture shortcuts and managed removal while
   preserving an external profile sentinel.
8. `bun run check:structure`: passed; 102 maintained source files, largest file
   214/300 lines. C# and PowerShell are included. `git diff --check`: passed.

Both the real copied application's deep dependency tree and an over-300-character
fixture were checked with machine `LongPathsEnabled=0`. Setup uses per-process
.NET switches and extended paths; the machine policy was not changed.

## Limits

This local installer is unsigned and pinned to one Windows x64 source hash. Setup
requires the supported original Codex installation. A new upstream version needs
a newly verified build. The binary is not included in Git or a public release.

Fresh-machine installation, SmartScreen behavior, a real interactive
install/update/uninstall cycle with Windows registry and shell integration,
taskbar appearance after relaunch and broad signed-in workflows remain unchecked.
Shortcut creation and managed removal were tested on isolated fixtures; the
acceptance mode intentionally skipped global shortcut/registry changes.

Detailed local acceptance reports and images are retained outside the source
tree. User profiles and machine-specific paths are excluded from this report.

# PR #2 integration review — 2026-09-10

Reviewed https://github.com/Quegenx/codex-hebrew/pull/2 at
`051bca6b94d7247c45a67208cdc4a69246b430ab`, against main
`1feb70be13c59b7871d9bfd2bd3479371bb523b5`.

No merge-blocking issue was identified in the reviewed source. This is a source
review and Mac regression check, not fresh interactive Windows acceptance.
The only installer code adjustment made during review removes the word
`preview` from its Installed apps version label; installation logic is unchanged.

## Scope and trust boundaries

The diff adds a Windows-only build entry point and native C# setup/removal code.
It does not change `runtime/`, `ui/`, the Mac build/installation modules, committed
translation catalogs, or `bun.lock`. The shared structure check now also counts
C# and PowerShell files. Both Windows build entry points reject non-Windows hosts.

Manual review traced these boundaries and callers:

- `CheckSource` checks the selected original ASAR before destination changes,
  after copying, and before committing. The original app is read and copied.
- `ExtractPayload` checks payload names and file hashes inside a fresh stage.
  The delta and reconstructed ASAR are hash-checked, and `VerifyRuntime` checks
  the runtime manifest and contents. These are integrity checks, not a digital
  signature on the unsigned Setup EXE.
- `CheckDestination`, `RequireReceipt`, `NoLinks`, and `CheckTree` reject
  overlapping source/destination paths, unmanaged existing destinations,
  declared profile paths inside the app tree, and linked installation content.
- `CommitStage` stages replacement, retains a previous copy for rollback, and
  refuses to overwrite a retained recovery backup. Updates copy existing
  `shared-data.json` unchanged and preserve the existing isolated/shared choice.
- `RemoveApplication` checks the managed root before removal. Shared and default
  isolated data live outside that tree. Shortcut and registry removal check the
  target path before deleting their entries.

These statements describe code paths inspected, not Windows behavior independently
observed on this Mac. Native MSDelta, COM shortcuts, registry operations, and the
Windows uninstaller were not executed here. The contributor's Windows checks
and limits are recorded in [WINDOWS_INSTALLER.md](WINDOWS_INSTALLER.md).

## Local validation

Isolated checkout: `/private/tmp/codex-hebrew-pr2-test`.
Host: macOS arm64; Bun `1.4.2`, Python `3.14.7`.
Target: ChatGPT `26.901.51231`, build `8109`.
ASAR SHA-256: `64fc2f27d2dddfa968acfacbe5e4e0328071bdc406351ff4a7d18f0b4692c83d`.
Executable SHA-256: `e5a0c5166eaf20d35a0bb6ccb14ec5aec2595ea14eb98e5f8d6e74bb7a70f749`.

- `bun install --frozen-lockfile --ignore-scripts`: passed.
- `bun test`: 66 passed, three Windows-only tests skipped, zero failed.
- `bun run check:structure`: passed; 102 maintained source files, largest 214 lines.
- `git diff --check`: passed.
- `bun run target:status`: confirmed the target above.
- `bun run build:installers`: built the Mac DMG successfully.
- `bun run check:installer`: passed installation, signature/runtime integrity,
  metadata, reinstall, profile/settings preservation, unsupported-version
  rejection, original-app preservation, and launcher invocation in a temporary home.
- `shasum -a 256 -c SHA256SUMS` in the checkout's `dist/installers/`: passed.
- `codesign --verify --deep --strict 'Install Codex Hebrew.app'`: passed.

No installed user application, profile, or published release was replaced during
these checks. The Windows EXE must be rebuilt on Windows to include the label
adjustment; this Mac has no native Windows compiler/runtime. Full Mac GUI
journeys, Windows interactive installation/removal, SmartScreen, and final
Windows taskbar behavior remain outside this local validation.

# Windows support

This port targets Windows x64 Codex package `26.903.8094.0`, whose ASAR reports
application version `26.903.61454`.
`config/windows-target.json` pins the original ASAR hash and verified React/Radix
exports. Other versions fail before copying the application.

## Build

Install Bun 1.4.2, then run from the repository root:

```powershell
bun install --frozen-lockfile --ignore-scripts
$package = Get-AppxPackage OpenAI.Codex
$application = Join-Path $package.InstallLocation 'app\ChatGPT.exe'
bun run build:windows-wrapper $application 'C:\path\to\new\Codex-Hebrew'
```

The output must not exist. Building uses Windows Robocopy and the .NET Framework
C# compiler already present on the tested machine. The source application and
committed translation catalogs are preserved. Building does not call a model or
translation API. No Bun installation is needed to run the finished application.

Start `Codex Hebrew.exe` in the output directory. Keep its `app` subdirectory
beside it. The launcher supplies a separate profile and Codex configuration under
`%LOCALAPPDATA%\Codex Hebrew\`. It preserves existing files in that directory.
Sign in manually on first use. Build a new output for each supported upgrade.
For installation without Git or Bun, build the single-file Windows Setup EXE;
see [WINDOWS_INSTALLER.md](WINDOWS_INSTALLER.md). It supports installation,
manual updates and removal of the managed application.

## Use an existing local Codex data store

For an explicitly requested migration, place `shared-data.json` beside
`Codex Hebrew.exe`, with absolute paths to the existing `codexHome` and
`userDataPath`. For the standard Windows installation these are
`%USERPROFILE%\.codex` and `%APPDATA%\Codex`; expand environment variables
to actual paths in the JSON. Verify the original application's paths first.
Both directories must already exist; invalid configuration stops launch.

This uses the original history databases, sessions, projects, configuration,
plugins and account state directly. It performs no copying or synchronization.
The original Electron profile is shared as well, so its native Windows
single-instance lock permits only one desktop instance using this profile.
Quit the original app fully before opening the Hebrew launcher. If the original
is still running, launching Hebrew activates that existing instance.
Use matching backend versions. Back up an existing isolated profile and check
for unique or newer conversations before switching it to shared data.

The local migration verified identical backend SHA-256 hashes and no unique or
newer conversations in the isolated copy. That copy was moved into a task-local
backup. The observed original profile was under `Codex/web/Codex` in roaming
AppData, rather than the standard default. With this exact profile configured,
launching Hebrew while the original was open exited the new instance and left
the original running. The user subsequently confirmed using the Hebrew app;
its running executable and shared profile path were verified locally.

`tests/launch/windows-launcher-check.cs` is a separate local C# self-check:
compile it together with `scripts/launch/windows-launcher.cs` using the .NET
Framework compiler, `/main:WindowsLauncherChecks`, and references to
`System.Windows.Forms.dll` and `System.Web.Extensions.dll`. Pass a new task-local
directory to the check executable. It verifies shared paths, paths with spaces,
isolated defaults, child-only environment settings, and rejection of missing or
relative paths. It starts no application. This check and the existing Bun suite
passed for the shared-data change.

## Windows application icon

`assets/icons/codex-hebrew.ico` is derived from the existing `chatgpt-il.png`
artwork and contains 16, 20, 24, 32, 40, 48, 64, 128 and 256 pixel images.
The Windows build embeds it in `Codex Hebrew.exe` and supplies it to the main
application windows. Regenerate it with Python and Pillow if the artwork changes:

```powershell
python scripts/build/prepare-application-icon.py assets/icons/chatgpt-il.png assets/icons/codex-hebrew.ico
```

Point shortcuts at `Codex Hebrew.exe`, with that executable as their icon source.
Restart the application after replacing runtime files. The current Owl runtime
does not expose Electron's `BrowserWindow.setAppDetails`; that optional API is
guarded so icon installation cannot prevent startup. Taskbar pin relaunch details
are therefore not overridden on Owl. The existing application ID is preserved.

The build also includes `repair-windows-shortcuts.ps1`. To repair existing
shortcuts after moving from the old Codex RTL installation or launching the
copied executable directly, run from the built application directory:

```powershell
.\repair-windows-shortcuts.ps1 -ApplicationRoot . -WhatIf
.\repair-windows-shortcuts.ps1 -ApplicationRoot .
```

It only updates existing shortcuts with the Codex application ID and a target
in this application or the known old Codex RTL path. It preserves the ID, saves
the old shortcuts under `shortcut-backups`, and leaves unrelated shortcuts
unchanged. Repeating it makes no further changes. This is a repair utility;
the EXE installer creates new desktop and Start menu shortcuts. Taskbar pinning
is left to the user.

Local verification extracted the launcher's embedded icon and the running
window's native icon, then compared them with the ICO artwork. Hebrew and RTL
reattached after startup reload in a separate signed-out profile. The current
suite passed 68 tests, with one macOS integration test skipped.

## Conversation width and summary controls

The header's `פלטים ומקורות` button opens and closes the existing summary panel.
The panel also has an accessible close button. Closing releases the space
reserved by Codex and restores keyboard focus to the header button. The native
pin preference is retained, including across reloads; there is no separate
Hebrew preference or copy of the summary data.

At intermediate widths, the thread and composer move right to make room for
the summary on the left. In a narrow window, the native popover opens on demand
without reserving a column. `ui/summary-panel.js` and `ui/rtl.css` are included
automatically by `build:windows-wrapper`. See `reports/WINDOWS_LAYOUT.md` for
the scoped signed-in verification and its limits.

## Compatibility

Translations are reused only when both the descriptor ID and English source
match. This build reused 30,949 of 31,564 scanned descriptors; 615 new, changed or
untranslated descriptors keep their upstream English text. The scanner also
reports 19 unresolved descriptors. These counts are not complete UI coverage.
The renderer receives 30,832 translations; 187 native menu IDs are translated.
macOS-specific hardcoded labels, marketplace source rewrites and bundled skill
metadata are not ported. The original translation wording remains unchanged.

The Windows renderer checks for later IntlProvider replacement: asynchronous
locale-resource loading otherwise discards the initial Hebrew catalog. The build
records its platform in the renderer options. Provider polling and summary
controls/styles are enabled only for Windows; macOS stops provider discovery
after attachment and keeps its existing summary layout. No user message text
is translated or reordered.

## Verification performed

On Windows, `bun test` passed 68 tests and skipped the integration test requiring
the macOS installation. `bun run check:structure` passed. The icon test used the
bundled Python with Pillow via `CODEX_HEBREW_PYTHON`.

An isolated signed-out application was launched with a temporary verification
profile and loopback-only debugging port. `scripts/validation/check-windows-runtime.mjs`
verified Hebrew sign-in text, `lang=he`, document RTL, the actual Radix direction
context, preserved synthetic mixed-direction content, LTR code, and reattachment
after reload. The script saves a screenshot for visual inspection. It never
submits a message, signs in, or calls a model. The normal launcher has no debugging
port. A later signed-in check covered summary controls, conversation layout and
reload, as recorded in `reports/WINDOWS_LAYOUT.md`. Broader signed-in workflows,
plugins, native window interactions and settings pages remain unverified.
macOS runtime regression testing was not run.

The application copy is for use with the user's locally installed software.
Share the source changes, not the copied proprietary application files; see
`NOTICE.md` for the repository's licensing scope.

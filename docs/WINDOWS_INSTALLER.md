# Windows EXE installer

`Codex-Hebrew-Setup-26.903.8094.0.exe` is a single-file, per-user installer for
the matching Windows x64 Codex installation. End users need no Git clone, Bun,
compiler or command-line steps. The installer currently has no digital signature.
It uses .NET Framework 4.8 and built-in Windows components. Deep bundled dependency
paths are handled without enabling the machine-wide long-path policy.

## Install

1. Install the supported original Codex package `26.903.8094.0` first.
2. Open the Setup EXE. It detects Codex automatically; use the file picker if
   detection fails. Its exact ASAR hash must match `config/windows-target.json`.
3. Choose whether to use the original conversations and projects directly, then
   click **התקנה**. Sharing is offered only when the existing data paths are found.
4. Open **Codex Hebrew** from the desktop or Start menu. When sharing data, quit
   the original Codex first so its profile lock can be acquired.

The destination is `%LOCALAPPDATA%\Programs\Codex Hebrew`. The original
application is read during installation and remains in its original directory.
The standalone Hebrew launcher defaults to separate data under
`%LOCALAPPDATA%\Codex Hebrew`; shared-data settings reference the original paths
without copying them. Setup does not bundle login state or conversations.

## Update and removal

Run a compatible Setup EXE again after closing the installed Hebrew application.
Updates preserve whether the existing installation uses shared or isolated data.
An unrecognized destination, linked path, incompatible source, active Hebrew app
or retained recovery backup stops installation. Files are staged beside the
destination and verified before replacing the previous installation. A failed
commit restores the previous application. A retained `.previous` backup is left
available for recovery if cleanup cannot complete.

Remove **Codex Hebrew** through Windows Installed apps or run its `Uninstall.exe`.
The uninstaller removes the managed application, its own shortcuts and its
registration. Conversation/profile directories are preserved. It runs a small
temporary worker outside the installation directory so Windows can remove the
installed executable; that worker remains eligible for normal Windows Temp cleanup.

## Build from maintained source

On Windows x64 with Bun 1.4.2 and the source dependencies installed:

```powershell
$package = Get-AppxPackage OpenAI.Codex
$application = Join-Path $package.InstallLocation 'app\ChatGPT.exe'
bun run build:windows-installer $application 'C:\output\Codex-Hebrew-Setup-26.903.8094.0.exe'
```

Choose a new output filename. The command runs `build:windows-wrapper`, creates
and verifies a native Windows delta, builds the launcher/uninstaller/setup with
the Windows .NET Framework compiler, and embeds a compressed payload in the EXE.
It records checksums in the adjacent `.exe.json` report and cleans its temporary
application copies. It makes no model/API calls and needs no additional runtime
download when the finished installer runs.

The ASAR delta copies unchanged source ranges and applies native MSDelta only to
changed chunks. The payload uses an explicit file allowlist: Hebrew runtime, launcher, uninstaller,
notices, instructions and a source-bound ASAR delta. The original application
binaries are copied from the matching local installation. SHA-256 checks cover
the original ASAR, delta, payload files, runtime and reconstructed ASAR.

Native delta declarations follow Microsoft's
[CreateDeltaB](https://learn.microsoft.com/en-us/windows/win32/devnotes/msdelta-createdeltab)
and [ApplyDeltaB](https://learn.microsoft.com/en-us/windows/win32/devnotes/msdelta-applydeltab)
contracts. This uses Windows components already present on the tested machine.

## Verification commands

`bun test` compiles and runs the Windows installer checks on Windows. They cover
delta roundtrip/corruption, source/version guards, destination boundaries,
profile preservation, commit rollback, retained recovery backups, ZIP traversal
and fixture shortcuts. `bun run check:structure` includes C# and PowerShell files.

The EXE also supports bounded acceptance checks:

```powershell
Start-Process -Wait -WindowStyle Hidden -FilePath '.\Codex-Hebrew-Setup-26.903.8094.0.exe' -ArgumentList '--describe', 'C:\test\payload.json'
```

`--install-test <original-exe> <destination> <report.json>` installs or updates a
destination named `codex-hebrew-test-*`, performs all application checks and
writes a result report. It skips global shortcuts/registration and never starts
Codex. Put the fixture under a task-local directory and quote paths with spaces.

Run `scripts/validation/check-windows-installer.ps1 -Setup <exe> -SourceExecutable
<original-exe> -TestRoot <new-directory>` for installation, update, preservation
and source-mismatch acceptance checks in an isolated fixture.

See `reports/WINDOWS_INSTALLER.md` in the source repository for the checks actually performed and remaining
release limits. Follow `NOTICE.md` for the distribution scope.

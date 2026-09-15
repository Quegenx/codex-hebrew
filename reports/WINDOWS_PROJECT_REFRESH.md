# Windows project refresh — 2026-09-15

Target: Windows x64 package `26.903.8094.0`, application `26.903.61454`.
Original ASAR SHA-256:
`3b8e61c9b7afefeda3166f251270724a138af15eb947b7c3907691a695bce66c`.

## Cause and correction

Creating a project persisted it, but the Hebrew window missed the notification
that invalidates the sidebar's cached project list. Restarting loaded the saved
project, explaining the reported behavior.

The main-process adapter subclassed the native `BrowserWindow`. In this Owl
build, `BaseWindow.getAllWindows()` included that instance, while the original
`BrowserWindow.getAllWindows()` returned an empty list. A separate native window
was included. The application's window manager uses `BrowserWindow.getAllWindows()`
to deliver `global-state-updated` and `workspace-root-options-updated` broadcasts.

The adapter now intercepts construction with a Proxy and decorates an original
native instance. Its constructor identity and native registry membership are
preserved. Hebrew injection, startup visibility, the one-time startup reload,
the Windows icon and relaunch details retain their existing behavior.
`build:windows-wrapper` already copies this maintained main-process adapter.

## Verification

- Bun `1.4.2`: `bun test tests/runtime/electron-main.test.mjs` initially failed
  the native-identity regression assertions with the subclass implementation;
  all nine tests passed after the fix.
- `bun test`: 69 passed, one existing macOS integration test skipped, zero
  failures; 318 assertions. `CODEX_HEBREW_PYTHON` selected Python with Pillow.
- `bun run check:structure`: passed; 102 maintained source files, largest
  214/300 lines.
- A task-local installation ran with a separate Chromium profile and Codex home.
  The documents directory was redirected inside the task before project creation.
  Node Inspector and Chromium debugging listened on loopback only.
- After restarting that isolated process with the corrected maintained adapter,
  the native registry included the Hebrew window. Its native constructor,
  `fromId` and `fromWebContents` lookups were preserved. The window was visible,
  and the renderer reported `lang=he` and `dir=rtl`.
- Calling the application's existing `projects.createLocal` RPC with empty
  sources and Git initialization disabled created a real scratch project folder.
  Both project-change messages reached the renderer through the application's
  original IPC channel. The global-state update included `local-projects`,
  `project-order`, `project-appearances` and `selected-project`. No window
  navigation or reload occurred during creation.

Local diagnostic scripts and raw evidence are under the task's
`work/sidebar-proof/`, outside the release source archive. No account login,
model request or user project modification was needed for this proof. This
verifies native identity and the actual local creation/notification path; the
signed-in sidebar's visual behavior and macOS runtime were not exercised.

The local installed `hebrew-runtime/main.cjs` was updated from maintained source,
with a small backup and refreshed runtime manifest/build-report hashes. The ASAR,
renderer, launcher and shared-data settings were preserved. A running main
process retains its loaded code: one full exit and relaunch activates the fix.
The previously published installer has not been rebuilt with this change.

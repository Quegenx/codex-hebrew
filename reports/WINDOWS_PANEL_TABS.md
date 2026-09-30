# Windows panel tab close controls — 2026-09-30

Target: Windows x64 package `26.903.8094.0`, application `26.903.61454`.
Original source ASAR SHA-256:
`3b8e61c9b7afefeda3166f251270724a138af15eb947b7c3907691a695bce66c`.

## Finding and change

The user reported missing close controls with multiple source/output tabs in
the side panel. The native tab variants position their close control over the
label and conditionally hide narrow or inactive controls through visibility,
opacity and pointer-event rules. An isolated rendering of the actual side-panel
tab components reproduced hidden inactive close controls.

The Windows RTL adapter now marks its platform and gives native panel close
buttons a permanent, non-shrinking flex slot. Labels shrink in the remaining
space, and the previous padding for an overlaid button is removed. Rules are
scoped to native tab controllers. The original close, selection and keyboard
handlers remain unchanged; unrelated buttons and other platforms retain their
existing styles. Stopping the adapter restores its platform marker and styles.

Maintained changes are in `ui/rtl-adapter.js` and `ui/rtl.css`, consumed by
`buildRendererInjection` and `build:windows-wrapper`. This tab fix requires no
additional native ASAR patch or translation changes.

## Verification

- The regression test failed with the original hidden control and passed after
  the change. It also checks restoration, unrelated buttons and platform scope.
- Bun `1.4.2`: `bun test` passed 72 tests, with one existing macOS integration
  skip, zero failures and 349 assertions. `CODEX_HEBREW_PYTHON` selected Python
  with Pillow. `bun run check:structure` and `git diff --check` passed; the largest
  maintained source file is `ui/rtl.css`, 238/300 lines.
- An isolated Windows app with an empty profile rendered the actual native
  tab strip, tab container, both tab appearances and native keyboard handler,
  with synthetic tab data and local callbacks. Diagnostic exports existed only
  in the separate test archive. The exact production renderer was injected.
- Six scenarios covered panel widths 320, 460, 640 and 760 CSS pixels and one
  through seven tabs, with long Hebrew and English titles, at Windows scaling
  of 150%. All 22 checked tabs retained visible 20-pixel close controls inside
  their own bounds, separate from their title buttons. Every close control
  passed center-point hit testing after scrolling its tab into view.
- Closing an inactive tab preserved the active tab; closing the active tab
  selected the remaining tab. The native Delete-key handler closed the last
  test tab. A screenshot of three compact tabs was visually inspected.

Raw measurements, screenshots and diagnostic runners are task-local under
`work/panel-tabs-proof/`, outside release source. This proves rendering and
handler wiring with synthetic tabs; a signed-in source/output workflow,
drag-and-drop and macOS were not exercised.

## Local deployment

The updated renderer, matching runtime manifest and build report were installed
and their SHA-256 hashes verified. Previous files were backed up; shared profile
settings and conversation data were preserved. The running main process caches
the renderer at startup, so one full exit and relaunch activates this change.

The prior pet update had not activated locally. Its already-verified ASAR is
queued separately for replacement after full exit, together with matching
metadata. The installed tab fix does not depend on that queued archive update.
The published revision-2 installer predates this tab change.

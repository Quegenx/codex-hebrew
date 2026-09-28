# Windows pet voice presentation — 2026-09-28

Target: Windows x64 package `26.903.8094.0`, application `26.903.61454`.
Original source ASAR SHA-256:
`3b8e61c9b7afefeda3166f251270724a138af15eb947b7c3907691a695bce66c`.

## Changes

The native overlay switches from the selected pet to a voice orb when audio is
ready. The Windows build now retains the selected pet in that presentation state.
The orb's visual container is hidden and excluded from accessibility, while its
anchor remains mounted for native handoff and caption geometry. Voice state,
microphone/output mute, stop and notification handlers remain the original code.
The guarded asset patch refuses a changed or ambiguous native overlay bundle.

The overlay combines inline physical `left` positions with CSS centering and
notification controls. Mirroring CSS displacement while keeping those inline
positions caused the stop control and notification badge to overlap. The native
overlay route now uses the original linked stylesheets and an LTR coordinate
container. Hebrew activity text and captions use their own text direction;
menus remain RTL. Other windows retain normal stylesheet conversion.

These changes are maintained in `scripts/rtl/pet-voice-presentation.mjs`, the
renderer adapter and `build:windows-wrapper`. The selected pet source and its
animation implementation are unchanged. The source branch retains the earlier
native-window identity fix from PR #3.

## Verification

- Bun `1.4.2`, `bun test`: 71 passed, one existing macOS integration test skipped,
  zero failures, 341 assertions. `CODEX_HEBREW_PYTHON` selected Python with Pillow.
- `bun run check:structure`: passed; 104 maintained source files, largest
  214/300 lines. `git diff --check` passed.
- Tests cover pet visibility in voice/normal/hidden states, unchanged voice
  controls/anchor, refusal of unknown bundles, original and lazy stylesheets in
  the native overlay, Hebrew label direction, cleanup and normal-window styling.
- An isolated Windows app with empty account data rendered the actual native
  pet/notification components with synthetic local voice-state props. Diagnostic
  exports were added only to the separate test archive. No microphone access,
  live voice call or model request was used.
- Enabling the old converted styles in that renderer reproduced an intersection
  between `mascot-badge` and `voice-controls`. Restoring physical styles removed it.
- Eight scenarios covered active, inactive, starting and stopping voice states;
  pet widths 80, 144 and 224 pixels; zero or three notifications; and top-end and
  bottom-start placement. The pet stayed visible and the orb stayed hidden. All
  visible controls and notification rows had non-intersecting rectangles. Voice
  buttons passed center-point hit testing, and Hebrew titles had RTL direction.
- Clicking microphone mute, output mute and stop invoked their respective
  callbacks and changed the simulated state. An active-state screenshot was
  inspected. This verifies presentation and wiring, not a live audio session.
- The staged production ASAR differs in exactly the native overlay JavaScript
  asset; every other packed asset is byte-identical. No diagnostic exports are
  present in that staged production archive.

Raw analysis, screenshots and the local runner are in the task's
`work/pet-voice-proof/`, outside release source. The installed runtime's updated
manifest/build report are staged with the new ASAR and renderer. A local updater
waits for the installation's processes to exit, verifies both old and staged
hashes, preserves a backup, installs and relaunches the existing launcher. Its
fixture checks passed checksum rejection, successful installation, rollback
after a locked final target, and shared-settings preservation.

The running user app was not stopped during development. Activation requires
one full exit so the archive and renderer can be replaced together. Profiles,
conversations, shortcuts and pet selection are not modified. The published EXE
has not been rebuilt; macOS and a live voice session remain unverified.

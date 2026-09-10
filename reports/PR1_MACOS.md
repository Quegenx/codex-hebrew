# PR #1 macOS regression checks — 2026-09-10

The initial polling regression below was fixed before merge. Windows renderer
compatibility behavior is now explicitly scoped to Windows. See the final
validation section for checks performed after the fixes.

PR: https://github.com/Quegenx/codex-hebrew/pull/1

Base: `840e1758d07573681eebd96f63cbfb6fd45272f3`.
Tested PR head: `4dd6ec022847cde9f666e55244325051181a7776`.
Host: macOS `27.0`, arm64, Bun `1.4.2`, Python `3.14.7`.
Installed target: ChatGPT `26.901.51231`, build `8109`.
Source ASAR SHA-256: `64fc2f27d2dddfa968acfacbe5e4e0328071bdc406351ff4a7d18f0b4692c83d`.
Source executable SHA-256: `e5a0c5166eaf20d35a0bb6ccb14ec5aec2595ea14eb98e5f8d6e74bb7a70f749`.

The PR was checked out detached under `/private/tmp/codex-hebrew-pr1-test`.
Dependencies were installed with `bun install --frozen-lockfile --ignore-scripts`.
The initial review added the regression test below to that checkout.
During these initial checks, no PR code was merged, installed into the user's application, or published.

## Initial commands and results

- `bun run target:status` on the base: confirmed the target above.
- `bun test` on the unchanged base: 62 passed, zero failed.
- `bun test` on the PR before adding the review test: 65 passed, two Windows-only tests skipped, zero failed.
- `bun run check:structure`: passed on both branches.
- `bun run build:installers` on the PR: passed; generated an ad-hoc signed macOS DMG in the isolated checkout.
- `shasum -a 256 -c SHA256SUMS` from the PR's `dist/installers/`: passed.
- `bun run check:installer` on the PR: passed installation, signature, runtime digest, metadata, reinstall, profile/settings preservation, unsupported-version rejection, original-app preservation, and launcher invocation in a temporary home.
- `bun test tests/rtl/electron-entry.test.mjs`: passed on the base, failed on the PR.
- `bun test` on the base with the new test: 63 passed, zero failed.

## Initial shared renderer regression

The focused check runs the actual renderer module with Happy DOM and a minimal
IntlProvider fixture. Expected: Hebrew attaches, polling stops, and stopping
restores the original provider. On the base all assertions pass. On the PR,
Hebrew attaches but `status.polling` is `true`, failing the expected `false`.

`ui/electron-entry.js` now schedules `apply()` every 500 ms on all platforms.
Previously polling stopped after attachment. This conflicts with the existing
`idlePollingStopped` observation in `scripts/validation/runtime-status.mjs`.
That observation is reported but is not included in that script's aggregate
`complete` predicate. A passing aggregate result alone would not catch this.
The PR comment describes detecting provider identity changes, but `apply()`
traverses the React tree before making those comparisons.

This is a reproduced client-side behavior change, not evidence of a crash or
data loss. CPU/battery impact was not measured. Preserve the Mac idle behavior
or justify and validate a replacement before treating this as Windows-only.

## Limits of the initial review

The renderer check uses a fixture, not a live signed-in application. Full macOS
GUI startup, conversation/summary geometry, accessibility, and Gatekeeper were
not tested. Windows-only execution was not tested on this Mac. Existing tests
and a successful build do not establish that the shared layout changes are safe
on the pinned macOS target.

## Fixes and final validation

- Renderer options record the build platform. On macOS, provider discovery stops
  after attachment, matching the original behavior. Windows retains the 500 ms
  locale-provider check and reattaches Hebrew after replacement.
- The Windows summary controls, additional attribute observation, and summary
  CSS are enabled only for Windows. The Mac summary layout keeps its prior CSS.
- The summary close action and keyboard eligibility use `aria-expanded` for
  popovers and fall back to `aria-pressed` for pinned panels. A test with only
  `aria-expanded` failed before this fix and passed afterward.
- `bun test`: 66 passed, two Windows-only tests skipped, zero failed. The new
  renderer check uses controlled timer callbacks and covers delayed Mac
  attachment, default options, Windows provider replacement, and cleanup.
- The summary test parses the actual CSS and queries a thread fixture: the
  shift selector does not match in Mac mode, matches in Windows mode, and
  stops matching after cleanup. This checks selector scope, not pixel geometry.
- `bun run check:structure` and `git diff --check`: passed.
- `bun run build:installers`: passed on the Mac target above.
- `bun run check:installer`: passed all temporary-home acceptance checks,
  including profile/settings preservation and launcher invocation.
- `shasum -a 256 -c SHA256SUMS` in the isolated `dist/installers/` and
  `codesign --verify --deep --strict 'Install Codex Hebrew.app'`: passed.
- A build-options check called `buildRendererInjection` with the installed
  ASAR hash and parsed its embedded options: platform was `darwin` and the
  verified direction contract remained present.

An optional isolated Chrome `--headless --dump-dom` check of a temporary HTML
fixture timed out after 45 seconds; it provides no browser geometry evidence.
Final native Windows runtime behavior was not retested on this Mac. Full
macOS GUI and signed-in journeys, and Gatekeeper approval, remain unverified.
The tested DMG is local to the isolated checkout; the published release was
not replaced by these checks.

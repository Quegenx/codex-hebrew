# Windows summary layout — 2026-09-10

Target: Windows x64 package `26.903.8094.0`, application `26.903.61454`.
Original ASAR SHA-256:
`3b8e61c9b7afefeda3166f251270724a138af15eb947b7c3907691a695bce66c`.

## Cause and correction

In the observed `conversation-source` asset, the pinned summary returns a
physical content displacement of `-316/2` in `shift` mode. The logical CSS
conversion puts the summary on the left, but that JavaScript displacement
still moves the conversation left. The thread overlaps the panel and leaves
unused space on the right.

The shared thread-scroll layout supplies the same Motion value to the thread
body and composer, together with its unsigned CSS variable
`--thread-wide-block-inline-shift`. The RTL override uses that live variable
as a positive translation for both surfaces. Explicit logical anchoring of the
floating summary clears the physical right edge. Closing and resizing still
use the native animation and return the translation to zero.

The reversible renderer adapter labels the existing header action and adds a
close control to the summary card, including its narrow-window popover. The
close control invokes the visible native header button, skipping measurement
copies. Native state owns layout reservation and persistence. User message
content is excluded, and adapter cleanup removes added controls and listeners.

## Verification

- `bun test`: 66 passed, one macOS integration test skipped, no failures.
- `bun run check:structure`: passed; largest maintained source is 214/300 lines.
- The new summary test failed before implementation, then passed. It exercises
  close/reopen, hidden header copies, lazy popover mounting, focus eligibility,
  user-content preservation and cleanup using the existing Happy DOM tooling.
- An isolated signed-in Owl process used a separate Chromium profile and a
  loopback debugging port. No message or model request was submitted.
- At viewport 1900 × 940 with the observed 110% application zoom, both Motion
  translations changed from -158 to +158 CSS pixels when pinned. The summary
  ended around x=348 and the thread began around x=454, without overlap.
- Closing removed the native layout reservation, returned both translations
  to zero and centered the conversation in its available main viewport.
- At viewport 1280 × 940, the native popover opened and closed, with a visible
  close control and zero reserved displacement. Focus returned to the header.
- After reload and reopening the same task, the closed pin preference remained.

The local diagnostic runner and screenshots are under the task's
`work/layout-proof/` directory, outside release source. Screenshots contain
private conversation content and must not be distributed. The final check
uses the deployed renderer loaded by a restarted proof process; the runtime
caches renderer source at process startup, so a renderer-only reload cannot
test newly deployed bytes in an already running process.

This verifies summary layout and controls on the pinned Windows target.
It does not establish full signed-in workflow coverage or macOS compatibility.

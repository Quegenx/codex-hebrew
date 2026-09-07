# Renderer RTL evidence — 2026-09-06

Target: ChatGPT Desktop `26.901.51231` build `8109`, macOS arm64. ASAR SHA-256: `64fc2f27d2dddfa968acfacbe5e4e0328071bdc406351ff4a7d18f0b4692c83d`.

`bun run audit:rtl` performs occurrence-level classification against the installed ASAR. The current inventory contains 1,504 candidates: 746 adapted and 758 intentionally preserved, with zero unclassified occurrences. Each record in `rtl-inventory.json` includes the asset, offset, source fragment, disposition, and reason.

`bun run build:adaptation` confirms the application's Radix direction contract for this build, captures its actual context default, and restores the React dispatcher after probing. It converts 332 declarations across 15 stylesheets and identifies five directional icon contracts. The replacement stylesheet preserves source order, handles stylesheets loaded after attachment, resolves asset URLs against their original source, and restores original links on detach.

Physical rules remain unchanged when they belong to code editors, terminals, math, visualizations, maps, authored spatial controls, OS title-bar geometry, or language-aware ProseMirror content. Chat containers and their block children use `dir=auto` and `unicode-bidi: plaintext`; code, editors, terminals, URLs, and user input values are excluded from translation. Logical text is never reversed or rewritten for display.

Focused Bun tests cover asymmetric edge conversion, corners and alignment, intentional LTR rules, code/editor/terminal/diff exclusions, lazy styles, streamed mixed-direction content, composition, focus order, truncation, menu and submenu behavior, Radix capture and cleanup, directional icons, native hooks, ASAR rewriting, main-loader reload and multiple-window behavior, and safe metadata boundaries. Current installed-app evidence in `runtime-current.json` confirms the isolated profile, document direction, Radix bridge, generated styles, logical-content preservation, metadata, and native hook.

The current macOS capture in `visual-macos.json` shows the isolated light sign-in screen at 1,090 pixels. Hebrew labels, centered spacing, wrapping, and baselines are visible without clipping.

The visual matrix remains incomplete. Dark mode, signed-in home and conversations, settings, plugin/skill views, menus, dialogs, tooltips, focus states, loading and empty states have no direct capture. `bun run visual:check` and `bun run verify` therefore exit nonzero and expose these missing categories in `coverage.json`.

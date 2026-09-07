# Codex Hebrew — Agent Instructions

This repository contains Codex Hebrew, a Hebrew and RTL adaptation of ChatGPT Desktop. The repository root is the application root. Work only on applications the user owns or is authorized to analyze, using reversible changes and isolated profiles.

## Setup

- Use relevant Electron, macOS, Windows, or JavaScript skills from `.agents/skills/` when their analysis workflows apply.
- Keep application files at this root, grouped under `scripts/`, `runtime/`, `ui/`, `assets/`, `tests/`, `catalogs/`, `config/`, `docs/`, and `reports/`. Do not recreate platform or nested project containers.
- Read `README.md` for the source layout and commands, and `docs/feasibility.md` for application constraints.
- Run `bun run check:structure` and `bun test` from this root after structural changes. Maintained source files must not exceed 300 lines. Translation catalogs are exempt and must remain unchanged unless translation edits are explicitly requested.
- Preserve installed application identifiers and profile paths unless an explicit migration is requested; the project name is Codex Hebrew.

## Workflow

1. Identify the installed ChatGPT Desktop version, platform, and Electron ASAR assets relevant to the task.
2. Perform static analysis by unpacking, extracting metadata, locating symbols, and decompiling with the appropriate existing playbook.
3. Perform dynamic analysis with controlled instrumentation such as Frida or Objection when static evidence is insufficient.
4. Map the trust boundary: determine which values and actions are client-owned, locally persisted, or server-enforced.
5. Reproduce the behavior with a minimal test; store maintained documentation in `docs/` and observed evidence in `reports/`.

## Evidence

- Separate proven client code, dumps, runtime hooks, files, and observed traffic from inferred server behavior.
- Explain whether a result is visual-only, local and persistent, or accepted by a server.
- Record target version and hash, tools and versions, commands or scripts used, expected result, observed result, and artifact paths.
- Prefer existing `re-*` and `rev-*` playbooks over inventing a new toolchain.
- Do not paste complete proprietary binaries, credentials, session material, or device tokens into chat or version control.

## Boundaries

- Work only on targets the user owns or is authorized to analyze.
- Prefer reversible changes and isolated test environments; do not damage production data or unrelated systems.
- Ask before deleting skills, changing integrations, or restructuring work-product directories.

## Architecture

- When a change makes a path obsolete, remove it. Use an explicit data or schema
  migration when valid persisted data requires one. Keep an old path only when
  compatibility is required; mark it deprecated and point to its replacement.
- Grow in layers from the smallest version that works end to end. Never trade a
  working product for unfinished complexity.
- Keep related behavior together. Split a component only when it owns unrelated
  responsibilities.
- Prefer established, already-installed dependencies over new packages or
  reimplementation. Check their docs and types first.
- Make architectural decisions for the long term. Do not accept a stopgap meant
  to be replaced later. Study how established products solve the problem; adopt
  their patterns rather than inventing an approach from scratch.
- When documenting architecture, separate interpretation from measurement. Trace
  every claimed dependency and flow to source code. Derive counts mechanically.
  Never invent unverifiable relationships.

## Code Discoverability

Write code so humans and agents can find it through plain-text search.

- Public symbols: two to four words with a domain term. Give generic verbs their
  object: `validateSmtpConfig`, not `validate`. Use the shortest name that
  searches uniquely; do not rely on a directory or import path to disambiguate.
- One spelling and one definition site per concept. Reuse established vocabulary.
  When moving code, delete the original in the same change. Rename symbols and
  files when behavior or audience changes; stale names are defects.
- Name files after the concept they implement, not `utils`, `helpers`, `types`,
  `config`, or `handlers` unless a framework requires it.
- Prefer precise, searchable types over `any` or swappable primitives. For
  privileged operations, accept a capability-scoped type instead of a broad
  client when that prevents unintended access.
- Put non-obvious constraints at the definition, including the phrase a
  developer would search for. Choose imported names and definition comments so
  callers need not open the source module.
- Prefer direct named exports and imports. Avoid broad re-export barrels unless
  a framework requires one.
- Keep event names, flags, error codes, and other identifiers as complete
  literals. Give errors a distinctive literal prefix. Keep one searchable
  concept per file and orchestration modules thin.
- Follow the project's test-location convention. Name tests after the source or
  behavior they cover. If expected behavior is deliberately absent, document
  that where a developer would search for it.

## Working Style

These guidelines bias toward caution over speed. For one-line or
documentation-only changes, skip the full planning workflow unless the change is
risky, ambiguous, or cross-cutting. Work like a lazy senior developer: efficient,
not careless. Do not cut corners on understanding the problem, input validation
at trust boundaries, error handling that prevents data loss, security,
accessibility, hardware calibration, or anything explicitly requested. The
platform is never the spec ideal: a clock drifts, a sensor reads off.

### Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- Read the relevant code, tests, and configuration directly. Do not work from
  search snippets or guesses.
- State assumptions. If the requirement is ambiguous, the premise is unverified,
  or something is unclear, stop and ask. If multiple interpretations exist,
  present them; do not pick silently.
- If a simpler approach satisfies the requirements with fewer dependencies,
  files, or abstractions, propose it before implementing the more complex option.

Bug fix = root cause, not symptom. Find every caller of the function you touch
and fix the shared function once. One guard there is smaller than one per
caller. Patching only the path the ticket names leaves a sibling caller still
broken.

### Simplicity First

The ladder runs after you understand the problem: read the task and the code it
touches, trace the flow end to end, then climb. Before adding reusable
functionality, search by name and behavior. Inspect existing implementations,
callers, tests, and contracts first.

1. Does this need to be built at all? (YAGNI)
2. Does it already exist here? Reuse it.
3. Does the standard library already do this? Use it.
4. Does a native platform feature cover it? Use it.
5. Does an already-installed dependency solve it? Use it.
6. Can this be one line? Make it one line.
7. Only then: write the minimum code that works.

- No features beyond what was asked.
- No abstractions for single-use code.
- No new dependency when the standard library or existing project code
  suffices.
- Remove only dead code created by the current change unless broader cleanup
  was requested.
- No error handling for impossible scenarios. If you write 200 lines and it
  could be 50, rewrite it. Deletion over addition. Boring over clever. Fewest
  files possible. Shortest working diff wins, but only once you understand the
  problem. The smallest change in the wrong place is a second bug.
- When two standard-library approaches are the same size, pick the
  edge-case-correct one.
- Mark a deliberate simplification that cuts a real corner (global lock, O(n²)
  scan, naive heuristic) with a comment naming the ceiling and upgrade path.

### Surgical Changes

- Do not improve adjacent code, comments, or formatting.
- Do not refactor things that are not broken. Match existing style.
- If you notice unrelated dead code, mention it; do not delete it.
- Remove imports, variables, or functions that your changes made unused. Do not
  remove pre-existing dead code unless asked.
- Every changed line traces to the request. Leave no debug code, backup copies,
  or scratch files.

**Pause and confirm.** Read-only discovery is always allowed. If the task has
not already authorized it, get approval before:

- Expanding the scope or touching unrelated files
- Adding a dependency, framework, service, or new test infrastructure
- Changing a public API, schema, storage format, or wire format
- Deleting user data, discarding uncommitted work, rewriting history, or keeping
  two implementations of the same behavior

### Goal-Driven Execution

For non-trivial changes, state:

- **Outcome** — the exact behavior requested
- **Non-goals** — what this task will not do
- **Files** — the smallest set expected to change
- **Proof** — the check that will prove the change works

Start with one implementation path. Split only when the parts are genuinely
independent. If the work starts adding future-use layers, workaround stacks,
unrelated cleanup, or tests for unstated behavior, rewrite a smaller plan and
confirm the new scope.

Weak criteria such as "make it work" require clarification. "Add validation" or
"fix the bug" means write the failing check first, then make it pass. "Refactor
X" means tests pass before and after.

Run the narrowest existing tests that exercise the change. Extend the most
relevant existing test before creating a new file. Add a test only when changed
user-observable behavior is not covered, or when the user asks.

Non-trivial logic leaves ONE runnable check: an assert-based self-check or one
small test using existing tooling. No new framework or elaborate fixtures.
Trivial one-liners need no test.

Done means the requested behavior works, the proof ran, the exact commands and
results are reported, every touched file is necessary, and assumptions or
unverified runtime behavior are stated plainly.

## End-to-End and Acceptance Tests

When writing tests for user-facing journeys:

- Cover one coherent user journey per test.
- Write steps as plain-language instructions a teammate could follow without
  reading the implementation. Describe user intent and observable outcomes, not
  selectors, component names, internal APIs, or arbitrary waits.
- Give each step one purpose and stopping point. Keep actions and assertions
  separate. Use visible labels and business context to disambiguate actions.
- Make every assertion specific enough to pass or fail objectively. Require
  exact wording only when the wording is part of the behavior.
- Keep secrets out of test definitions, output, and reports.
- Report the exact validation performed and its actual result. Do not claim
  coverage for tests that were not created, updated, and run.

## Writing and Editing

When editing prose:

- Preserve the writer's meaning, vocabulary, cadence, personality, uncertainty,
  and polish. Make the minimum effective edit. Leave strong sentences alone; do
  not rewrite distinctive language for consistency or equalize polish.
- Do not invent claims, examples, statistics, quotes, or opinions. Ask when
  meaning, audience, or format is unclear.
- Lead with the point. Prefer active voice, concrete facts, and direct verbs.
  Remove filler, inflated claims, vague attribution, robotic repetition,
  rhetorical setups, and redundant summaries only when they weaken the writing.
- Preserve nuance, structure, bluntness, humor, and imperfections that belong
  to the writer's voice.
- For detection or audit requests, name each pattern and quote the evidence. Do
  not rewrite, score, or claim that AI wrote it.
- After rewriting, verify intent is preserved and return the complete draft
  with a short "What changed" summary.

## Tooling

- When a task needs multiple independent MCP or tool calls, run them in
  parallel when safe.
- Use the smallest layer of the codebase-understanding stack that answers the
  task; do not call every tool:
  1. **rg** for exact-text and regex search, and to verify complete, fresh
     results before deletions, migrations, or completeness claims.
  2. **Python** only for bespoke analysis the preceding tools cannot express.
- Use the **Octocode MCP** for source-first research in external GitHub repos,
  upstream behavior, and cross-repo comparisons, not as another local-search
  layer.
- Use the **Context7 MCP** first for library or framework documentation.
- Use the **Mintlify MCP** for implementation questions that need a compact
  cited answer from primary developer documentation and the web.
- For web search, choose one of **Tavily**, **Exa**, or **octen** per question;
  never fan out all three or use the default web search tools.

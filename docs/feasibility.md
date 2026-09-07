# Codex Hebrew wrapper feasibility

The installed target is an arm64 Electron application with React Intl catalogs, native-menu locale catalogs, a Radix direction context, and packaged renderer CSS. Reviewed observations and target hashes are recorded in [runtime evidence](../reports/RUNTIME.md). `bun run target:status` generates the local `reports/target-current.json`; raw inspection reports are not published.

Runtime feasibility is established on macOS for version `26.901.51231` build `8109`. A separately signed copy loads a source-pinned main-process loader from its rebuilt ASAR. The loader injects the Hebrew renderer bundle into every matching `BrowserWindow` and translates supported native Electron sinks. It rejects a runtime manifest whose source ASAR hash differs from the loader's embedded hash and exits when the profile launch argument is missing. It does not verify runtime file contents against the manifest's runtime hash.

The maintained application is `~/Applications/צ׳אט ג׳יפיטי בעברית.app`. Its native launcher supplies a separate Chromium profile before Electron initializes, while the runtime and Codex configuration live below `~/Library/Application Support/ChatGPT Hebrew`. The official `/Applications/ChatGPT.app` bundle and normal profile are not modified.

Observed runtime behavior includes Hebrew React Intl output, document and Radix RTL, converted styles, scoped plugin and skill metadata, logical preservation of mixed-direction user content, and the native hook. The current visual evidence covers the isolated sign-in screen. Full signed-in visual coverage and automated observation of the current native menu tree remain open evidence gaps.

Updates are supported only after the scanner, message contracts, direction probe, native contracts, wrapper build, and runtime hash all pass for the newly installed ASAR. Unknown future versions are never enabled based on the previous version’s result.

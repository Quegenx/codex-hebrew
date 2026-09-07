# Runtime evidence — 2026-09-07

The tested target is `/Applications/ChatGPT.app` version `26.901.51231` build `8109` on macOS arm64. Its executable SHA-256 is `e5a0c5166eaf20d35a0bb6ccb14ec5aec2595ea14eb98e5f8d6e74bb7a70f749`; the ASAR SHA-256 is `64fc2f27d2dddfa968acfacbe5e4e0328071bdc406351ff4a7d18f0b4692c83d`.

`bun run install` built and installed `~/Applications/ChatGPT Hebrew.app`. The copy has bundle ID `com.openai.codex.hebrew`, an ad-hoc verified signature, and a native launcher that passes `--user-data-dir=~/Library/Application Support/ChatGPT Hebrew/profile` before Electron starts. The running process and `runtime-current.json` both report that isolated path. The official application and its profile remain unchanged.

The ASAR loader intercepts the application’s Electron import and supplies a `BrowserWindow` subclass. A target window stays hidden until the Hebrew renderer bundle executes at `app://-/index.html`; non-target windows retain their original behavior. No remote-debugging port, CDP watcher, preload replacement, or long-running attachment process is used.

The installed application reported `lang=he`, `dir=rtl`, the application Radix context attached, one document RTL stylesheet, two converted asset stylesheets, 21,408 preloaded metadata records, 30,873 renderer messages, preserved synthetic mixed-direction content, and the source-pinned native chrome hook. The current capture at `reports/visual-macos/installed/login.png` shows the isolated sign-in screen in Hebrew at 1,090 by 760 logical pixels.

Focused tests drive the main loader through initial attachment, reload, a second window, destruction, non-target windows, and failure when a profile argument is missing. An earlier isolated run exercised reload, adapter stop/replacement, restoration, multiple windows, and native menus directly; its CDP harness has been removed because it is not part of the installed architecture. Those earlier observations are historical evidence and are not presented as current-fingerprint visual coverage.

The app forces the main-process locale API to Hebrew and installs the 214-entry native locale catalog plus 226 static and 16 templated native-hook translations. The hook records the translated templates actually passed to `Menu.buildFromTemplate`; the current report observes the Hebrew File and Edit labels. macOS-owned Writing Tools, AutoFill, dictation, emoji, and window-management entries follow the operating system.

The full macOS visual matrix remains incomplete. `bun run verify` exposes those missing categories and exits nonzero.

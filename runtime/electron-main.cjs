const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

function isChatGPTRenderer(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'app:' && parsed.host === '-' && parsed.pathname === '/index.html';
  } catch {
    return false;
  }
}

function install({runtimeRoot, sourceArchiveSha256, electron = require('electron'), argv = process.argv}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(runtimeRoot, 'manifest.json'), 'utf8'));
  if (manifest.sourceArchiveSha256 !== sourceArchiveSha256) throw new Error('[chatgpt-hebrew] Runtime does not match this application build');

  const rendererSource = fs.readFileSync(path.join(runtimeRoot, 'renderer.js'), 'utf8');
  const statusPath = path.join(runtimeRoot, 'status.json');
  const hasExplicitProfile = argv.some(argument => argument === '--user-data-dir' || argument.startsWith('--user-data-dir='));
  if (!hasExplicitProfile) {
    const applicationRoot = path.dirname(runtimeRoot);
    const persistentProfilePath = path.join(applicationRoot, 'profile');
    process.env.CODEX_ELECTRON_USER_DATA_PATH = persistentProfilePath;
    electron.app.setPath('userData', process.env.CODEX_ELECTRON_USER_DATA_PATH);
    process.env.CODEX_HOME = path.join(applicationRoot, 'codex-home');
    electron.app.exit(0);
    return {profileArgumentRequired:true, sourceArchiveSha256, statusPath, profilePath:persistentProfilePath};
  }
  const windowStatuses = new Map();
  const events = [];
  const writeStatus = () => {
    const status = {schemaVersion: 2, pid: process.pid, sourceArchiveSha256, profilePath: electron.app.getPath('userData'), locale: applicationProxy.getLocale(), updatedAt: new Date().toISOString(), events, windows: [...windowStatuses.values()]};
    const temporary = `${statusPath}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(status, null, 2)}\n`, {mode: 0o600});
    fs.renameSync(temporary, statusPath);
  };

  const OriginalBrowserWindow = electron.BrowserWindow;
  class HebrewBrowserWindow extends OriginalBrowserWindow {
    constructor(options = {}) {
      const target = path.basename(options.webPreferences?.preload || '') === 'preload.js';
      const requestedOnConstruction = target && options.show !== false;
      super(target ? {...options, show: false} : options);
      if (!target) return;

      const actualShow = this.show.bind(this);
      const actualShowInactive = this.showInactive.bind(this);
      let requestedShow = requestedOnConstruction ? actualShow : null;
      let startupReleased = false;
      let startupReloaded = false;
      this.show = () => { requestedShow = actualShow; };
      this.showInactive = () => { requestedShow = actualShowInactive; };
      const releaseStartup = () => {
        if (startupReleased) return;
        startupReleased = true;
        this.show = actualShow;
        this.showInactive = actualShowInactive;
        requestedShow?.();
      };

      this.webContents.on('dom-ready', () => {
        if (!isChatGPTRenderer(this.webContents.getURL())) {
          releaseStartup();
          return;
        }
        void this.webContents.executeJavaScript(rendererSource, true).then(result => {
          windowStatuses.set(this.webContents.id, {webContentsId: this.webContents.id, ...result});
          events.push({type: 'attached', webContentsId: this.webContents.id, at: new Date().toISOString()});
          writeStatus();
          if (!startupReloaded && typeof this.webContents.reload === 'function') {
            startupReloaded = true;
            this.webContents.reload();
            return;
          }
          releaseStartup();
        }).catch(error => {
          console.error('[chatgpt-hebrew] Renderer injection failed', error);
          void this.webContents.executeJavaScript("document.getElementById('chatgpt-hebrew-boot')?.remove()", true).finally(releaseStartup);
        });
      });
      this.webContents.once('destroyed', () => {
        windowStatuses.delete(this.webContents.id);
        events.push({type: 'destroyed', webContentsId: this.webContents.id, at: new Date().toISOString()});
        writeStatus();
      });
    }
  }
  const applicationProxy = new Proxy(electron.app, {get(target, property) {
    if(property === 'getLocale') return () => 'he';
    if(property === 'getPreferredSystemLanguages') return () => ['he'];
    if(property === 'getName') return () => 'ChatGPT';
    if(property === 'name') return 'ChatGPT';
    const value=Reflect.get(target, property, target);return typeof value === 'function' ? value.bind(target) : value;
  }});
  const electronProxy = new Proxy(electron, {get(target, property) {if(property === 'BrowserWindow')return HebrewBrowserWindow;if(property === 'app')return applicationProxy;return Reflect.get(target, property, target);}});
  const originalModuleLoad = Module._load;
  Module._load = function(request) {
    const loaded = originalModuleLoad.apply(this, arguments);
    return request === 'electron' && loaded === electron ? electronProxy : loaded;
  };

  const nativeChrome = require(path.join(runtimeRoot, 'native-chrome-hook.cjs'));
  const nativeCatalog = JSON.parse(fs.readFileSync(path.join(runtimeRoot, 'native-chrome-he.json'), 'utf8'));
  nativeChrome.installNativeChrome(electron, nativeCatalog);
  process.__chatgptHebrewRuntime = {sourceArchiveSha256, rendererPath: path.join(runtimeRoot, 'renderer.js'), statusPath, BrowserWindow: HebrewBrowserWindow, profilePath: electron.app.getPath('userData'), locale:applicationProxy.getLocale()};
  return process.__chatgptHebrewRuntime;
}

module.exports = {install};

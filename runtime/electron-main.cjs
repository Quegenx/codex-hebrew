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
  const iconPath = path.join(runtimeRoot, 'app.ico');
  const windowsIcon = process.platform === 'win32' && fs.existsSync(iconPath) ? iconPath : null;
  const launcherPath = path.resolve(runtimeRoot, '../../..', 'Codex Hebrew.exe');
  let windowAppId = null;
  if (windowsIcon && typeof electron.app.setAppUserModelId === 'function') {
    const setAppUserModelId = electron.app.setAppUserModelId.bind(electron.app);
    electron.app.setAppUserModelId = id => { windowAppId = id; return setAppUserModelId(id); };
  }
  const writeStatus = () => {
    const status = {schemaVersion: 2, pid: process.pid, sourceArchiveSha256, profilePath: electron.app.getPath('userData'), locale: applicationProxy.getLocale(), updatedAt: new Date().toISOString(), events, windows: [...windowStatuses.values()]};
    const temporary = `${statusPath}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(status, null, 2)}\n`, {mode: 0o600});
    fs.renameSync(temporary, statusPath);
  };

  const OriginalBrowserWindow = electron.BrowserWindow;
  // Owl's native window registry rejects subclass instances, dropping app-wide
  // project/state broadcasts. Decorate a native instance without changing its identity.
  const HebrewBrowserWindow = new Proxy(OriginalBrowserWindow, {
    construct(Constructor, [options = {}, ...rest], newTarget) {
      const target = path.basename(options.webPreferences?.preload || '') === 'preload.js';
      const requestedOnConstruction = target && options.show !== false;
      const nativeOptions = target ? {...options, show: false, ...(windowsIcon ? {icon: windowsIcon} : {})} : options;
      const window = Reflect.construct(Constructor, [nativeOptions, ...rest], newTarget === HebrewBrowserWindow ? Constructor : newTarget);
      if (!target) return window;
      if (windowsIcon && windowAppId && fs.existsSync(launcherPath) && typeof window.setAppDetails === 'function') {
        try {
          window.setAppDetails({appId: windowAppId, appIconPath: launcherPath, appIconIndex: 0, relaunchCommand: `"${launcherPath}"`, relaunchDisplayName: 'Codex Hebrew'});
        } catch (error) {
          console.warn('[chatgpt-hebrew] Window relaunch details unavailable', error);
        }
      }

      const actualShow = window.show.bind(window);
      const actualShowInactive = window.showInactive.bind(window);
      let requestedShow = requestedOnConstruction ? actualShow : null;
      let startupReleased = false;
      let startupReloaded = false;
      window.show = () => { requestedShow = actualShow; };
      window.showInactive = () => { requestedShow = actualShowInactive; };
      const releaseStartup = () => {
        if (startupReleased) return;
        startupReleased = true;
        window.show = actualShow;
        window.showInactive = actualShowInactive;
        requestedShow?.();
      };

      window.webContents.on('dom-ready', () => {
        if (!isChatGPTRenderer(window.webContents.getURL())) {
          releaseStartup();
          return;
        }
        void window.webContents.executeJavaScript(rendererSource, true).then(result => {
          windowStatuses.set(window.webContents.id, {webContentsId: window.webContents.id, ...result});
          events.push({type: 'attached', webContentsId: window.webContents.id, at: new Date().toISOString()});
          writeStatus();
          if (!startupReloaded && typeof window.webContents.reload === 'function') {
            startupReloaded = true;
            window.webContents.reload();
            return;
          }
          releaseStartup();
        }).catch(error => {
          console.error('[chatgpt-hebrew] Renderer injection failed', error);
          void window.webContents.executeJavaScript("document.getElementById('chatgpt-hebrew-boot')?.remove()", true).finally(releaseStartup);
        });
      });
      window.webContents.once('destroyed', () => {
        windowStatuses.delete(window.webContents.id);
        events.push({type: 'destroyed', webContentsId: window.webContents.id, at: new Date().toISOString()});
        writeStatus();
      });
      return window;
    }
  });
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

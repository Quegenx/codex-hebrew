const os = require('node:os');
const path = require('node:path');

function runtimeRoot() {
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'ChatGPT Hebrew', 'runtime');
  if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'ChatGPT Hebrew', 'runtime');
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'chatgpt-hebrew', 'runtime');
}

const runtime = require(path.join(runtimeRoot(), 'main.cjs')).install({
  runtimeRoot: runtimeRoot(),
  sourceArchiveSha256: '__SOURCE_ARCHIVE_SHA256__',
});

module.exports = runtime.profileArgumentRequired ? {} : require('__ORIGINAL_MAIN__');

const os = require('node:os');
const path = require('node:path');

function runtimeRoot() {
  if (process.platform === 'win32') return path.join(process.resourcesPath, 'hebrew-runtime');
  if (process.platform !== 'darwin') throw Error(`Codex Hebrew supports macOS only, not ${process.platform}.`);
  return path.join(os.homedir(), 'Library', 'Application Support', 'ChatGPT Hebrew', 'runtime');
}

const runtime = require(path.join(runtimeRoot(), 'main.cjs')).install({
  runtimeRoot: runtimeRoot(),
  sourceArchiveSha256: '__SOURCE_ARCHIVE_SHA256__',
});

module.exports = runtime.profileArgumentRequired ? {} : require('__ORIGINAL_MAIN__');

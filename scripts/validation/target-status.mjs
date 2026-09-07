import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveApplicationTarget} from '../analysis/application-target.mjs';
import {openAsar} from '../analysis/asar-archive.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),target=resolveApplicationTarget({executable:process.argv[2]}),asar=openAsar(target.archive);
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let version=null,build=null;
const plist=path.resolve(target.resources,'../Info.plist'),read=key=>Bun.spawnSync(['/usr/libexec/PlistBuddy','-c',`Print :${key}`,plist],{stdout:'pipe',stderr:'ignore'}).stdout.toString().trim()||null;
version=read('CFBundleShortVersionString');build=read('CFBundleVersion');
const codex=path.join(target.resources,'codex');
const report={schemaVersion:1,generatedAt:new Date().toISOString(),platform:target.platform,architecture:process.arch,executable:target.executable,executableSha256:digest(target.executable),resources:target.resources,archive:target.archive,archiveSha256:asar.hash,version,build,codex:fs.existsSync(codex)?{path:codex,sha256:digest(codex),version:Bun.spawnSync([codex,'--version'],{stdout:'pipe',stderr:'ignore'}).stdout.toString().trim()}:null,assets:{entries:asar.files.length,applicationJavascript:asar.files.filter(file=>/^webview\/assets\/app-(?:initial|primary)-.*\.js$/.test(file)),applicationStyles:asar.files.filter(file=>/^webview\/assets\/app-(?:initial|primary)-.*\.css$/.test(file)),nativeLocaleCatalogs:asar.files.filter(file=>file.startsWith('native-menu-locales/')&&file.endsWith('.json')).length},nativeLocaleStrategy:'rebuilt-asar-isolated-wrapper'};
fs.writeFileSync(`${root}reports/target-current.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({platform:report.platform,architecture:report.architecture,version:report.version,archiveSha256:report.archiveSha256,executableSha256:report.executableSha256,entries:report.assets.entries}));

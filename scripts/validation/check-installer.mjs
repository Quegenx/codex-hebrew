import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openAsar} from '../analysis/asar-archive.mjs';
import {verifyHebrewMetadataResources} from '../rtl/hebrew-metadata-resources.mjs';
import {readHebrewCatalog} from '../translation/hebrew-catalog.mjs';
import {hebrewApplicationName} from '../installation/macos-installer.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const executable=process.argv[2]||path.join(root,'dist/installers/Install ChatGPT eBrew.app/Contents/MacOS/ChatGPT eBrew Installer');
// Keep ChatGPT's IPC socket path below macOS's 104-byte sockaddr_un limit.
const home=fs.mkdtempSync('/private/tmp/ebrew-test-');
const support=path.join(home,'Library/Application Support/ChatGPT Hebrew');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const source='/Applications/ChatGPT.app/Contents/Resources/app.asar',sourceHash=hash(source);
function install(sourceApp){
 return Bun.spawnSync([executable,'--install-test',home,...(sourceApp?[sourceApp]:[])],{cwd:home,env:{HOME:home,PATH:'/usr/bin:/bin:/usr/sbin:/sbin',TMPDIR:'/private/tmp'},stdout:'pipe',stderr:'pipe'});
}
try{
 // Install from the compiled download without a repository, dependencies, or developer tools on PATH.
 const installed=install();assert.equal(installed.exitCode,0,installed.stderr.toString());
 const result=JSON.parse(installed.stdout.toString()),application=path.join(home,'Applications',hebrewApplicationName);
 assert.equal(result.application,application);
 assert.equal(Bun.spawnSync(['/usr/bin/codesign','--verify','--deep','--strict',application],{stderr:'pipe'}).exitCode,0);
 const archive=openAsar(path.join(application,'Contents/Resources/app.asar'));
 assert.equal(JSON.parse(archive.read('package.json')).main,'codex-he-loader.cjs');
 assert.equal(verifyHebrewMetadataResources(path.join(application,'Contents/Resources'),readHebrewCatalog()).complete,true);
 const manifest=JSON.parse(fs.readFileSync(path.join(support,'runtime/manifest.json'),'utf8'));
 assert.equal(manifest.sourceArchiveSha256,sourceHash);
 const runtimeBytes=Buffer.concat(manifest.files.sort().flatMap(name=>[Buffer.from(name),fs.readFileSync(path.join(support,'runtime',name))]));
 assert.equal(crypto.createHash('sha256').update(runtimeBytes).digest('hex'),manifest.runtimeSha256);
 // Reinstall after saving profile data and personal settings; both must survive byte for byte.
 fs.mkdirSync(path.join(support,'profile'),{recursive:true});
 const profile=path.join(support,'profile/acceptance-marker'),config=path.join(support,'codex-home/config.toml');
 const personalConfig=fs.readFileSync(config,'utf8')+'\n# personal settings\n';
 fs.writeFileSync(profile,'saved profile');fs.writeFileSync(config,personalConfig);
 const reinstalled=install();assert.equal(reinstalled.exitCode,0,reinstalled.stderr.toString());
 assert.equal(fs.readFileSync(profile,'utf8'),'saved profile');assert.equal(fs.readFileSync(config,'utf8'),personalConfig);
 // Reject another version before changing the working installation.
 const unsupported=path.join(home,'Unsupported.app'),resources=path.join(unsupported,'Contents/Resources');
 fs.mkdirSync(resources,{recursive:true});
 const bytes=fs.readFileSync(source);bytes[bytes.length-1]^=1;fs.writeFileSync(path.join(resources,'app.asar'),bytes);
 const previousArchive=hash(path.join(application,'Contents/Resources/app.asar'));
 const rejected=install(unsupported);assert.notEqual(rejected.exitCode,0);assert.match(rejected.stderr.toString(),/version is not supported/);
 assert.equal(hash(path.join(application,'Contents/Resources/app.asar')),previousArchive);
 assert.equal(fs.readFileSync(profile,'utf8'),'saved profile');assert.equal(fs.readFileSync(config,'utf8'),personalConfig);
 assert.equal(hash(source),sourceHash);
 const launcher=path.join(application,'Contents/MacOS/ChatGPT Hebrew Launcher');
 const launcherStrings=Bun.spawnSync(['/usr/bin/strings',launcher],{stdout:'pipe'}).stdout.toString();
 assert.match(launcherStrings,/--force-ui-direction=rtl/);assert.match(launcherStrings,/CODEX_SPARKLE_ENABLED/);
 assert.match(fs.readFileSync(path.join(support,'runtime/renderer.js'),'utf8'),/פותח על ידי גל חבקין/);
 assert.equal(fs.existsSync(path.join(application,'Contents/Resources/Heebo-OFL.txt')),true);assert.equal(fs.existsSync(path.join(application,'Contents/Resources/ThirdPartyNotices.txt')),true);
 const version=Bun.spawnSync([launcher,'--version'],{env:{HOME:home,PATH:'/usr/bin:/bin'},stdout:'pipe',stderr:'pipe'});
 assert.equal(version.exitCode,0,`Installed launcher failed: ${version.signalCode} ${version.stderr.toString()}`);
 console.log('Compiled installer: installation, signature, runtime digest, metadata, reinstall, profile/settings preservation, unsupported-version rejection, original-app preservation, and launcher invocation passed. Full GUI launch and Gatekeeper approval were not tested.');
}finally{fs.rmSync(home,{recursive:true,force:true});}

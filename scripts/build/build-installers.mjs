import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildRuntime} from './build-runtime.mjs';
import {buildMacOSWrapper,macOSMinimumVersion} from './build-macos-wrapper.mjs';
import {nativeLocaleMessages,readHebrewCatalog} from '../translation/hebrew-catalog.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
function runBuildCommand(command){
 const result=Bun.spawnSync(command,{cwd:root,stdout:'pipe',stderr:'pipe'});
 if(result.exitCode!==0)throw Error(`Installer build failed: ${result.stderr.toString().trim()}`);
 return result.stdout.toString().trim();
}

export async function buildMacOSInstaller(){
 if(process.platform!=='darwin'||process.arch!=='arm64')throw Error('Build this release on an Apple Silicon Mac with the supported ChatGPT installed');
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'chatgpt-installer-build-'));
 const output=path.join(root,'dist/installers'),app=path.join(output,'Install Codex Hebrew.app');
 fs.mkdirSync(output,{recursive:true});
 try{
  const runtime=await buildRuntime({runtimeRoot:path.join(work,'runtime')});
  const wrapper=buildMacOSWrapper({runtime}),resources=path.join(wrapper.wrapperApp,'Contents/Resources');
  const icon=fs.readFileSync(path.join(resources,'electron.icns'));
  const targetVersion=runBuildCommand(['/usr/libexec/PlistBuddy','-c','Print :CFBundleShortVersionString','/Applications/ChatGPT.app/Contents/Info.plist']);
  const runtimeFiles=Object.fromEntries([...runtime.files,'manifest.json'].map(name=>[name,fs.readFileSync(path.join(runtime.runtimeRoot,name)).toString('base64')]));
  const dependencies=path.join(root,'node_modules');
  const licenseFiles=fs.readdirSync(dependencies,{recursive:true}).filter(file=>/^(?:license(?:\..*)?|copying(?:\..*)?)$/i.test(path.basename(file))&&fs.statSync(path.join(dependencies,file)).isFile()).sort();
  const notices=[fs.readFileSync(path.join(root,'LICENSE'),'utf8'),fs.readFileSync(path.join(root,'NOTICE.md'),'utf8'),fs.readFileSync(path.join(root,'assets/licenses/Bun-1.4.2.md'),'utf8'),...licenseFiles.map(file=>`${file}\n\n${fs.readFileSync(path.join(dependencies,file),'utf8')}`)].join('\n\n--------------------\n\n');
  const payload={thirdPartyNotices:notices,fontLicense:fs.readFileSync(path.join(root,'assets/fonts/OFL.txt'),'utf8'),arch:'arm64',targetVersion,sourceArchiveSha256:runtime.sourceArchiveSha256,catalog:readHebrewCatalog(),marketplace:JSON.parse(fs.readFileSync(path.join(root,'catalogs/marketplace-hebrew.json'),'utf8')),nativeLocale:JSON.stringify(nativeLocaleMessages().translations),loader:fs.readFileSync(path.join(root,'runtime/application-loader.cjs'),'utf8'),runtimeFiles,agentConfig:fs.readFileSync(path.join(work,'codex-home/config.toml'),'utf8'),launcher:fs.readFileSync(wrapper.executable).toString('base64'),icon:icon.toString('base64'),iconSha256:sha256(icon)};
  fs.writeFileSync(path.join(output,'payload.json'),JSON.stringify(payload));
  const entry=path.join(output,'installer-entry.mjs');
  fs.writeFileSync(entry,"import payload from './payload.json';\nimport {runMacOSInstaller} from '../../scripts/installation/installer-interface.mjs';\nrunMacOSInstaller(payload);\n");
  fs.rmSync(app,{recursive:true,force:true});
  fs.mkdirSync(path.join(app,'Contents/MacOS'),{recursive:true});
  fs.mkdirSync(path.join(app,'Contents/Resources'),{recursive:true});
  const executable=path.join(app,'Contents/MacOS/Codex Hebrew Installer');
  runBuildCommand([process.execPath,'build',entry,'--compile','--target=bun-darwin-arm64','--no-compile-autoload-dotenv','--no-compile-autoload-bunfig',`--outfile=${executable}`]);
  fs.writeFileSync(path.join(app,'Contents/Resources/AppIcon.icns'),icon);
  fs.copyFileSync(path.join(root,'assets/fonts/OFL.txt'),path.join(app,'Contents/Resources/Heebo-OFL.txt'));
  fs.writeFileSync(path.join(app,'Contents/Resources/ThirdPartyNotices.txt'),notices);
  fs.writeFileSync(path.join(app,'Contents/Info.plist'),`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>community.codex-hebrew.installer</string><key>CFBundleExecutable</key><string>Codex Hebrew Installer</string><key>CFBundleName</key><string>Install Codex Hebrew</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>0.1.0</string><key>CFBundleIconFile</key><string>AppIcon.icns</string><key>LSMinimumSystemVersion</key><string>${macOSMinimumVersion}</string><key>NSHighResolutionCapable</key><true/></dict></plist>`);
  runBuildCommand(['/usr/bin/codesign','--force','--sign','-',app]);
  runBuildCommand(['/usr/bin/codesign','--verify','--deep','--strict',app]);
  const dmg=path.join(output,'Codex-Hebrew-macOS-arm64.dmg');
  fs.rmSync(dmg,{force:true});
  runBuildCommand(['/usr/bin/hdiutil','create','-volname','Codex Hebrew','-srcfolder',app,'-format','UDZO',dmg]);
  const manifest={minimumMacOS:macOSMinimumVersion,platform:'darwin',arch:'arm64',targetVersion,sourceArchiveSha256:runtime.sourceArchiveSha256,installer:path.basename(dmg),sha256:sha256(fs.readFileSync(dmg)),signing:'ad-hoc',notarized:false,windows:'unverified: requires a Windows target and acceptance test'};
  fs.writeFileSync(path.join(output,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  fs.writeFileSync(path.join(output,'SHA256SUMS'),`${manifest.sha256}  ${manifest.installer}\n`);
  return{...manifest,application:app,executable};
 }finally{
  fs.rmSync(work,{recursive:true,force:true});
  fs.rmSync(path.join(output,'payload.json'),{force:true});
  fs.rmSync(path.join(output,'installer-entry.mjs'),{force:true});
 }
}

if(import.meta.main)console.log(JSON.stringify(await buildMacOSInstaller(),null,2));

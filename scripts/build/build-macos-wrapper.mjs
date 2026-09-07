import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {rewriteAsarFiles} from '../analysis/asar-archive.mjs';
import {createNativeWrapperAssets} from './native-wrapper-assets.mjs';
import {readHebrewCatalog} from '../translation/hebrew-catalog.mjs';
import {patchHebrewMetadataResources} from '../rtl/hebrew-metadata-resources.mjs';

export const macOSMinimumVersion='13.0';

const root=fileURLToPath(new URL('../../',import.meta.url));
const hebrewAppIcon=`${root}assets/icons/chatgpt-il.png`;

function installHebrewAppIcon(wrapperApp,work){
 if(!fs.existsSync(hebrewAppIcon))throw Error('Missing Hebrew app icon assets/icons/chatgpt-il.png');
 const preparedPng=path.join(work,'chatgpt-il-1024.png');
 const prepared=Bun.spawnSync(['python3',path.join(root,'scripts/build/prepare-application-icon.py'),hebrewAppIcon,preparedPng],{stdout:'pipe',stderr:'pipe'});
 if(prepared.exitCode!==0)throw Error(`Failed to prepare the Hebrew app icon: ${prepared.stderr.toString().trim()||prepared.stdout.toString().trim()}`);
 const iconset=path.join(work,'AppIcon.iconset');
 fs.rmSync(iconset,{recursive:true,force:true});
 fs.mkdirSync(iconset,{recursive:true});
 for(const [base,scale] of [[16,1],[16,2],[32,1],[32,2],[128,1],[128,2],[256,1],[256,2],[512,1],[512,2]]){
  const px=base*scale,name=scale===1?`icon_${base}x${base}.png`:`icon_${base}x${base}@2x.png`;
  const scaled=Bun.spawnSync(['/usr/bin/sips','-z',String(px),String(px),preparedPng,'--out',path.join(iconset,name)],{stdout:'pipe',stderr:'pipe'});
  if(scaled.exitCode!==0)throw Error(`Failed to scale app icon ${name}: ${scaled.stderr.toString().trim()}`);
 }
 const icns=path.join(work,'AppIcon.icns');
 const built=Bun.spawnSync(['/usr/bin/iconutil','-c','icns',iconset,'-o',icns],{stdout:'pipe',stderr:'pipe'});
 if(built.exitCode!==0)throw Error(`Failed to build the Hebrew app icns: ${built.stderr.toString().trim()}`);
 const resources=path.join(wrapperApp,'Contents/Resources');
 for(const name of ['electron.icns','icon-chatgpt.icns','app.icns'])fs.copyFileSync(icns,path.join(resources,name));
 const plist=path.join(wrapperApp,'Contents/Info.plist');
 Bun.spawnSync(['/usr/libexec/PlistBuddy','-c','Delete :CFBundleIconName',plist],{stdout:'pipe',stderr:'pipe'});
 const iconFile=Bun.spawnSync(['/usr/libexec/PlistBuddy','-c','Set :CFBundleIconFile electron.icns',plist],{stdout:'pipe',stderr:'pipe'});
 if(iconFile.exitCode!==0)throw Error(`Failed to set CFBundleIconFile: ${iconFile.stderr.toString().trim()}`);
}

export function macOSLauncherSource(){
 return `#include <limits.h>\n#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <unistd.h>\nint main(int argc, char **argv) {\n const char *home=getenv("HOME"); if(!home) return 64;\n char root[PATH_MAX], profile[PATH_MAX], codex[PATH_MAX], executable[PATH_MAX], argument[PATH_MAX+32];\n snprintf(root,sizeof(root),"%s/Library/Application Support/ChatGPT Hebrew",home); snprintf(profile,sizeof(profile),"%s/profile",root); snprintf(codex,sizeof(codex),"%s/codex-home",root);\n setenv("CODEX_ELECTRON_USER_DATA_PATH",profile,1); setenv("CODEX_HOME",codex,1); setenv("CODEX_SPARKLE_ENABLED","false",1); snprintf(argument,sizeof(argument),"--user-data-dir=%s",profile);\n strncpy(executable,argv[0],sizeof(executable)-1); executable[sizeof(executable)-1]='\\0'; char *slash=strrchr(executable,'/'); if(!slash) return 64; strcpy(slash+1,"ChatGPT");\n char **next=calloc((size_t)argc+4,sizeof(char*)); if(!next) return 71; next[0]=executable; next[1]=argument; next[2]="--lang=he"; next[3]="--force-ui-direction=rtl"; for(int i=1;i<argc;i++) next[i+3]=argv[i];\n execv(executable,next); perror("ChatGPT Hebrew"); return 70;\n}\n`;
}

export function buildMacOSWrapper({executable='/Applications/ChatGPT.app/Contents/MacOS/ChatGPT',catalog,nativeUi,runtime}={}){
 if(process.platform!=='darwin')throw Error('The macOS wrapper can only be built on macOS');
 const sourceApp=path.resolve(path.dirname(executable),'../..'),sourceAsar=path.join(sourceApp,'Contents/Resources/app.asar');
 const prepared=createNativeWrapperAssets({sourceAsar,catalog}),{sourceSha256,catalogSha256,loaderSha256,implementationSha256,originalMain,changes}=prepared,iconSha256=crypto.createHash('sha256').update(fs.readFileSync(hebrewAppIcon)).update(fs.readFileSync(path.join(root,'scripts/build/prepare-application-icon.py'))).digest('hex'),metadataPatchSource=fs.readFileSync(fileURLToPath(new URL('../rtl/hebrew-metadata-resources.mjs',import.meta.url))),wrapperSha256=crypto.createHash('sha256').update(prepared.wrapperSha256).update(iconSha256).update(metadataPatchSource).update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex'),canonical=readHebrewCatalog(),nativeUiCatalog=nativeUi?JSON.parse(fs.readFileSync(nativeUi,'utf8')):{archiveSha256:canonical.archiveSha256,entries:canonical.native,dynamicEntries:canonical.nativeDynamic},wrapperRoot=path.join('/private/tmp',`chatgpt-rtl-${process.getuid?.()??os.userInfo().uid}`,`macos-wrapper-${sourceSha256.slice(0,12)}-${wrapperSha256.slice(0,12)}`),wrapperApp=path.join(wrapperRoot,'צ׳אט ג׳יפיטי בעברית.app'),manifestFile=path.join(wrapperRoot,'manifest.json');
 if(runtime?.sourceArchiveSha256!==sourceSha256)throw Error('Build the matching Hebrew runtime before the wrapper');
 if(nativeUiCatalog.archiveSha256!==sourceSha256)throw Error('Native UI catalog does not match the installed ASAR');
 const signatureValid=()=>Bun.spawnSync(['/usr/bin/codesign','--verify','--deep','--strict',wrapperApp],{stdout:'ignore',stderr:'ignore'}).exitCode===0;
 if(fs.existsSync(manifestFile)){const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));if(manifest.schemaVersion===9&&manifest.strategy==='main-loader-external-runtime'&&manifest.sourceSha256===sourceSha256&&manifest.wrapperSha256===wrapperSha256&&fs.existsSync(manifest.executable)&&signatureValid()){const current={...manifest,runtimeSha256:runtime.runtimeSha256,runtimeRoot:runtime.runtimeRoot};fs.writeFileSync(manifestFile,JSON.stringify(current,null,2)+'\n',{mode:0o600});return current;}}
 fs.rmSync(wrapperRoot,{recursive:true,force:true});fs.mkdirSync(wrapperRoot,{recursive:true,mode:0o700});
 const copied=Bun.spawnSync(['/bin/cp','-RX',sourceApp,wrapperApp],{stdout:'pipe',stderr:'pipe'});
 if(copied.exitCode!==0)throw Error(`Failed to clone the macOS app wrapper: ${copied.stderr.toString().trim()}`);
 const unquarantined=Bun.spawnSync(['/usr/bin/xattr','-dr','com.apple.quarantine',wrapperApp],{stdout:'pipe',stderr:'pipe'});
 if(unquarantined.exitCode!==0)throw Error(`Failed to clear quarantine from the isolated macOS wrapper: ${unquarantined.stderr.toString().trim()}`);
 const metadata=patchHebrewMetadataResources(path.join(wrapperApp,'Contents/Resources'),canonical,sourceSha256);
 const result=rewriteAsarFiles(sourceAsar,path.join(wrapperApp,'Contents/Resources/app.asar'),changes);
 const executableDirectory=path.join(wrapperApp,'Contents/MacOS'),applicationExecutable=path.join(executableDirectory,'ChatGPT'),launcher=path.join(executableDirectory,'ChatGPT Hebrew Launcher');
 const launcherSource=path.join(wrapperRoot,'launcher.c');
 fs.writeFileSync(launcherSource,macOSLauncherSource());
 const compiled=Bun.spawnSync(['/usr/bin/clang','-Os',`-mmacosx-version-min=${macOSMinimumVersion}`,launcherSource,'-o',launcher],{stdout:'pipe',stderr:'pipe'});
 if(compiled.exitCode!==0)throw Error(`Failed to build the profile-isolating launcher: ${compiled.stderr.toString().trim()}`);
 finalizeMacOSWrapper({wrapperApp,work:wrapperRoot,headerSha256:result.headerSha256,iconSha256,installIcon:installHebrewAppIcon});
 const manifest={schemaVersion:9,strategy:'main-loader-external-runtime',bundleIdentifier:'com.openai.codex.hebrew',sourceApp,sourceSha256,catalogSha256,loaderSha256,implementationSha256,wrapperSha256,originalMain,runtimeSha256:runtime.runtimeSha256,runtimeRoot:runtime.runtimeRoot,wrapperApp,executable:launcher,applicationExecutable,archiveSha256:result.archiveSha256,headerSha256:result.headerSha256,changedAssets:result.changedAssets,metadata,nativeUi:{translated:nativeUiCatalog.entries.filter(entry=>entry.disposition==='translated').length,dynamicTranslated:nativeUiCatalog.dynamicEntries.filter(entry=>entry.disposition==='translated').length}};
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n',{mode:0o600});return manifest;
}

if(import.meta.main){const {buildRuntime}=await import('./build-runtime.mjs'),source='/Applications/ChatGPT.app/Contents/Resources/app.asar',runtime=await buildRuntime({archive:source});console.log(JSON.stringify(buildMacOSWrapper({runtime}),null,2));}

export function finalizeMacOSWrapper({wrapperApp,work,headerSha256,iconSha256,installIcon}){
 const signatureValid=()=>Bun.spawnSync(['/usr/bin/codesign','--verify','--deep','--strict',wrapperApp],{stdout:'ignore',stderr:'ignore'}).exitCode===0;
 const plist=path.join(wrapperApp,'Contents/Info.plist'),updated=Bun.spawnSync(['/usr/libexec/PlistBuddy','-c',`Set :ElectronAsarIntegrity:Resources/app.asar:hash ${headerSha256}`,plist],{stdout:'pipe',stderr:'pipe'});
 if(updated.exitCode!==0)throw Error(`Failed to update wrapper ASAR integrity: ${updated.stderr.toString().trim()}`);
 const sourceBundleVersion=Bun.spawnSync(['/usr/libexec/PlistBuddy','-c','Print :CFBundleVersion',plist],{stdout:'pipe',stderr:'pipe'}).stdout.toString().trim();
 const iconBundleVersion=`${sourceBundleVersion}.${Number.parseInt(iconSha256.slice(0,8),16)}`;
 for(const [key,value] of [['CFBundleIdentifier','com.openai.codex.hebrew'],['CFBundleDisplayName','צ׳אט ג׳יפיטי בעברית'],['CFBundleName','צ׳אט ג׳יפיטי בעברית'],['CFBundleExecutable','ChatGPT Hebrew Launcher'],['CFBundleVersion',iconBundleVersion],['CrProductDirName','com.openai.codex.hebrew']]){
  const changed=Bun.spawnSync(['/usr/libexec/PlistBuddy','-c',`Set :${key} ${value}`,plist],{stdout:'pipe',stderr:'pipe'});
  if(changed.exitCode!==0)throw Error(`Failed to set wrapper ${key}: ${changed.stderr.toString().trim()}`);
 }
 installIcon(wrapperApp,work);
 const entitlements=path.join(work,'entitlements.plist');
 fs.writeFileSync(entitlements,`<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n<key>com.apple.security.app-sandbox</key><false/>\n<key>com.apple.security.cs.allow-jit</key><true/>\n<key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>\n<key>com.apple.security.cs.disable-library-validation</key><true/>\n</dict></plist>\n`);
 const signed=Bun.spawnSync(['/usr/bin/codesign','--deep','--force','--sign','-','--options','runtime','--entitlements',entitlements,wrapperApp],{stdout:'pipe',stderr:'pipe'});
 if(signed.exitCode!==0)throw Error(`Failed to sign the isolated macOS wrapper: ${signed.stderr.toString().trim()}`);
 if(!signatureValid())throw Error('The isolated macOS wrapper signature did not verify');
}

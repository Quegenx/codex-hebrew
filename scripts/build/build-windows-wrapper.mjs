import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {rewriteAsarFiles} from '../analysis/asar-archive.mjs';
import {createNativeWrapperAssets} from './native-wrapper-assets.mjs';
import {readHebrewCatalog} from '../translation/hebrew-catalog.mjs';
import {patchHebrewMetadataResources} from '../rtl/hebrew-metadata-resources.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const hebrewAppIcon=`${root}assets/icons/chatgpt-il.png`;

function installHebrewWindowsIcon(wrapperDirectory,work){
 if(!fs.existsSync(hebrewAppIcon))throw Error('Missing Hebrew app icon assets/icons/chatgpt-il.png');
 const png=path.join(work,'chatgpt-il-1024.png'),ico=path.join(work,'chatgpt-il.ico');
 const prepared=Bun.spawnSync(['python3',path.join(root,'scripts/build/prepare-application-icon.py'),hebrewAppIcon,png,ico],{stdout:'pipe',stderr:'pipe'});
 if(prepared.exitCode!==0)throw Error(`Failed to prepare the Hebrew Windows icon: ${prepared.stderr.toString().trim()||prepared.stdout.toString().trim()}`);
 const resources=path.join(wrapperDirectory,'resources');
 fs.mkdirSync(resources,{recursive:true});
 fs.copyFileSync(ico,path.join(resources,'icon.ico'));
 const iconNames=new Set(['icon.ico','app.ico','electron.ico','chatgpt.ico']);
 function visit(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
   const file=path.join(directory,entry.name);
   if(entry.isDirectory())visit(file);
   else if(entry.isFile()&&iconNames.has(entry.name.toLowerCase()))fs.copyFileSync(ico,file);
  }
 }
 visit(wrapperDirectory);
 const exeName=fs.readdirSync(wrapperDirectory).find(name=>name.toLowerCase().endsWith('.exe'));
 if(exeName){
  const exe=path.join(wrapperDirectory,exeName);
  fs.copyFileSync(ico,path.join(wrapperDirectory,`${path.parse(exeName).name}.ico`));
  const header=fs.readFileSync(exe).subarray(0,2);
  if(header[0]===0x4d&&header[1]===0x5a){
   const rcedit=Bun.which('rcedit');
   const embedded=rcedit
    ?Bun.spawnSync([rcedit,exe,'--set-icon',ico],{stdout:'pipe',stderr:'pipe'})
    :Bun.spawnSync(['python3',path.join(root,'scripts/build/embed-windows-icon.py'),exe,ico],{stdout:'pipe',stderr:'pipe'});
   if(embedded.exitCode!==0)throw Error(`Failed to embed the Hebrew icon in the Windows executable: ${embedded.stderr.toString().trim()||embedded.stdout.toString().trim()}`);
  }
 }
}

export function buildWindowsWrapper({executable,catalog,nativeUi,runtime,platform=process.platform,tempDirectory=os.tmpdir()}={}){
 if(platform!=='win32')throw Error('The Windows wrapper can only be built for Windows');
 if(!executable)throw Error('A Windows ChatGPT executable is required');
 const sourceDirectory=path.dirname(path.resolve(executable)),sourceAsar=path.join(sourceDirectory,'resources','app.asar'),prepared=createNativeWrapperAssets({sourceAsar,catalog}),{sourceSha256,catalogSha256,loaderSha256,implementationSha256,originalMain,changes}=prepared,iconSha256=crypto.createHash('sha256').update(fs.readFileSync(hebrewAppIcon)).update(fs.readFileSync(path.join(root,'scripts/build/prepare-application-icon.py'))).update(fs.readFileSync(path.join(root,'scripts/build/embed-windows-icon.py'))).digest('hex'),metadataPatchSource=fs.readFileSync(fileURLToPath(new URL('../rtl/hebrew-metadata-resources.mjs',import.meta.url))),wrapperSha256=crypto.createHash('sha256').update(prepared.wrapperSha256).update(iconSha256).update(metadataPatchSource).digest('hex'),canonical=readHebrewCatalog(),nativeUiCatalog=nativeUi?JSON.parse(fs.readFileSync(nativeUi,'utf8')):{archiveSha256:canonical.archiveSha256,entries:canonical.native,dynamicEntries:canonical.nativeDynamic};
 if(runtime?.sourceArchiveSha256!==sourceSha256)throw Error('Build the matching Hebrew runtime before the wrapper');
 if(nativeUiCatalog.archiveSha256!==sourceSha256)throw Error('Native UI catalog does not match the installed ASAR');
 const wrapperRoot=path.join(tempDirectory,`chatgpt-rtl-windows-${sourceSha256.slice(0,12)}-${wrapperSha256.slice(0,12)}`),wrapperDirectory=path.join(wrapperRoot,'application'),wrapperExecutable=path.join(wrapperDirectory,path.basename(executable)),manifestFile=path.join(wrapperRoot,'manifest.json');
 if(fs.existsSync(manifestFile)){const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));if(manifest.schemaVersion===2&&manifest.strategy==='main-loader-external-runtime'&&manifest.sourceSha256===sourceSha256&&manifest.wrapperSha256===wrapperSha256&&fs.existsSync(wrapperExecutable))return manifest;}
 fs.rmSync(wrapperRoot,{recursive:true,force:true});fs.mkdirSync(wrapperRoot,{recursive:true});fs.cpSync(sourceDirectory,wrapperDirectory,{recursive:true,dereference:false});
 installHebrewWindowsIcon(wrapperDirectory,wrapperRoot);
 const metadata=patchHebrewMetadataResources(path.join(wrapperDirectory,'resources'),canonical,sourceSha256);
 const result=rewriteAsarFiles(sourceAsar,path.join(wrapperDirectory,'resources','app.asar'),changes);
 const manifest={schemaVersion:2,strategy:'main-loader-external-runtime',sourceDirectory,sourceSha256,catalogSha256,loaderSha256,implementationSha256,wrapperSha256,originalMain,runtimeSha256:runtime.runtimeSha256,runtimeRoot:runtime.runtimeRoot,wrapperDirectory,executable:wrapperExecutable,archiveSha256:result.archiveSha256,headerSha256:result.headerSha256,changedAssets:result.changedAssets,metadata,nativeUi:{translated:nativeUiCatalog.entries.filter(entry=>entry.disposition==='translated').length,dynamicTranslated:nativeUiCatalog.dynamicEntries.filter(entry=>entry.disposition==='translated').length},runtimeVerified:false};
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');return manifest;
}

if(import.meta.main){const executable=process.argv[2],sourceAsar=path.join(path.dirname(path.resolve(executable)),'resources','app.asar'),{buildRuntime}=await import('./build-runtime.mjs'),runtime=await buildRuntime({archive:sourceAsar});console.log(JSON.stringify(buildWindowsWrapper({executable,runtime}),null,2));}

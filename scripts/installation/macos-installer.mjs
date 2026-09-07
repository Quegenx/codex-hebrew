import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openAsar,rewriteAsarFiles} from '../analysis/asar-archive.mjs';
import {assembleNativeWrapperChanges} from '../build/native-wrapper-assets.mjs';
import {finalizeMacOSWrapper} from '../build/build-macos-wrapper.mjs';
import {patchHebrewMetadataResources} from '../rtl/hebrew-metadata-resources.mjs';
import {commitInstallation,createInstallationStage} from './installation-transaction.mjs';

export const hebrewApplicationName='צ׳אט ג׳יפיטי בעברית.app';

function runInstallerCommand(command){
 const result=Bun.spawnSync(command,{stdout:'pipe',stderr:'pipe'});
 if(result.exitCode!==0)throw Error(`Installer command failed (${path.basename(command[0])}): ${result.stderr.toString().trim()}`);
 return result.stdout.toString();
}

export function installMacOSApplication(payload,{sourceApp='/Applications/ChatGPT.app',home=os.homedir()}={}){
 if(process.platform!=='darwin'||process.arch!==payload.arch)throw Error('This installer requires an Apple Silicon Mac.');
 const sourceAsar=path.join(sourceApp,'Contents/Resources/app.asar');
 if(!fs.existsSync(sourceAsar))throw Error('Install the supported ChatGPT application in Applications first.');
 const archive=openAsar(sourceAsar);
 if(archive.hash!==payload.sourceArchiveSha256)throw Error(`This ChatGPT version is not supported. This installer requires ${payload.targetVersion}. The original application was not changed.`);
 const {changes}=assembleNativeWrapperChanges(archive,{canonical:payload.catalog,marketplace:payload.marketplace,catalogData:payload.nativeLocale,loaderSource:payload.loader});
 const applicationRoot=path.join(home,'Library/Application Support/ChatGPT Hebrew');
 // The upstream application uses a macOS Unix socket, whose path must fit sockaddr_un.
 if(Buffer.byteLength(path.join(applicationRoot,'codex-home/ipc/ipc.sock'))>=104)throw Error('Your home folder path is too long for this ChatGPT version. Installation was not changed.');
 const destination=path.join(home,'Applications',hebrewApplicationName),runtimeRoot=path.join(applicationRoot,'runtime');
 const processes=runInstallerCommand(['/bin/ps','-axo','command=']);
 if(processes.split('\n').some(command=>command.startsWith(`${destination}/Contents/`)))throw Error('Quit the Hebrew application before installing an update.');
 fs.mkdirSync(applicationRoot,{recursive:true,mode:0o700});
 const lock=path.join(applicationRoot,'installer.lock');
 let lockFd;
 try{lockFd=fs.openSync(lock,'wx',0o600);}catch(error){if(error.code==='EEXIST')throw Error('Another installation is running, or a previous installation was interrupted.');throw error;}
 let appStage,runtimeStage;
 try{
  appStage=createInstallationStage(destination);runtimeStage=createInstallationStage(runtimeRoot);
  const stagedApp=path.join(appStage,hebrewApplicationName);
  runInstallerCommand(['/bin/cp','-RX',sourceApp,stagedApp]);
  runInstallerCommand(['/usr/bin/codesign','--verify','--deep','--strict',stagedApp]);
  const stagedAsar=path.join(stagedApp,'Contents/Resources/app.asar');
  if(openAsar(stagedAsar).hash!==archive.hash)throw Error('ChatGPT changed during installation. Please try again.');
  patchHebrewMetadataResources(path.join(stagedApp,'Contents/Resources'),payload.catalog,archive.hash);
  const result=rewriteAsarFiles(stagedAsar,stagedAsar,changes);
  fs.writeFileSync(path.join(stagedApp,'Contents/MacOS/ChatGPT Hebrew Launcher'),Buffer.from(payload.launcher,'base64'),{mode:0o755});
  fs.writeFileSync(path.join(stagedApp,'Contents/Resources/Heebo-OFL.txt'),payload.fontLicense);
  fs.writeFileSync(path.join(stagedApp,'Contents/Resources/ThirdPartyNotices.txt'),payload.thirdPartyNotices);
  finalizeMacOSWrapper({wrapperApp:stagedApp,work:appStage,headerSha256:result.headerSha256,iconSha256:payload.iconSha256,installIcon(app){
   for(const name of ['electron.icns','icon-chatgpt.icns','app.icns'])fs.writeFileSync(path.join(app,'Contents/Resources',name),Buffer.from(payload.icon,'base64'));
   const plist=path.join(app,'Contents/Info.plist');
   Bun.spawnSync(['/usr/libexec/PlistBuddy','-c','Delete :CFBundleIconName',plist],{stdout:'ignore',stderr:'ignore'});
   runInstallerCommand(['/usr/libexec/PlistBuddy','-c','Set :CFBundleIconFile electron.icns',plist]);
  }});
  for(const [name,data]of Object.entries(payload.runtimeFiles)){
   if(path.basename(name)!==name)throw Error('Invalid installer runtime filename');
   fs.writeFileSync(path.join(runtimeStage,name),Buffer.from(data,'base64'),{mode:0o600});
  }
  const codexHome=path.join(applicationRoot,'codex-home'),config=path.join(codexHome,'config.toml');
  fs.mkdirSync(codexHome,{recursive:true,mode:0o700});
  let createdConfig=false;
  try{
   try{fs.writeFileSync(config,payload.agentConfig,{flag:'wx',mode:0o600});createdConfig=true;}catch(error){if(error.code!=='EEXIST')throw error;}
   commitInstallation([{staged:stagedApp,destination},{staged:runtimeStage,destination:runtimeRoot}],()=>{
    runInstallerCommand(['/usr/bin/codesign','--verify','--deep','--strict',destination]);
   });
  }catch(error){if(createdConfig)fs.rmSync(config,{force:true});throw error;}
  return{application:destination,runtimeRoot,sourceArchiveSha256:archive.hash};
 }finally{
  if(appStage)fs.rmSync(appStage,{recursive:true,force:true});
  if(runtimeStage)fs.rmSync(runtimeStage,{recursive:true,force:true});
  fs.closeSync(lockFd);fs.rmSync(lock,{force:true});
 }
}

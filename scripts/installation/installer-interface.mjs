import {installMacOSApplication} from './macos-installer.mjs';

const dialogScript=`on run argv
 display dialog (item 1 of argv) with title "Codex Hebrew" buttons {"Cancel", "Install"} default button "Install" cancel button "Cancel"
end run`;
const messageScript=`on run argv
 display dialog (item 1 of argv) with title "Codex Hebrew" buttons {"OK"} default button "OK"
end run`;

export function runMacOSInstaller(payload){
 if(process.argv.includes('--describe')){
  console.log(JSON.stringify({platform:'darwin',arch:payload.arch,targetVersion:payload.targetVersion,sourceArchiveSha256:payload.sourceArchiveSha256}));return;
 }
 // Headless acceptance checks use an isolated home and never launch the application.
 if(process.argv.includes('--install-test')){
  const index=process.argv.indexOf('--install-test'),home=process.argv[index+1];
  if(!home||!/^\/private\/tmp\/ch-test-[^/]+$/.test(home))throw Error('Installer tests require an isolated temporary home');
  console.log(JSON.stringify(installMacOSApplication(payload,{home,sourceApp:process.argv[index+2]||'/Applications/ChatGPT.app'})));return;
 }
 const confirmation=Bun.spawnSync(['/usr/bin/osascript','-e',dialogScript,`Install ChatGPT in Hebrew for this user?\n\nRequires ChatGPT ${payload.targetVersion}. Your original application and conversations stay unchanged. Quit the Hebrew application before updating.`],{stdout:'ignore',stderr:'pipe'});
 if(confirmation.exitCode!==0)return;
 const progress=Bun.spawn(['/usr/bin/osascript','-e','display dialog "Installing the Hebrew application. This may take a few minutes." with title "Codex Hebrew" buttons {"Installing…"} giving up after 600'],{stdout:'ignore',stderr:'ignore'});
 try{
  const result=installMacOSApplication(payload);
  progress.kill();
  Bun.spawnSync(['/usr/bin/osascript','-e',messageScript,'Installation complete. The Hebrew application is in your Applications folder.'],{stdout:'ignore',stderr:'ignore'});
  const launched=Bun.spawnSync(['/usr/bin/open','-na',result.application,'--args','--lang=he'],{stdout:'ignore',stderr:'pipe'});
  if(launched.exitCode!==0)throw Error('Installed successfully. Open the Hebrew application from your Applications folder.');
 }catch(error){
  progress.kill();
  Bun.spawnSync(['/usr/bin/osascript','-e',messageScript,error.message],{stdout:'ignore',stderr:'ignore'});
  process.exitCode=1;
 }
}

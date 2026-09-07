import {buildMacOSInstaller} from '../build/build-installers.mjs';

const installer=await buildMacOSInstaller();
const opened=Bun.spawnSync(['/usr/bin/open',installer.application],{stdout:'pipe',stderr:'pipe'});
if(opened.exitCode!==0)throw Error(`Could not open the installer: ${opened.stderr.toString().trim()}`);
console.log(`Installer opened: ${installer.application}`);

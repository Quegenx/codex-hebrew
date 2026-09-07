import fs from 'node:fs';
import path from 'node:path';

export function resolveApplicationTarget({platform=process.platform,environment=process.env,executable,exists=fs.existsSync}={}){
 const targetPath=platform==='win32'?path.win32:path;
 const defaults=platform==='darwin'?['/Applications/ChatGPT.app/Contents/MacOS/ChatGPT']:platform==='win32'&&environment.LOCALAPPDATA?[targetPath.join(environment.LOCALAPPDATA,'Programs','ChatGPT','ChatGPT.exe'),targetPath.join(environment.LOCALAPPDATA,'Programs','Codex','Codex.exe'),targetPath.join(environment.LOCALAPPDATA,'Microsoft','WindowsApps','ChatGPT.exe'),targetPath.join(environment.LOCALAPPDATA,'Microsoft','WindowsApps','Codex.exe')]:[];
 const selected=[executable,...defaults].filter(Boolean).map(value=>targetPath.resolve(value)).find(exists);
 if(!selected)throw Error(`No installed ChatGPT executable found for ${platform}; pass its absolute path.`);
 const resources=platform==='darwin'?targetPath.resolve(targetPath.dirname(selected),'../Resources'):[targetPath.join(targetPath.dirname(selected),'resources'),targetPath.join(targetPath.dirname(selected),'Resources')].find(exists);
 if(!resources)throw Error(`No Electron resources directory found beside ${selected}.`);
 const archive=targetPath.join(resources,'app.asar');if(!exists(archive))throw Error(`No app.asar found at ${archive}.`);
 return{platform,executable:selected,resources,archive};
}

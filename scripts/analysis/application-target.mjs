import fs from 'node:fs';
import path from 'node:path';

export function resolveApplicationTarget({platform=process.platform,executable,exists=fs.existsSync}={}){
 if(!['darwin','win32'].includes(platform))throw Error(`Codex Hebrew supports macOS and Windows only, not ${platform}.`);
 const targetPath=platform==='win32'?path.win32:path.posix;
 const selected=[executable,...(platform==='darwin'?['/Applications/ChatGPT.app/Contents/MacOS/ChatGPT']:[])].filter(Boolean).map(value=>targetPath.resolve(value)).find(exists);
 if(!selected)throw Error(`No installed ChatGPT executable found for ${platform}; pass its absolute path.`);
 const resources=targetPath.resolve(targetPath.dirname(selected),platform==='win32'?'resources':'../Resources');
 if(!resources)throw Error(`No Electron resources directory found beside ${selected}.`);
 const archive=targetPath.join(resources,'app.asar');if(!exists(archive))throw Error(`No app.asar found at ${archive}.`);
 return{platform,executable:selected,resources,archive};
}

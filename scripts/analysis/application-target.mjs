import fs from 'node:fs';
import path from 'node:path';

export function resolveApplicationTarget({platform=process.platform,executable,exists=fs.existsSync}={}){
 if(platform!=='darwin')throw Error(`Codex Hebrew supports macOS only, not ${platform}.`);
 const selected=[executable,'/Applications/ChatGPT.app/Contents/MacOS/ChatGPT'].filter(Boolean).map(value=>path.resolve(value)).find(exists);
 if(!selected)throw Error(`No installed ChatGPT executable found for ${platform}; pass its absolute path.`);
 const resources=path.resolve(path.dirname(selected),'../Resources');
 if(!resources)throw Error(`No Electron resources directory found beside ${selected}.`);
 const archive=path.join(resources,'app.asar');if(!exists(archive))throw Error(`No app.asar found at ${archive}.`);
 return{platform,executable:selected,resources,archive};
}

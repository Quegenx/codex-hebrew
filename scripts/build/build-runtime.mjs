import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openAsar} from '../analysis/asar-archive.mjs';
import {buildRendererInjection} from './renderer-injection.mjs';
import {readHebrewCatalog} from '../translation/hebrew-catalog.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
export function defaultRuntimeRoot(platform=process.platform,_environment=process.env,home=os.homedir()){
 if(platform==='win32')return path.join(_environment.LOCALAPPDATA||path.join(home,'AppData','Local'),'Codex Hebrew','runtime');
 if(platform!=='darwin')throw Error(`Codex Hebrew supports macOS only, not ${platform}.`);
 return path.join(home,'Library','Application Support','ChatGPT Hebrew','runtime');
}
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');

export async function buildRuntime({archive='/Applications/ChatGPT.app/Contents/Resources/app.asar',runtimeRoot=defaultRuntimeRoot()}={}){
 const sourceArchiveSha256=openAsar(archive).hash;
 const scan=Bun.spawnSync([process.execPath,`${root}scripts/analysis/scan-messages.mjs`,archive],{cwd:root,stdout:'ignore',stderr:'pipe'});
 if(scan.exitCode!==0)throw Error(`Message scan failed: ${scan.stderr.toString().trim()}`);
 const adaptation=Bun.spawnSync([process.execPath,`${root}scripts/build/build-adaptation.mjs`,archive],{cwd:root,stdout:'ignore',stderr:'pipe'});
 if(adaptation.exitCode!==0)throw Error(`Adaptation build failed: ${adaptation.stderr.toString().trim()}`);
 const injection=await buildRendererInjection({root,archive:sourceArchiveSha256});
 const renderer=`${injection}\nnew Promise(resolve=>{const waitForAttached=(done,checks=0)=>{const status=window.chatgptHebrew?.status();if(status?.status==='attached'&&status.direction?.state==='attached'){done(status);return;}if(checks>=200){done(status||null);return;}setTimeout(()=>waitForAttached(done,checks+1),25);};waitForAttached(initialStatus=>{if(initialStatus?.status!=='attached'){resolve({url:location.href,lang:document.documentElement.lang,dir:document.documentElement.dir,status:initialStatus,contentPreserved:false,restored:false,adapterReplacement:false});return;}const options=window.__chatgptHebrewRuntimeOptions;const firstAdapter=window.chatgptHebrew;firstAdapter.stop();const restored=!document.documentElement.hasAttribute('data-chatgpt-rtl')&&document.querySelectorAll('style[data-chatgpt-r-t-l-style],style[data-chatgpt-r-t-l-asset]').length===0&&!window.chatgptHebrew;window.installChatGPTHebrew(options);waitForAttached(()=>{const replacementSource=window.chatgptHebrew;window.installChatGPTHebrew(options);waitForAttached(status=>{document.getElementById('chatgpt-hebrew-boot')?.remove();const adapterReplacement=replacementSource!==window.chatgptHebrew&&document.querySelectorAll('style[data-chatgpt-r-t-l-style]').length===1&&document.querySelectorAll('style[data-chatgpt-r-t-l-asset]').length===status?.styles?.replacedStylesheets;const value='שלום mixed English 123 https://example.com/path';const node=document.createElement('div'),shimmer=document.createElement('span');node.dataset.messageAuthorRole='user';node.textContent=value;shimmer.className='loading-shimmer';document.body.append(node,shimmer);setTimeout(()=>{const contentPreserved=node.textContent===value&&node.dir==='auto',fontFamily=getComputedStyle(document.body).fontFamily,shimmerTiming=getComputedStyle(shimmer).animationTimingFunction;node.remove();shimmer.remove();resolve({url:location.href,lang:document.documentElement.lang,dir:document.documentElement.dir,marker:document.documentElement.hasAttribute('data-chatgpt-rtl'),rtlStyles:document.querySelectorAll('style[data-chatgpt-r-t-l-style]').length,assetStyles:document.querySelectorAll('style[data-chatgpt-r-t-l-asset]').length,status,contentPreserved,fontFamily,shimmerTiming,restored,adapterReplacement});},0);});});});})`;
 const hebrew=readHebrewCatalog();
 const files={
  'main.cjs':fs.readFileSync(`${root}runtime/electron-main.cjs`),
  'renderer.js':Buffer.from(renderer),
  'native-chrome-hook.cjs':fs.readFileSync(`${root}runtime/native-chrome-hook.cjs`),
  'native-chrome-he.json':Buffer.from(JSON.stringify({archiveSha256:hebrew.archiveSha256,entries:hebrew.native,dynamicEntries:hebrew.nativeDynamic},null,2)+'\n'),
 };
 const runtimeSha256=digest(Buffer.concat(Object.entries(files).sort().flatMap(([name,data])=>[Buffer.from(name),data]))),manifest={schemaVersion:2,sourceArchiveSha256,runtimeSha256,files:Object.keys(files).sort()};
 fs.mkdirSync(runtimeRoot,{recursive:true,mode:0o700});
 const applicationRoot=path.dirname(runtimeRoot),codexHome=path.join(applicationRoot,'codex-home'),agentLanguage=JSON.parse(fs.readFileSync(`${root}config/agent-language.json`,'utf8'));
 fs.mkdirSync(codexHome,{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(codexHome,'config.toml'),`developer_instructions = ${JSON.stringify(agentLanguage.developerInstructions)}\n\n[desktop]\nlocaleOverride = "he"\n`,{mode:0o600});
 fs.rmSync(path.join(runtimeRoot,'preload.cjs'),{force:true});
 fs.rmSync(path.join(runtimeRoot,'status.json'),{force:true});
 for(const [name,data]of Object.entries(files))fs.writeFileSync(path.join(runtimeRoot,name),data,{mode:0o600});
 fs.writeFileSync(path.join(runtimeRoot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
 return{...manifest,runtimeRoot,rendererPath:path.join(runtimeRoot,'renderer.js'),statusPath:path.join(runtimeRoot,'status.json')};
}

if(import.meta.main)console.log(JSON.stringify(await buildRuntime({archive:process.argv[2],runtimeRoot:process.argv[3]}),null,2));

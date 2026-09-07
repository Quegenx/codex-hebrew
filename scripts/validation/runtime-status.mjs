import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openAsar} from '../analysis/asar-archive.mjs';
import {adaptationFingerprint} from './translation-coverage.mjs';
import {defaultRuntimeRoot} from '../build/build-runtime.mjs';
import {readHebrewCatalog} from '../translation/hebrew-catalog.mjs';
import {verifyHebrewMetadataResources} from '../rtl/hebrew-metadata-resources.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const runtimeRoot=process.argv[2]||defaultRuntimeRoot(),archive=process.argv[3]||'/Applications/ChatGPT.app/Contents/Resources/app.asar',statusFile=path.join(runtimeRoot,'status.json'),manifestFile=path.join(runtimeRoot,'manifest.json');
const deadline=Date.now()+30_000;let status=null;
while(Date.now()<deadline){
 if(fs.existsSync(statusFile)){
  status=JSON.parse(fs.readFileSync(statusFile,'utf8'));
  const attached=status.events?.filter(event=>event.type==='attached')||[],ids=new Set(attached.map(event=>event.webContentsId));
  if(attached.length>ids.size)break;
 }
 await Bun.sleep(200);
}
if(!status)throw Error(`No running Hebrew application reported status at ${statusFile}`);
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8')),target=openAsar(archive);
if(status.schemaVersion!==2||manifest.schemaVersion!==2)throw Error('Unsupported Hebrew runtime status schema');
if(status.sourceArchiveSha256!==target.hash||manifest.sourceArchiveSha256!==target.hash)throw Error('The running Hebrew application does not match the installed ChatGPT build');
const attached=status.windows.filter(window=>{try{const url=new URL(window.url);return url.protocol==='app:'&&url.host==='-'&&url.pathname==='/index.html'&&window.status?.status==='attached';}catch{return false;}});
const initial=attached[0]||null,attachedEvents=status.events.filter(event=>event.type==='attached'),windowIds=new Set(attachedEvents.map(event=>event.webContentsId));
let nativeChrome=null,nativeMenus=null;
if(process.platform==='darwin'&&Number.isInteger(status.pid)){
 const marker=path.join(os.tmpdir(),`chatgpt-rtl-native-chrome-${status.pid}.json`);if(fs.existsSync(marker))nativeChrome=JSON.parse(fs.readFileSync(marker,'utf8'));
 const source=`function run(argv) { const se=Application("System Events"); const p=se.applicationProcesses.whose({unixId:Number(argv[0])})[0]; return JSON.stringify(p.menuBars[0].menuBarItems().map(item => { let entries=[]; try { entries=item.menus[0].menuItems().map(x => { try { return x.name(); } catch (_) { return null; } }); } catch (_) {} return {title:item.name(),items:entries}; })); }`;
 const run=Bun.spawnSync(['/usr/bin/osascript','-l','JavaScript','-e',source,'--',String(status.pid)],{stdout:'pipe',stderr:'pipe'});
 if(run.exitCode===0)nativeMenus={pid:status.pid,menus:JSON.parse(run.stdout.toString())};
}
let metadata={complete:true,entries:0,files:0};
if(process.platform==='darwin')metadata=verifyHebrewMetadataResources(path.join(os.homedir(),'Applications','צ׳אט ג׳יפיטי בעברית.app','Contents','Resources'),readHebrewCatalog());
const checks={attached:Boolean(initial),documentRTL:initial?.lang==='he'&&initial?.dir==='rtl',radixDirection:initial?.status?.direction?.state==='attached',stylesApplied:(initial?.rtlStyles??0)===1&&(initial?.assetStyles??-1)===initial?.status?.styles?.replacedStylesheets,heeboFont:initial?.fontFamily?.includes('Heebo')===true,smoothShimmer:initial?.shimmerTiming==='linear',idlePollingStopped:initial?.status?.polling===false,noPostRenderTranslations:initial?.status?.postRenderTranslations===false,metadataPreRendered:metadata.complete,contentPreserved:initial?.contentPreserved===true,multipleWindows:windowIds.size>1,reloadPassed:attachedEvents.length>windowIds.size,restored:initial?.restored===true,adapterReplacement:initial?.adapterReplacement===true,nativeLocaleHebrew:status.locale==='he',nativeMenusHebrew:Boolean(nativeChrome?.menuLabels?.includes('קובץ')&&nativeChrome.menuLabels.includes('עריכה')),nativeChromeHook:nativeChrome?.archiveSha256===target.hash&&nativeChrome.translated>0&&nativeChrome.dynamicTranslated>0};
const report={schemaVersion:3,generatedAt:new Date().toISOString(),platform:process.platform,archiveSha256:target.hash,adaptationSha256:adaptationFingerprint(root),runtimeSha256:manifest.runtimeSha256,pid:status.pid,profilePath:status.profilePath,checks,snapshots:{initial},metadata,nativeMenus,nativeChrome,events:status.events,complete:['attached','documentRTL','radixDirection','stylesApplied','heeboFont','smoothShimmer','idlePollingStopped','noPostRenderTranslations','metadataPreRendered','contentPreserved','reloadPassed','restored','adapterReplacement','nativeLocaleHebrew','nativeChromeHook'].every(check=>checks[check]),reloadPassed:checks.reloadPassed,restored:checks.restored,adapterReplacement:checks.adapterReplacement,multipleWindows:checks.multipleWindows};
fs.writeFileSync(path.join(root,'reports/runtime-current.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({complete:report.complete,checks,report:'reports/runtime-current.json'}));
if(!report.complete)process.exitCode=1;

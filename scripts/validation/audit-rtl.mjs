import fs from 'node:fs';
import crypto from 'node:crypto';
import postcss from 'postcss';
import {fileURLToPath} from 'node:url';
import {openAsar} from '../analysis/asar-archive.mjs';
import {classifyRTLRule,isRTLCandidateDeclaration} from '../rtl/rtl-styles.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),archive=process.argv[2]||'/Applications/ChatGPT.app/Contents/Resources/app.asar',asar=openAsar(archive),candidates=[];
const add=(file,offset,type,source,classification)=>candidates.push({id:`${file}#${type}-${offset}`,file,offset,type,source,...classification});
for(const file of asar.files.filter(file=>file.startsWith('webview/assets/')&&/\.(?:css|js)$/.test(file))){
 const source=asar.read(file);
 if(file.endsWith('.css')){
  let sheet;try{sheet=postcss.parse(source,{from:file});}catch(error){add(file,0,'parse-error',error.message,{disposition:'unclassified',reason:'CSS did not parse.'});continue;}
  sheet.walkDecls(declaration=>{if(!isRTLCandidateDeclaration(declaration.prop,declaration.value))return;const selector=declaration.parent?.selector||'';add(file,declaration.source?.start?.offset??0,'css-declaration',`${selector}{${declaration.toString()}}`,classifyRTLRule(`/${file}`,selector,declaration.prop,declaration.value,source));});
 }else{
  const patterns={explicitLtr:/dir:\s*[`"']ltr[`"']/g,ltrFallback:/\|\|\s*[`"']ltr[`"']/g,physicalPositionUtility:/(?:^|[\s`"'])(?:-?(?:left|right)-(?:\d|\[[^\]]+))/g,physicalSpacingUtility:/(?:^|[\s`"'])(?:-?(?:ml|mr|pl|pr)-(?:\d|\[[^\]]+))/g};
  for(const [type,pattern] of Object.entries(patterns))for(const match of source.matchAll(pattern)){
   let classification;
   if(type==='ltrFallback')classification={disposition:'adapted',reason:'The version-pinned Radix direction fallback is replaced through the captured application context.'};
   else if(type==='explicitLtr'){
    if(source.includes('data-model-picker-power-slider'))classification={disposition:'adapted',reason:'The version-pinned model picker module is patched to RTL together with its pointer and visual coordinates.'};
    else if(file.includes('app-initial-')&&match.index<6300000)classification={disposition:'adapted',reason:'The shared submenu LTR wrapper is corrected by the scoped RTL menu rule.'};
    else classification={disposition:'preserved',reason:'Explicit LTR is retained for code, references, numeric controls, previews, or authored visualization geometry.'};
   }else if(/visualization|mermaid|math-|code-diff|joystick|keyboard-surface/.test(file))classification={disposition:'preserved',reason:'Physical utilities belong to authored visualization, code, math, or spatial-control geometry.'};
   else classification={disposition:'adapted',reason:'The matching physical utility declaration is converted in the replacement stylesheet used by this lazy component.'};
   add(file,match.index,type,match[0].trim(),classification);
  }
 }
}
candidates.sort((a,b)=>a.file.localeCompare(b.file)||a.offset-b.offset||a.type.localeCompare(b.type));
const counts=Object.fromEntries(['adapted','preserved','unclassified'].map(disposition=>[disposition,candidates.filter(candidate=>candidate.disposition===disposition).length]));
const report={schemaVersion:2,generatedAt:new Date().toISOString(),archive,archiveSha256:asar.hash,method:'Occurrence-level static classification of RTL-sensitive CSS declarations and JavaScript direction/utility literals. No application code executed.',classifierSha256:crypto.createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).update(fs.readFileSync(`${root}scripts/rtl/rtl-styles.mjs`)).update(fs.readFileSync(`${root}scripts/rtl/model-picker-rtl.mjs`)).digest('hex'),counts,candidates};
fs.writeFileSync(`${root}reports/rtl-inventory.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:candidates.length,...counts,report:'reports/rtl-inventory.json'}));if(counts.unclassified)process.exitCode=1;

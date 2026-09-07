import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {signature} from '../translation/icu-signature.mjs';
import {parse} from '@formatjs/icu-messageformat-parser';
import {readHebrewCatalog} from '../translation/hebrew-catalog.mjs';
function visibleLiterals(text){const parts=[];function visit(nodes){for(const n of nodes){if(n.type===0)parts.push(n.value);if(n.children)visit(n.children);if(n.options)for(const o of Object.values(n.options))visit(o.value);}}try{visit(parse(text));}catch{}return parts.join(' ');}
const root=fileURLToPath(new URL('../../',import.meta.url));
const catalog=readHebrewCatalog();
const preservationPath=`${root}config/translation-preservations.json`;
const preservationConfig=fs.existsSync(preservationPath)?JSON.parse(fs.readFileSync(preservationPath,'utf8')):null;
const preservationStatus=preservationConfig?.archiveSha256===catalog.archiveSha256?'matched':preservationConfig?'skipped-version-mismatch':'missing';
const preservationMap=new Map(preservationStatus==='matched'?preservationConfig.entries.map(entry=>[entry.id,entry]):[]);
const catalogMap=new Map(catalog.messages.map(message=>[message.id,message]));
const preservationErrors=[];
if(preservationStatus==='matched')for(const entry of preservationConfig.entries){const message=catalogMap.get(entry.id);if(!message)preservationErrors.push({id:entry.id,reason:'missing-catalog-entry'});else if(message.source!==entry.source)preservationErrors.push({id:entry.id,reason:'source-changed'});else if(message.translation!==message.source)preservationErrors.push({id:entry.id,reason:'translation-no-longer-preserved'});}
const missing=[],structural=[],review=[],preserved=[];
for(const m of catalog.messages){
  if(m.status==='obsolete')continue;
  if(!m.translation){missing.push(m.id);continue;}
  try{if(signature(m.source)!==signature(m.translation))structural.push({id:m.id,reason:'icu-mismatch'});}catch{structural.push({id:m.id,reason:'icu-syntax'});}
  const urls=m.source.match(/https?:\/\/[^\s<>"{}]+/g)||[];
  for(const url of urls){const target=url.replace(/[).,;]+$/,'');if(!m.translation.includes(target))review.push({id:m.id,reason:'url-changed',source:m.source,translation:m.translation});}
  const code=[...m.source.matchAll(/`([^`\n]+)`/g)].map(m=>m[1]);
  if(code.some(fragment=>!m.translation.includes('`'+fragment+'`')))review.push({id:m.id,reason:'inline-code-changed',source:m.source,translation:m.translation});
  // A review signal, not a failure: formulas and operational identifiers stay in English.
  if(m.translation===m.source&&(visibleLiterals(m.source).match(/[A-Za-z]{2,}/g)||[]).length>=2&&!/^[`\s]|https?:\/\//.test(m.source)){
    const classification=preservationMap.get(m.id);
    if(classification)preserved.push({id:m.id,reason:classification.reason,source:m.source});
    else review.push({id:m.id,reason:'unchanged-english',source:m.source,translation:m.translation});
  }
}
const result={generatedAt:new Date().toISOString(),archiveSha256:catalog.archiveSha256,total:catalog.messages.filter(m=>m.status!=='obsolete').length,translated:catalog.messages.filter(m=>m.status!=='obsolete'&&m.translation).length,missing,structuralErrors:structural,preservationStatus,preservationErrors,preserved,review,reviewNote:'Unclassified review flags require a translation or a version-pinned preservation reason. Draft translations still need linguistic and in-app review.'};
fs.writeFileSync(`${root}reports/translation-audit.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({total:result.total,translated:result.translated,missing:missing.length,structuralErrors:structural.length,preserved:preserved.length,reviewFlags:review.length,preservationErrors:preservationErrors.length}));
if(missing.length||structural.length||review.length||preservationErrors.length||preservationStatus!=='matched')process.exitCode=1;

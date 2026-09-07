import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runtimeTranslator} from './runtime-translations.mjs';
import {readHebrewCatalog,writeHebrewCatalog} from './hebrew-catalog.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const report=JSON.parse(fs.readFileSync(`${root}reports/ui-literal-candidates.json`,'utf8'));
const hebrew=readHebrewCatalog();
const prior=new Map(hebrew.hardcoded.map(entry=>[entry.source,entry]));
const contexts=new Map();
for(const candidate of report.entries){const values=contexts.get(candidate.source)||[];values.push(candidate);contexts.set(candidate.source,values);}
const sources=[...contexts.keys()].sort((a,b)=>a.localeCompare(b));
const protectedSource=source=>/[{}<>]/.test(source)||(!/^GPT-[\d.]+(?: [A-Za-z]+)?$/.test(source)&&/^(?:[A-Z\d_+./:@'"=<>-]+|\/?[\w.-]+\.(?:com|site|toml)|[a-z_]+)$/.test(source));
const translatable=sources.filter(source=>!prior.has(source)&&!protectedSource(source));
const translated=new Map(),translator=runtimeTranslator(root);let done=0;
for(let i=0;i<translatable.length;i+=30){
 const result=await translator.translate(translatable.slice(i,i+30).map(source=>({source,kind:'ui-literal'})));
 for(const entry of result)translated.set(entry.source,entry.translation);
 done+=Math.min(30,translatable.length-i);console.log(`UI literals: ${done}/${translatable.length}`);
}
const entries=sources.map(source=>{
 const existing=prior.get(source);if(existing)return existing;
 if(protectedSource(source))return{source,translation:source,disposition:'preserved',reason:'Code, identifier, path, URL, acronym, formula, placeholder syntax, or protocol notation preserved verbatim.'};
 const translation=translated.get(source);if(!translation)throw Error(`Missing hardcoded UI translation: ${source}`);
 if(translation===source){
  const named=contexts.get(source).every(candidate=>candidate.property==='displayName');
  return named?{source,translation,disposition:'preserved',reason:'Named theme, product, provider, model, device, or application display name preserved verbatim.'}:{source,translation,disposition:'unclassified',reason:'Translation service returned the source unchanged; manual classification required.'};
 }
 return{source,translation,disposition:'translated'};
});
hebrew.archiveSha256=report.archiveSha256;hebrew.hardcoded=entries;writeHebrewCatalog(hebrew);
console.log(JSON.stringify({sources:entries.length,translated:entries.filter(entry=>entry.disposition==='translated').length,preserved:entries.filter(entry=>entry.disposition==='preserved').length,unclassified:entries.filter(entry=>entry.disposition==='unclassified').length,translator:translator.status()}));

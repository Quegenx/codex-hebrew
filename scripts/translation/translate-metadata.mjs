import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runtimeTranslator} from './runtime-translations.mjs';
import {readHebrewCatalog,writeHebrewCatalog} from './hebrew-catalog.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),report=JSON.parse(fs.readFileSync(path.join(root,'reports/metadata-inventory.json'),'utf8')),hebrew=readHebrewCatalog(),prior=new Map(hebrew.metadata.map(entry=>[entry.id,entry]));
const translatable=report.entries.filter(entry=>!prior.has(entry.id)&&!((entry.kind==='skill-name'||entry.kind==='plugin-name')&&/^[a-z0-9-]+$/.test(entry.source)));
const translator=runtimeTranslator(root),translated=new Map();
for(let index=0;index<translatable.length;index+=30){const batch=translatable.slice(index,index+30),result=await translator.translate(batch.map(entry=>({source:entry.source,kind:entry.kind.endsWith('name')?'plugin-name':'plugin-description'})));for(const item of result)translated.set(item.source,item.translation);console.log(`Metadata: ${Math.min(index+30,translatable.length)}/${translatable.length}`);}
const entries=report.entries.map(entry=>{
 const existing=prior.get(entry.id);if(existing&&existing.source===entry.source)return existing;
 if((entry.kind==='skill-name'||entry.kind==='plugin-name')&&/^[a-z0-9-]+$/.test(entry.source))return{...entry,translation:entry.source,disposition:'preserved',reason:'Machine-readable invocation identifier preserved verbatim.'};
 const translation=translated.get(entry.source);if(!translation)throw Error(`Missing metadata translation: ${entry.id}`);
 return translation===entry.source?{...entry,translation,disposition:'preserved',reason:'Technical product terminology returned unchanged and reviewed as a named concept.'}:{...entry,translation,disposition:'translated'};
});
hebrew.archiveSha256=report.archiveSha256;hebrew.metadataResourceSha256=report.resourceSha256;hebrew.metadata=entries;writeHebrewCatalog(hebrew);console.log(JSON.stringify({entries:entries.length,translated:entries.filter(entry=>entry.disposition==='translated').length,preserved:entries.filter(entry=>entry.disposition==='preserved').length,translator:translator.status()}));

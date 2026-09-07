import fs from 'node:fs';
import path from 'node:path';

const pointerParts=pointer=>pointer.split('/').slice(1).map(part=>part.replaceAll('~1','/').replaceAll('~0','~'));
function currentYamlValue(raw){
 const value=raw.trim();
 if(value.startsWith('"'))try{return JSON.parse(value);}catch{}
 return value.replace(/^['"]|['"]$/g,'');
}

export function patchHebrewMetadataResources(resources,catalog,archiveSha256){
 if(catalog.archiveSha256!==archiveSha256)return{entries:0,files:0};
 const grouped=Map.groupBy(catalog.metadata.filter(entry=>entry.disposition==='translated'),entry=>entry.file);
 let changedEntries=0;
 for(const [file,entries]of grouped){
  const target=path.join(resources,file);
  if(!fs.existsSync(target))throw Error(`Missing metadata resource: ${file}`);
  if(file.endsWith('.json')){
   const value=JSON.parse(fs.readFileSync(target,'utf8'));
   for(const entry of entries){
    const parts=pointerParts(entry.pointer),key=parts.pop();let parent=value;
    for(const part of parts)parent=parent?.[part];
    if(parent?.[key]!==entry.source)throw Error(`Metadata resource signature changed: ${entry.id}`);
    parent[key]=entry.translation;changedEntries++;
   }
   fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n');
   continue;
  }
  let text=fs.readFileSync(target,'utf8');
  for(const entry of entries){
   const field=pointerParts(entry.pointer).at(-1),pattern=new RegExp(`^(\\s*${field.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}:\\s*)(.+)$`,'m'),match=text.match(pattern);
   if(!match||currentYamlValue(match[2])!==entry.source)throw Error(`Metadata resource signature changed: ${entry.id}`);
   text=text.replace(pattern,(_,prefix)=>prefix+JSON.stringify(entry.translation));changedEntries++;
  }
  fs.writeFileSync(target,text);
 }
 return{entries:changedEntries,files:grouped.size};
}

export function verifyHebrewMetadataResources(resources,catalog){
 const grouped=Map.groupBy(catalog.metadata.filter(entry=>entry.disposition==='translated'),entry=>entry.file);
 let verified=0;
 for(const [file,entries]of grouped){
  const target=path.join(resources,file);if(!fs.existsSync(target))return{complete:false,entries:verified,files:grouped.size};
  if(file.endsWith('.json')){
   const value=JSON.parse(fs.readFileSync(target,'utf8'));
   for(const entry of entries){let current=value;for(const part of pointerParts(entry.pointer))current=current?.[part];if(current!==entry.translation)return{complete:false,entries:verified,files:grouped.size};verified++;}
  }else{
   const text=fs.readFileSync(target,'utf8');
   for(const entry of entries){const field=pointerParts(entry.pointer).at(-1),match=text.match(new RegExp(`^\\s*${field.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}:\\s*(.+)$`,'m'));if(!match||currentYamlValue(match[1])!==entry.translation)return{complete:false,entries:verified,files:grouped.size};verified++;}
  }
 }
 return{complete:true,entries:verified,files:grouped.size};
}

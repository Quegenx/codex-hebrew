import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const hebrewCatalogPath=fileURLToPath(new URL('../../catalogs/hebrew.json',import.meta.url));

export function readHebrewCatalog(){
  return JSON.parse(fs.readFileSync(hebrewCatalogPath,'utf8'));
}

export function writeHebrewCatalog(catalog){
  const temporary=`${hebrewCatalogPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary,JSON.stringify(catalog,null,2)+'\n');
  fs.renameSync(temporary,hebrewCatalogPath);
}

export function nativeLocaleMessages(catalog=readHebrewCatalog(),reportPath=fileURLToPath(new URL('../../reports/scan.json',import.meta.url))){
  const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  const byId=new Map(catalog.messages.map(message=>[message.id,message]));
  const aliases={'electron.appMenu.file.newWindow':'codex.commandMenuTitle.newWindow'};
  const alternate=catalog.messages.filter(message=>message.descriptorKind==='messageId').map(message=>message.originalId);
  const ids=[...new Set([...report.nativeMessageIds,...alternate])].sort(),translations={},missing=[];
  for(const id of ids){
    const message=byId.get(`@messageId:${id}`)||byId.get(id)||byId.get(aliases[id]);
    if(message?.translation&&['draft','approved'].includes(message.status))translations[id]=message.translation;else missing.push(id);
  }
  return{translations,missing,ids,report};
}

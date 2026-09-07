import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';
import {simple} from 'acorn-walk';
import {openAsar} from './asar-archive.mjs';
import {collectUiLiterals,mergeUiCandidates} from './scan-ui-literals.mjs';

export function scanNativeUi(archive){
 const queue=['.vite/build/early-bootstrap.js'],files=[],seen=new Set(),entries=new Map(),dynamicEntries=new Map(),directSinkSources=new Map(),parseErrors=[];
 while(queue.length){
  const file=queue.pop();if(seen.has(file)||!archive.files.includes(file))continue;seen.add(file);files.push(file);
  const code=archive.read(file);
  try{
   const found=collectUiLiterals(code,file,{additionalUiProperties:['buttons']});mergeUiCandidates(entries,found.entries);mergeUiCandidates(dynamicEntries,found.dynamicEntries,true);
   const ast=parse(code,{ecmaVersion:'latest',sourceType:'module'}),sinkNames=new Set(['showMessageBox','showMessageBoxSync','showOpenDialog','showSaveDialog','showErrorBox','buildFromTemplate']);
   const visit=(node,sink,offset,key)=>{
    if(!node||['type','role','properties','defaultPath'].includes(key))return;
    if(node.type==='ObjectExpression'){
     for(const property of node.properties)if(property.type==='Property')visit(property.value,sink,offset,property.key.name??property.key.value);
    }else if(node.type==='ArrayExpression'){
     for(const item of node.elements)visit(item,sink,offset,key);
    }else{
     const source=node.type==='Literal'?node.value:node.type==='TemplateLiteral'?node.quasis.map((part,index)=>part.value.cooked+(index<node.expressions.length?`{expression${index+1}}`:``)).join(''):undefined;
     if(typeof source!=='string'||!/[A-Za-z]{2}/.test(source))return;
     const id=JSON.stringify([source,sink]),record=directSinkSources.get(id)||{[node.type==='TemplateLiteral'&&node.expressions.length?'sourceTemplate':'source']:source,sink,files:[],offsets:[]};
     if(!record.files.includes(file))record.files.push(file);if(record.offsets.length<20)record.offsets.push(offset);directSinkSources.set(id,record);
    }
   };
   simple(ast,{CallExpression(node){let callee=node.callee;if(callee.type==='SequenceExpression')callee=callee.expressions.at(-1);const name=callee.type==='MemberExpression'?(callee.property.name??callee.property.value):callee.name;if(sinkNames.has(name))for(const argument of node.arguments)visit(argument,name,node.start);}});
  }catch(error){parseErrors.push({file,error:error.message});}
  for(const match of code.matchAll(/require\(["'](\.\/[^"']+)["']\)/g))queue.push(`.vite/build/${match[1].slice(2)}`);
 }
 for(const record of directSinkSources.values()){
  if(record.source&&![...entries.values()].some(entry=>entry.source===record.source)){const entry={source:record.source,property:'argument',tag:'electron',sink:record.sink,files:record.files,occurrences:record.offsets.length,offsets:record.offsets};entries.set(JSON.stringify([entry.source,entry.property,entry.tag,entry.sink]),entry);}
  if(record.sourceTemplate&&![...dynamicEntries.values()].some(entry=>entry.sourceTemplate===record.sourceTemplate)){const entry={sourceTemplate:record.sourceTemplate,property:'argument',tag:'electron',sink:record.sink,files:record.files,occurrences:record.offsets.length,offsets:record.offsets};dynamicEntries.set(JSON.stringify([entry.sourceTemplate,entry.property,entry.tag,entry.sink]),entry);}
 }
 return{schemaVersion:1,archiveSha256:archive.hash,entrypoint:'.vite/build/early-bootstrap.js',bundleFiles:files.sort(),methods:['main-process-require-closure','ui-options','buttons','direct-electron-sinks'],entries:[...entries.values()],dynamicEntries:[...dynamicEntries.values()],directSinkSources:[...directSinkSources.values()],parseErrors};
}

if(import.meta.main){
 const root=fileURLToPath(new URL('../../',import.meta.url)),archive=openAsar(process.argv[2]),report=scanNativeUi(archive);
 fs.writeFileSync(`${root}reports/native-ui-candidates.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({bundleFiles:report.bundleFiles.length,candidates:report.entries.length,dynamicCandidates:report.dynamicEntries.length,directSinkSources:report.directSinkSources.length,parseErrors:report.parseErrors.length}));
 if(report.parseErrors.length)process.exitCode=1;
}

import fs from 'node:fs';
import {parse} from 'acorn';
import {ancestor} from 'acorn-walk';
import {openAsar} from './asar-archive.mjs';

const uiProperties=new Set(['title','label','placeholder','aria-label','ariaLabel','description','shortDescription','longDescription','displayName','subtitle','emptyMessage','message','detail','tooltip','caption','heading','alt']);
const textProperties=new Set(['textContent','innerText','title','placeholder','ariaLabel']);
const literal=node=>node?.type==='Literal'?node.value:node?.type==='TemplateLiteral'&&!node.expressions.length?node.quasis[0].value.cooked:undefined;
function literalNodes(node){
 if(typeof literal(node)==='string')return[node];
 if(node?.type==='ConditionalExpression')return[...literalNodes(node.consequent),...literalNodes(node.alternate)];
 if(node?.type==='ArrayExpression')return node.elements.flatMap(literalNodes);
 return[];
}
function template(node){if(node?.type!=='TemplateLiteral'||!node.expressions.length)return null;return node.quasis.map((part,index)=>part.value.cooked+(index<node.expressions.length?`{expression${index+1}}`:``)).join('');}
function callName(node){let callee=node?.callee;if(callee?.type==='SequenceExpression')callee=callee.expressions.at(-1);return callee?.type==='MemberExpression'?(callee.property.name??callee.property.value):callee?.type==='Identifier'?callee.name:null;}

export function collectUiLiterals(code,file='input.js',{additionalUiProperties=[]}={}){
 const recognizedUiProperties=new Set([...uiProperties,...additionalUiProperties]);
 const ast=parse(code,{ecmaVersion:'latest',sourceType:'module'}),entries=new Map(),dynamicEntries=new Map(),patches=[];
 function add(source,property,tag,sink,offset){
  if(typeof source!=='string'||source.trim().length<2||!/[a-zA-Z]{2}/.test(source)||source.length>600)return;
  const id=JSON.stringify([source,property,tag,sink]);const record=entries.get(id)||{source,property,tag,sink,files:[],occurrences:0,offsets:[]};
  if(!record.files.includes(file))record.files.push(file);if(record.offsets.length<20)record.offsets.push(offset);record.occurrences++;entries.set(id,record);
 }
 function addValue(node,property,tag,sink){
  for(const item of literalNodes(node)){const source=literal(item);add(source,property,tag,sink,item.start);patches.push({source,start:item.start,end:item.end});}
  const source=template(node);if(source){const id=JSON.stringify([source,property,tag,sink]);const record=dynamicEntries.get(id)||{sourceTemplate:source,property,tag,sink,files:[],occurrences:0,offsets:[]};if(!record.files.includes(file))record.files.push(file);if(record.offsets.length<20)record.offsets.push(node.start);record.occurrences++;dynamicEntries.set(id,record);patches.push({sourceTemplate:source,start:node.start,end:node.end,expressions:node.expressions.map(expression=>code.slice(expression.start,expression.end))});}
 }
 ancestor(ast,{
  CallExpression(node){
   const name=callName(node);
   if(name==='jsx'||name==='jsxs'){
    const [type,props]=node.arguments;if(props?.type!=='ObjectExpression')return;
    const properties=new Map(props.properties.filter(property=>property.type==='Property'&&!property.computed).map(property=>[property.key.name??property.key.value,property]));
    if(properties.has('defaultMessage'))return;
    const tag=literal(type)||'component';
    for(const [key,property]of properties)if(key==='children'||recognizedUiProperties.has(key))addValue(property.value,key,tag,'jsx');
   }else if(name==='createElement'){
    const [type,props,...children]=node.arguments,tag=literal(type)||'component';
    if(props?.type==='ObjectExpression'&&!props.properties.some(property=>(property.key?.name??property.key?.value)==='defaultMessage'))for(const property of props.properties){const key=property.key?.name??property.key?.value;if(key==='children'||recognizedUiProperties.has(key))addValue(property.value,key,tag,'createElement');}
    for(const child of children)addValue(child,'children',tag,'createElement');
   }else if(name==='setAttribute'){
    const property=literal(node.arguments[0]);if(['title','placeholder','aria-label'].includes(property))addValue(node.arguments[1],property,'dom','setAttribute');
   }
  },
  ObjectExpression(node,ancestors){
   const parent=ancestors.at(-2);if(parent?.type==='CallExpression'&&['jsx','jsxs','createElement'].includes(callName(parent)))return;
   if(node.properties.some(property=>(property.key?.name??property.key?.value)==='defaultMessage'))return;
   for(const property of node.properties){const key=property.key?.name??property.key?.value;if(recognizedUiProperties.has(key))addValue(property.value,key,'object','ui-options');}
  },
  AssignmentExpression(node){
   if(node.left.type!=='MemberExpression')return;const property=node.left.computed?literal(node.left.property):node.left.property.name;if(textProperties.has(property))addValue(node.right,property,'dom','assignment');
  },
 });
 return {entries:[...entries.values()],dynamicEntries:[...dynamicEntries.values()],patches};
}

export function mergeUiCandidates(target,items,dynamic=false){
 for(const item of items){
  const source=dynamic?item.sourceTemplate:item.source,id=JSON.stringify([source,item.property,item.tag,item.sink]),record=target.get(id)||{...item,files:[],occurrences:0,offsets:[]};
  for(const file of item.files)if(!record.files.includes(file))record.files.push(file);
  record.occurrences+=item.occurrences;
  record.offsets.push(...item.offsets.slice(0,Math.max(0,20-record.offsets.length)));
  target.set(id,record);
 }
}

if(import.meta.main){
 const archive=openAsar(process.argv[2]),entries=new Map(),dynamicEntries=new Map(),parseErrors=[];
 for(const file of archive.files.filter(name=>name.startsWith('webview/assets/')&&name.endsWith('.js'))){
  try{
   const found=collectUiLiterals(archive.read(file),file);
   mergeUiCandidates(entries,found.entries);
   mergeUiCandidates(dynamicEntries,found.dynamicEntries,true);
  }catch(error){parseErrors.push({file,error:error.message});}
 }
 const report={archiveSha256:archive.hash,methods:['jsx','createElement','ui-options','setAttribute','assignment'],entries:[...entries.values()],dynamicEntries:[...dynamicEntries.values()],parseErrors};
 fs.writeFileSync('reports/ui-literal-candidates.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({candidates:entries.size,uniqueSources:new Set([...entries.values()].map(entry=>entry.source)).size,dynamicCandidates:dynamicEntries.size,parseErrors:parseErrors.length}));
 if(parseErrors.length)process.exitCode=1;
}

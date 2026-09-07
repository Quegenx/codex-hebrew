import fs from 'node:fs';
import crypto from 'node:crypto';
import {hebrewUiTranslationInstructions} from './hebrew-ui-style.mjs';
import {readHebrewCatalog,writeHebrewCatalog} from './hebrew-catalog.mjs';
const controls=/[\u202a-\u202e\u2066-\u2069]/u;
const key=s=>crypto.createHash('sha256').update(s).digest('hex');
export function validateItems(items){
 if(!Array.isArray(items)||items.length>50)throw Error('Invalid batch');
 return items.map(item=>{
  if(!['plugin-description','plugin-name','plugin-category','ui-literal'].includes(item?.kind)||typeof item.source!=='string'||!item.source.trim()||item.source.length>4000||controls.test(item.source))throw Error('Invalid UI metadata');
  return {source:item.source,kind:item.kind};
 });
}
export function runtimeTranslator(root){
 const hebrew=readHebrewCatalog(),cache=hebrew.runtimeCache;
 let queue=Promise.resolve();let requests=0;
 const config=JSON.parse(fs.readFileSync(`${root}config/translation.json`,'utf8'));
 const known=new Map();
 for(const m of hebrew.messages){if(m.translation&&!/[{}<>]/.test(m.source)){const values=known.get(m.source)||new Set();values.add(m.translation);known.set(m.source,values);}}
 for(const [source,values]of known)if(values.size===1)cache[key(source)]={source,translation:[...values][0]};
 function save(){hebrew.runtimeCache=cache;writeHebrewCatalog(hebrew);}
 async function translate(items){
  items=validateItems(items);
  const missing=[...new Map(items.filter(m=>!cache[key(m.source)]).map(m=>[m.source,m])).values()];
  if(missing.length){
   if(!process.env.OPENAI_API_KEY||!process.env.OPENAI_MODEL)throw Error('Translation credentials unavailable');
   const payload={model:process.env.OPENAI_MODEL,store:false,reasoning:{effort:'low'},max_output_tokens:12000,
    instructions:hebrewUiTranslationInstructions,
    input:JSON.stringify(missing.map((m,i)=>({id:String(i),...m}))),text:{format:{type:'json_schema',name:'ui_translations',strict:true,schema:{type:'object',properties:{translations:{type:'array',items:{type:'object',properties:{id:{type:'string'},translation:{type:'string'}},required:['id','translation'],additionalProperties:false}}},required:['translations'],additionalProperties:false}}}};
   let result;
   for(let attempt=0;attempt<3;attempt++){
    const response=await fetch(config.endpoint,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(90000)});
    if(response.ok){result=await response.json();break;}
    if(![429,500,502,503,504].includes(response.status)||attempt===2)throw Error(`Translation service HTTP ${response.status}`);
    await Bun.sleep(1000*(attempt+1));
   }
   if(result?.status!=='completed')throw Error('Incomplete translation response');
   const text=(result.output||[]).flatMap(x=>x.type==='message'?x.content||[]:[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
   const translated=JSON.parse(text).translations;
   if(!Array.isArray(translated)||translated.length!==missing.length)throw Error('Translation count mismatch');
   const seen=new Set(),pending=[];
   for(const t of translated){
    const index=Number(t.id),source=missing[index]?.source;
    if(String(index)!==t.id||!source||seen.has(index)||typeof t.translation!=='string'||!t.translation.trim()||controls.test(t.translation))throw Error('Invalid translation response');
    const protectedTokens=source.match(/https?:\/\/[^\s<>]+|`[^`]+`|\$[A-Za-z0-9_-]+/g)||[];
    if(protectedTokens.some(token=>!t.translation.includes(token)))throw Error('Translation changed protected text');
    seen.add(index);pending.push({source,translation:t.translation,model:process.env.OPENAI_MODEL,kind:missing[index].kind});
   }
   for(const entry of pending)cache[key(entry.source)]=entry;
   requests++;save();
   fs.appendFileSync(`${root}reports/runtime-translation-usage.jsonl`,JSON.stringify({at:new Date().toISOString(),count:pending.length,model:process.env.OPENAI_MODEL,usage:result.usage})+'\n',{mode:0o600});
  }
  return items.map(m=>({source:m.source,translation:cache[key(m.source)].translation}));
 }
 return {translate(items){const next=queue.then(()=>translate(items));queue=next.catch(()=>{});return next;},translateConcurrent:translate,status:()=>({cached:Object.keys(cache).length,requests})};
}

import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {signature} from './icu-signature.mjs';
import {hebrewUiTranslationInstructions} from './hebrew-ui-style.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const args=process.argv.slice(2);
function option(name,fallback){const i=args.indexOf(name);return i<0?fallback:args[i+1];}
const locale=option('--locale','he');
const concurrency=Number(option('--concurrency',6));
const batchSize=Number(option('--batch-size',80));
const limit=Number(option('--limit',100000));
if(!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)||!Number.isInteger(concurrency)||concurrency<1||concurrency>12||!Number.isInteger(batchSize)||batchSize<1||batchSize>150||!Number.isInteger(limit)||limit<1)throw new Error('Invalid options');
if(locale!=='he')throw new Error('This project has one canonical Hebrew catalog');
if(!process.env.OPENAI_API_KEY||!process.env.OPENAI_MODEL)throw new Error('Configure the workspace .env');
const model=process.env.OPENAI_MODEL;
const file=`${root}catalogs/hebrew.json`;
const lock=`${root}reports/bulk-${locale}.lock`;
let lockFd;
try{lockFd=fs.openSync(lock,'wx',0o600);}catch{throw new Error(`Another bulk run may be active; inspect ${lock} before removing a stale lock.`);}
fs.writeFileSync(lockFd,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
const runId=new Date().toISOString().replace(/[:.]/g,'-');
const journal=`${root}reports/bulk-${runId}.jsonl`;
const progressPath=`${root}reports/bulk-progress.json`;
const source=new Map(JSON.parse(fs.readFileSync(`${root}catalogs/source/en.json`,'utf8')).messages.map(m=>[m.id,m]));
const stats={runId,model,locale,startedAt:new Date().toISOString(),requests:0,retries:0,saved:0,reused:0,failed:0,inputTokens:0,outputTokens:0,remaining:0,status:'running'};
let stopping=false,fatal=false;
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
function progress(){fs.writeFileSync(progressPath,JSON.stringify({...stats,updatedAt:new Date().toISOString()},null,2)+'\n');}
function record(event){fs.appendFileSync(journal,JSON.stringify({model,...event,at:new Date().toISOString()})+'\n');}
function valid(original,text){
  if(typeof text!=='string'||(!text.trim()&&original.source.trim()))return 'empty-text';
  if(/[\u202a-\u202e\u2066-\u2069]/u.test(text))return 'bidi-controls';
  try{if(signature(original.source)!==signature(text))return 'icu-mismatch';}catch{return 'icu-syntax';}
  if(/exact confirmation keyword|must type this|must type the exact/i.test(original.description)&&/^\w+$/.test(original.source)&&text!==original.source)return 'confirmation-keyword';
  return null;
}
// Every save re-reads the file and checks source hashes, retaining concurrent edits.
function save(rows){
  if(!rows.length)return;
  record({type:'validated-translations',rows});
  const catalog=JSON.parse(fs.readFileSync(file,'utf8'));
  const byId=new Map(catalog.messages.map(m=>[m.id,m]));
  let count=0;
  for(const row of rows){const m=byId.get(row.id);if(!m||m.sourceHash!==row.sourceHash||!['untranslated','needs-review'].includes(m.status)||m.translation)continue;
    m.translation=row.translation;m.status='draft';m.translationModel=model;m.translationRun=runId;if(row.reusedFrom)m.translationReusedFrom=row.reusedFrom;count++;
  }
  const temporary=`${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary,JSON.stringify(catalog,null,2)+'\n');fs.renameSync(temporary,file);
  stats.saved+=count;stats.remaining-=count;progress();
}
const schema={type:'object',properties:{translations:{type:'array',items:{type:'object',properties:{key:{type:'integer'},text:{type:'string'}},required:['key','text'],additionalProperties:false}}},required:['translations'],additionalProperties:false};
async function translate(batch){
  stats.requests++;progress();
  const input=batch.map((job,key)=>({key,id:job.message.id,source:job.message.source,context:job.message.description,previousValidationError:job.error||undefined}));
  const response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(120000),
    body:JSON.stringify({model,store:false,reasoning:{effort:'low'},max_output_tokens:18000,
      instructions:hebrewUiTranslationInstructions,
      input:JSON.stringify(input),text:{format:{type:'json_schema',name:'ui_translations',strict:true,schema}}}),
  });
  if(!response.ok){const error=new Error(`HTTP ${response.status}`);error.status=response.status;throw error;}
  const result=await response.json();
  stats.inputTokens+=result.usage?.input_tokens||0;stats.outputTokens+=result.usage?.output_tokens||0;
  record({type:'usage',usage:result.usage,status:result.status});
  if(result.status!=='completed')throw new Error('Incomplete response');
  const parts=(result.output||[]).flatMap(o=>o.type==='message'?o.content||[]:[]);
  if(parts.some(p=>p.type==='refusal'))throw new Error('Refusal');
  const data=JSON.parse(parts.filter(p=>p.type==='output_text').map(p=>p.text).join(''));
  if(!Array.isArray(data.translations))throw new Error('Invalid response schema');
  const counts=new Map();for(const item of data.translations)counts.set(item.key,(counts.get(item.key)||0)+1);
  const rows=[],retry=[];
  for(let key=0;key<batch.length;key++){
    const job=batch[key];const item=data.translations.find(row=>row.key===key);
    const error=counts.get(key)!==1?'missing-or-duplicate-key':valid(job.message,item?.text);
    if(error){retry.push({...job,error,attempt:job.attempt+1});continue;}
    for(const m of job.members)rows.push({id:m.id,sourceHash:m.sourceHash,translation:item.text,reusedFrom:m.id!==job.message.id?job.message.id:undefined});
  }
  save(rows);return retry;
}
try{
  const catalog=JSON.parse(fs.readFileSync(file,'utf8'));
  // Resume results journaled before a crash but not yet committed to the catalog.
  const available=new Map();
  for(const m of catalog.messages)if(['approved','draft'].includes(m.status)&&m.translation&&!valid(m,m.translation))available.set(m.sourceHash,{text:m.translation,id:m.id});
  for(const name of fs.readdirSync(`${root}reports`).filter(n=>/^bulk-.*\.jsonl$/.test(n))){
    for(const line of fs.readFileSync(`${root}reports/${name}`,'utf8').split('\n')){
      if(!line)continue;let event;try{event=JSON.parse(line);}catch{continue;}
      if(event.type==='validated-translations')for(const row of event.rows||[])if(!available.has(row.sourceHash))available.set(row.sourceHash,{text:row.translation,id:row.id});
    }
  }
  const pending=catalog.messages.filter(m=>m.status==='untranslated'&&!m.translation&&source.get(m.id)?.sourceHash===m.sourceHash).slice(0,limit);
  stats.remaining=pending.length;stats.selected=pending.length;
  const groups=new Map(),reused=[];
  for(const m of pending){
    const cached=available.get(m.sourceHash);
    if(cached&&!valid(m,cached.text)){reused.push({id:m.id,sourceHash:m.sourceHash,translation:cached.text,reusedFrom:cached.id});continue;}
    if(!groups.has(m.sourceHash))groups.set(m.sourceHash,{message:m,members:[],attempt:0});groups.get(m.sourceHash).members.push(m);
  }
  save(reused);stats.reused=reused.length;
  const queue=[];let chunk=[],chars=0;
  for(const job of groups.values()){
    const size=job.message.source.length+job.message.description.length;
    if(chunk.length&&(chunk.length>=batchSize||chars+size>18000)){queue.push(chunk);chunk=[];chars=0;}
    chunk.push(job);chars+=size;
  }
  if(chunk.length)queue.push(chunk);
  stats.uniqueRequestsPending=queue.length;progress();
  console.log(`Translating ${pending.length} entries in ${queue.length} batches; ${concurrency} concurrent requests. Existing translations retained.`);
  const failures=[];
  function requeue(jobs){const again=[];for(const j of jobs){if(j.attempt>=4){failures.push({id:j.message.id,error:j.error,members:j.members.map(m=>m.id)});stats.failed+=j.members.length;}else again.push(j);}
    for(let i=0;i<again.length;i+=20)queue.push(again.slice(i,i+20));
  }
  await Promise.all(Array.from({length:concurrency},async()=>{
    while(queue.length&&!stopping&&!fatal){
      const batch=queue.shift();
      try{requeue(await translate(batch));}
      catch(e){
        if([400,401,403,404].includes(e.status)){fatal=true;record({type:'fatal',reason:`HTTP ${e.status}`});console.error(`Stopped on HTTP ${e.status}; saved work retained.`);}
        else{stats.retries++;await Bun.sleep(Math.min(15000,1000*2**Math.min(batch[0].attempt,4)));requeue(batch.map(j=>({...j,attempt:j.attempt+1,error:e.status?`HTTP ${e.status}`:'request-or-response-error'})));}
      }
      stats.uniqueRequestsPending=queue.length;progress();console.log(`${stats.saved}/${stats.selected} saved; ${stats.failed} failed; ${queue.length} batches queued.`);
    }
  }));
  fs.writeFileSync(`${root}reports/bulk-failures-${runId}.json`,JSON.stringify(failures,null,2)+'\n');
  stats.status=fatal?'failed':stopping?'interrupted':stats.failed?'needs-review':'completed';
  fs.writeFileSync(`${root}reports/bulk-summary-${runId}.json`,JSON.stringify(stats,null,2)+'\n');
  progress();console.log(JSON.stringify(stats));
  if(fatal||stopping||stats.failed)process.exitCode=1;
}finally{fs.closeSync(lockFd);fs.unlinkSync(lock);}

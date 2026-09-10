import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const [profile,screenshotFile]=process.argv.slice(2);
assert.ok(profile&&screenshotFile,'Pass the isolated verification profile and screenshot output.');
const port=Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
assert.ok(Number.isInteger(port)&&port>0);
const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const pages=targets.filter(target=>target.type==='page'&&target.url.startsWith('app://-/index.html'));
assert.equal(pages.length,1,'Expected exactly one isolated application page.');
const socket=new WebSocket(pages[0].webSocketDebuggerUrl),pending=new Map();let serial=0;
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
socket.addEventListener('message',event=>{const result=JSON.parse(String(event.data)),entry=pending.get(result.id);if(!entry)return;pending.delete(result.id);clearTimeout(entry.timer);result.error?entry.reject(Error(JSON.stringify(result.error))):entry.resolve(result.result);});
function command(method,params={}){return new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error(`Timed out: ${method}`));},30000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
try{
 const state=await evaluate(`({lang:document.documentElement.lang,dir:document.documentElement.dir,status:window.chatgptHebrew?.status(),text:document.body.innerText})`);
 const initialCapture=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(screenshotFile,Buffer.from(initialCapture.data,'base64'));
 console.log(JSON.stringify(state,null,2));
 assert.equal(state.lang,'he');assert.equal(state.dir,'rtl');assert.equal(state.status?.status,'attached');assert.equal(state.status.direction.state,'attached');assert.ok(state.status.catalogSize>30000);assert.ok(/[\u0590-\u05ff]/u.test(state.text));
 const content=await evaluate(`new Promise(resolve=>{const text='שלום OpenAI 123 https://example.com/path',root=document.createElement('article');root.dataset.messageAuthorRole='assistant';const prose=document.createElement('p'),code=document.createElement('pre');prose.textContent=text;code.textContent='const value = "שלום";';root.append(prose,code);document.body.append(root);setTimeout(()=>{const result={preserved:prose.textContent===text,direction:prose.dir,codeDirection:getComputedStyle(code).direction};root.remove();resolve(result);},100);})`);
 assert.deepEqual(content,{preserved:true,direction:'auto',codeDirection:'ltr'});
 await command('Page.reload');
 let reloaded;
 for(let attempt=0;attempt<100;attempt++){
  await new Promise(resolve=>setTimeout(resolve,100));
  try{reloaded=await evaluate(`({lang:document.documentElement.lang,dir:document.documentElement.dir,status:window.chatgptHebrew?.status(),visible:getComputedStyle(document.documentElement).visibility==='visible',text:document.body.innerText})`);}catch{continue;}
  if(reloaded.status?.status==='attached'&&reloaded.status.direction.state==='attached'&&reloaded.visible&&/[\u0590-\u05ff]/u.test(reloaded.text))break;
 }
 assert.equal(reloaded?.status?.status,'attached');assert.equal(reloaded.status.direction.state,'attached');assert.equal(reloaded.lang,'he');assert.equal(reloaded.dir,'rtl');
 assert.equal(reloaded.visible,true);assert.ok(/[\u0590-\u05ff]/u.test(reloaded.text));
 await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
 const capture=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(screenshotFile,Buffer.from(capture.data,'base64'));
 console.log(JSON.stringify({passed:true,lang:state.lang,dir:state.dir,status:state.status,visibleText:state.text,syntheticMixedContent:content,reloadAttached:true,screenshot:screenshotFile},null,2));
}finally{socket.close();}

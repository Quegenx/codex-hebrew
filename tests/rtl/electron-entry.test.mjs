import {test,expect} from 'bun:test';
import {Window} from 'happy-dom';

test('renderer attachment preserves Mac idle behavior and Windows locale reattachment',async()=>{
 const w=new Window({url:'https://example.test/'});
 const keys=['window','document','MutationObserver','location','setInterval','clearInterval'];
 const saved=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const key of ['window','document','MutationObserver','location'])globalThis[key]=key==='window'?w:w[key];
 const intervals=new Map();let nextId=0;
 globalThis.setInterval=(callback,delay)=>{intervals.set(++nextId,{callback,delay});return nextId;};
 globalThis.clearInterval=id=>intervals.delete(id);
 const original={formatMessage(){},messages:{}};
 const provider={props:{locale:'en',messages:{}},state:{intl:original,prevConfig:{}},setState(next){Object.assign(this.state,next);},forceUpdate(){}};
 const options={css:'',styles:{},translations:{greeting:'שלום'}};
 try{
  await import('../../ui/electron-entry.js');
  w.installChatGPTHebrew({...options,platform:'darwin'});
  expect(w.chatgptHebrew.status().polling).toBe(true);
  w.__codexRoot={_internalRoot:{current:{tag:1,stateNode:provider}}};
  [...intervals.values()][0].callback();
  await Promise.resolve();
  expect(w.chatgptHebrew.status().status).toBe('attached');
  expect(provider.state.intl.messages.greeting).toBe('שלום');
  expect(w.chatgptHebrew.status().polling).toBe(false);
  expect(intervals.size).toBe(0);
  w.chatgptHebrew.stop();
  expect(provider.state.intl).toBe(original);
  w.installChatGPTHebrew(options);
  expect(w.chatgptHebrew.status().polling).toBe(false);
  w.chatgptHebrew.stop();
  w.installChatGPTHebrew({...options,platform:'win32'});
  expect(w.chatgptHebrew.status().polling).toBe(true);
  const loaded={formatMessage(){},messages:{late:'Loaded'}};
  provider.state.intl=loaded;
  expect([...intervals.values()][0].delay).toBe(500);
  [...intervals.values()][0].callback();
  expect(provider.state.intl.messages).toMatchObject({late:'Loaded',greeting:'שלום'});
  w.chatgptHebrew.stop();
  expect(provider.state.intl).toBe(loaded);
  expect(intervals.size).toBe(0);
 }finally{
  w.chatgptHebrew?.stop();
  await w.happyDOM.abort();
  for(const [key,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
 }
});

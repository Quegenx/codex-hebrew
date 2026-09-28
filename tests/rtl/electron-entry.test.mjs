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
  // Pet layout uses physical positions; Hebrew captions and menus keep their direction.
  w.happyDOM.setURL('app://-/index.html?initialRoute=%2Favatar-overlay');
  const link=w.document.createElement('link');link.rel='stylesheet';link.href='/assets/pet.css';link.disabled=false;w.document.head.append(link);
  w.document.body.innerHTML='<main dir="ltr" data-hebrew-pet-layout><span data-avatar-overlay-activity-text="title">שיחה חדשה</span><div data-avatar-overlay-native-surface-id="realtime-caption">שלום English</div></main><div role="menu"></div>';
  const petOptions={...options,platform:'win32',styles:{'/assets/pet.css':'.control{translate:50% 0}','/assets/lazy.css':'.badge{inset-inline-end:0}'}};
  w.installChatGPTHebrew(petOptions);
  expect(link.disabled).toBe(false);
  expect(w.document.querySelector('main').dir).toBe('ltr');
  expect(w.document.querySelector('[data-avatar-overlay-activity-text]').dir).toBe('auto');
  expect(w.document.querySelector('[data-avatar-overlay-native-surface-id]').dir).toBe('auto');
  expect(w.document.querySelector('[role=menu]').dir).toBe('rtl');
  const lazy=w.document.createElement('link');lazy.rel='stylesheet';lazy.href='/assets/lazy.css';lazy.disabled=false;w.document.head.append(lazy);
  await new Promise(resolve=>setTimeout(resolve,0));
  expect(lazy.disabled).toBe(false);expect(w.chatgptHebrew.status().styles.replacedStylesheets).toBe(0);
  w.chatgptHebrew.stop();expect(w.document.querySelector('[data-avatar-overlay-activity-text]').hasAttribute('dir')).toBe(false);
  w.happyDOM.setURL('app://-/index.html');
  w.installChatGPTHebrew(petOptions);
  expect(link.disabled).toBe(true);expect(lazy.disabled).toBe(true);
  w.chatgptHebrew.stop();expect(link.disabled).toBe(false);
 }finally{
  w.chatgptHebrew?.stop();
  await w.happyDOM.abort();
  for(const [key,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
 }
});

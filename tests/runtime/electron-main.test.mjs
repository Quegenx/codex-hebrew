import {afterEach, describe, expect, test} from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),directories=[],originalCodexHome=process.env.CODEX_HOME,originalUserData=process.env.CODEX_ELECTRON_USER_DATA_PATH;
afterEach(()=>{delete process.__chatgptHebrewRuntime;if(originalCodexHome===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=originalCodexHome;if(originalUserData===undefined)delete process.env.CODEX_ELECTRON_USER_DATA_PATH;else process.env.CODEX_ELECTRON_USER_DATA_PATH=originalUserData;for(const directory of directories.splice(0))fs.rmSync(directory,{recursive:true,force:true});});

function fixture({argv=['electron','application','--user-data-dir=/fixture-profile'],automaticReload=false}={}){
 const runtimeRoot=fs.mkdtempSync(path.join(os.tmpdir(),'chatgpt-hebrew-runtime-'));directories.push(runtimeRoot);
 fs.writeFileSync(path.join(runtimeRoot,'manifest.json'),JSON.stringify({sourceArchiveSha256:'archive'}));
 fs.writeFileSync(path.join(runtimeRoot,'renderer.js'),'renderer-source');
 fs.writeFileSync(path.join(runtimeRoot,'native-chrome-he.json'),'{}');
 fs.writeFileSync(path.join(runtimeRoot,'native-chrome-hook.cjs'),'exports.installNativeChrome=()=>{};');
 let resolveInjection,nextId=6,userData='/fixture-profile',relaunched=null,exitCode=null;
 class BrowserWindow {
  constructor(options){this.options=options;this.showCount=0;this.inactiveCount=0;this.webContents=new EventEmitter();this.webContents.id=++nextId;this.webContents.getURL=()=>this.url||'app://-/index.html';this.webContents.executeJavaScript=(source,userGesture)=>{this.executed={source,userGesture};return new Promise(resolve=>{resolveInjection=resolve;});};if(automaticReload){this.webContents.reloadCount=0;this.webContents.reload=()=>{this.webContents.reloadCount++;setTimeout(()=>this.webContents.emit('dom-ready'),0);};}}
  show(){this.showCount++;}
  showInactive(){this.inactiveCount++;}
 }
 const electron={BrowserWindow,app:{setPath(name,value){if(name==='userData')userData=value;},getPath(name){if(name==='userData')return userData;},relaunch(options){relaunched=options;},exit(code){exitCode=code;}}};
 const runtime=require('../../runtime/electron-main.cjs').install({runtimeRoot,sourceArchiveSha256:'archive',electron,argv});
 return{runtimeRoot,BrowserWindow:runtime.BrowserWindow,profilePath:runtime.profilePath,runtime,get relaunched(){return relaunched;},get exitCode(){return exitCode;},resolve:value=>resolveInjection(value)};
}

describe('main-process renderer injection',()=>{
 test('holds the ChatGPT window until Hebrew attaches and records status',async()=>{
  const state=fixture(),window=new state.BrowserWindow({show:true,webPreferences:{preload:'/app/.vite/build/preload.js'}});
  expect(state.profilePath).toBe('/fixture-profile');
  expect(state.runtime.locale).toBe('he');
  expect(window.options.show).toBe(false);window.show();window.webContents.emit('dom-ready');
  expect(window.executed).toEqual({source:'renderer-source',userGesture:true});expect(window.showCount).toBe(0);
  state.resolve({url:'app://-/index.html',lang:'he',dir:'rtl',status:{status:'attached'}});await new Promise(resolve=>setTimeout(resolve,0));
  expect(window.showCount).toBe(1);
  expect(JSON.parse(fs.readFileSync(path.join(state.runtimeRoot,'status.json'),'utf8')).windows[0]).toMatchObject({webContentsId:7,lang:'he',dir:'rtl',status:{status:'attached'}});
  expect(JSON.parse(fs.readFileSync(path.join(state.runtimeRoot,'status.json'),'utf8')).locale).toBe('he');
 });

 test('fails closed before application startup when the wrapper omits its profile argument',()=>{
  const state=fixture({argv:['electron','application','--lang=he']});
  const profile=path.join(path.dirname(state.runtimeRoot),'profile');
  expect(state.runtime).toMatchObject({profileArgumentRequired:true,profilePath:profile});expect(state.relaunched).toBeNull();expect(state.exitCode).toBe(0);
 });

 test('reloads once after the first proof and releases startup after reattachment',async()=>{
  const state=fixture({automaticReload:true}),window=new state.BrowserWindow({show:true,webPreferences:{preload:'/app/preload.js'}});window.webContents.emit('dom-ready');
  state.resolve({url:'app://-/index.html',lang:'he',dir:'rtl',status:{status:'attached'},restored:true,adapterReplacement:true});await new Promise(resolve=>setTimeout(resolve,10));
  expect(window.webContents.reloadCount).toBe(1);expect(window.showCount).toBe(0);
  state.resolve({url:'app://-/index.html',lang:'he',dir:'rtl',status:{status:'attached'},restored:true,adapterReplacement:true});await new Promise(resolve=>setTimeout(resolve,10));
  expect(window.webContents.reloadCount).toBe(1);expect(window.showCount).toBe(1);
  const status=JSON.parse(fs.readFileSync(path.join(state.runtimeRoot,'status.json'),'utf8'));expect(status.events.filter(event=>event.type==='attached')).toHaveLength(2);expect(status.windows[0]).toMatchObject({restored:true,adapterReplacement:true});
 });

 test('reattaches after reload, tracks multiple windows, and removes destroyed windows',async()=>{
  const state=fixture(),first=new state.BrowserWindow({webPreferences:{preload:'/app/preload.js'}});first.webContents.emit('dom-ready');state.resolve({url:'app://-/index.html',lang:'he',dir:'rtl',status:{status:'attached'}});await new Promise(resolve=>setTimeout(resolve,0));
  first.webContents.emit('dom-ready');state.resolve({url:'app://-/index.html',lang:'he',dir:'rtl',status:{status:'attached'}});await new Promise(resolve=>setTimeout(resolve,0));
  const second=new state.BrowserWindow({webPreferences:{preload:'/app/preload.js'}});second.webContents.emit('dom-ready');state.resolve({url:'app://-/index.html',lang:'he',dir:'rtl',status:{status:'attached'}});await new Promise(resolve=>setTimeout(resolve,0));
  let status=JSON.parse(fs.readFileSync(path.join(state.runtimeRoot,'status.json'),'utf8'));expect(status.windows).toHaveLength(2);expect(status.events.filter(event=>event.type==='attached')).toHaveLength(3);
  second.webContents.emit('destroyed');status=JSON.parse(fs.readFileSync(path.join(state.runtimeRoot,'status.json'),'utf8'));expect(status.windows).toHaveLength(1);expect(status.events.at(-1)).toMatchObject({type:'destroyed',webContentsId:second.webContents.id});
 });

 test('injects Hebrew into the avatar overlay route',async()=>{
  const state=fixture(),window=new state.BrowserWindow({show:true,webPreferences:{preload:'/app/preload.js'}});window.url='app://-/index.html?initialRoute=%2Favatar-overlay';window.webContents.emit('dom-ready');
  expect(window.executed).toEqual({source:'renderer-source',userGesture:true});state.resolve({url:window.url,lang:'he',dir:'rtl',status:{status:'attached'}});await new Promise(resolve=>setTimeout(resolve,0));expect(window.showCount).toBe(1);
 });

 test('leaves non-ChatGPT windows unchanged',()=>{
  const state=fixture(),window=new state.BrowserWindow({show:true,webPreferences:{preload:'/app/browser-page-preload.js'}});
  expect(window.options.show).toBe(true);window.show();expect(window.showCount).toBe(1);expect(window.executed).toBeUndefined();
 });
});

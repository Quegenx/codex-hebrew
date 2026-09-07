import {afterEach,expect,test} from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {macOSLauncherSource} from '../../scripts/build/build-macos-wrapper.mjs';

const require=createRequire(import.meta.url),{compileCatalog,translateOptions,installNativeChrome}=require('../../runtime/native-chrome-hook.cjs');
let marker;
afterEach(()=>{if(marker)fs.rmSync(marker,{force:true});marker=null;});

const catalog={archiveSha256:'target',entries:[
 {source:'ChatGPT',translation:'ChatGPT',disposition:'translated'},
 {source:'Choose Folder',translation:'בחירת תיקייה',disposition:'translated'},
 {source:'Copy',translation:'העתקה',disposition:'translated'},
 {source:'Look Up “{selection}”',translation:'חיפוש „{selection}”',disposition:'translated'},
],dynamicEntries:[{sourceTemplate:'{expression1} is up to date.',translation:'{expression1} מעודכן.',disposition:'translated'}]};

test('native chrome hook translates dialog, submenu, named, and runtime templates without touching paths',async()=>{
 const compiled=compileCatalog(catalog),source={title:'Choose Folder',buttons:['Copy'],defaultPath:'/Users/example/Choose Folder'};
 expect(translateOptions(source,compiled)).toEqual({title:'בחירת תיקייה',buttons:['העתקה'],defaultPath:'/Users/example/Choose Folder'});expect(source.title).toBe('Choose Folder');
 const tokens=compileCatalog({entries:[{source:'Browser',translation:'דפדפן $& $$',disposition:'translated'}],dynamicEntries:[]});
 expect(translateOptions({label:'About Browser'},tokens)).toEqual({label:'מידע על דפדפן $& $$'});
 const calls=[],electron={dialog:{showMessageBox(options){calls.push(options);return Promise.resolve({response:0});}},Menu:{buildFromTemplate(template){calls.push(template);return template;}}};
 const status=installNativeChrome(electron,catalog);marker=path.join(os.tmpdir(),`chatgpt-rtl-native-chrome-${process.pid}.json`);
 await electron.dialog.showMessageBox({message:'ChatGPT is up to date.',buttons:['Copy']});electron.Menu.buildFromTemplate([{label:'About ChatGPT',submenu:[{label:'Speech'},{label:'Look Up “word”',submenu:[{label:'Copy'}]}]}]);
 expect(calls[0]).toEqual({message:'ChatGPT מעודכן.',buttons:['העתקה']});expect(calls[1][0]).toEqual({label:'מידע על ChatGPT',submenu:[{label:'הקראה'},{label:'חיפוש „word”',submenu:[{label:'העתקה'}]}]});
 expect(status).toMatchObject({archiveSha256:'target',translated:4,dynamicTranslated:1,menuBuilds:1,menuLabels:['מידע על ChatGPT','הקראה','חיפוש „word”','העתקה']});expect(JSON.parse(fs.readFileSync(marker,'utf8'))).toMatchObject(status);
});

test('macOS launcher forces native RTL and disables incompatible official updates',()=>{
 const source=macOSLauncherSource();
 expect(source).toContain('setenv("CODEX_SPARKLE_ENABLED","false",1)');
 expect(source).toContain('next[2]="--lang=he"');
 expect(source).toContain('next[3]="--force-ui-direction=rtl"');
});

import {test,expect} from 'bun:test';
import {collectUiLiterals,mergeUiCandidates} from '../../scripts/analysis/scan-ui-literals.mjs';
import {scanNativeUi} from '../../scripts/analysis/scan-native-ui.mjs';

test('native sink discovery follows nested menus and button arrays while excluding operational fields',()=>{
 const file='.vite/build/early-bootstrap.js';
 const code='Menu.buildFromTemplate([{label:"File",submenu:[{label:`Open ${name}`,role:"ignoredRole"}]}]);dialog.showMessageBox({buttons:["Retry","Cancel"],properties:["ignoredProperty"],defaultPath:"ignoredPath"});';
 const report=scanNativeUi({hash:'fixture',files:[file],read:()=>code});
 expect(report.parseErrors).toEqual([]);
 expect(report.directSinkSources.map(entry=>entry.source||entry.sourceTemplate).sort()).toEqual(['Cancel','File','Open {expression1}','Retry']);
});

test('hardcoded UI discovery covers renderer and DOM sinks but excludes Intl descriptors',()=>{
 const source='jsx("button",{"aria-label":"Zoom"});React.createElement("span",null,"Open");const options={title:"Plugins",detail:`Found ${count} plugins`};node.setAttribute("title","Copy");node.textContent="Clear";const descriptor={id:"catalog",defaultMessage:"Catalog message",description:"Translator context"};';
 const result=collectUiLiterals(source);
 expect(result.entries.map(entry=>entry.source).sort()).toEqual(['Clear','Copy','Open','Plugins','Zoom']);
 expect(result.dynamicEntries.map(entry=>entry.sourceTemplate)).toEqual(['Found {expression1} plugins']);
});

test('merges candidate occurrences across assets without mixing UI contexts',()=>{
 const source='jsx("button",{title:"Open",children:`Found ${count}`});',entries=new Map(),dynamicEntries=new Map();
 for(const [file,code]of [['first.js',source],['second.js',source.repeat(22)+'jsx("button",{"aria-label":"Open"});']]){
  const found=collectUiLiterals(code,file);
  mergeUiCandidates(entries,found.entries);mergeUiCandidates(dynamicEntries,found.dynamicEntries,true);
 }
 expect(entries.size).toBe(2);
 const title=[...entries.values()].find(entry=>entry.property==='title');
 expect(title).toMatchObject({source:'Open',files:['first.js','second.js'],occurrences:23});expect(title.offsets).toHaveLength(20);
 expect([...entries.values()].find(entry=>entry.property==='aria-label').occurrences).toBe(1);
 expect([...dynamicEntries.values()]).toHaveLength(1);
 expect([...dynamicEntries.values()][0]).toMatchObject({sourceTemplate:'Found {expression1}',files:['first.js','second.js'],occurrences:23});
 expect([...dynamicEntries.values()][0].offsets).toHaveLength(20);
});

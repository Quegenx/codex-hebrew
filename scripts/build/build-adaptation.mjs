import fs from 'node:fs';
import {openAsar} from '../analysis/asar-archive.mjs';
import {readStringLiteral} from '../analysis/literal-bindings.mjs';
import {logicalStyles} from '../rtl/rtl-styles.mjs';
import {parse} from 'acorn';
import {simple} from 'acorn-walk';
import {fileURLToPath} from 'node:url';
const a=openAsar(process.argv[2]);
const styles={},report={archiveSha256:a.hash,styles:[]};
for(const file of a.files.filter(f=>f.startsWith('webview/assets/')&&f.endsWith('.css'))){
 const path='/'+file.slice('webview/'.length);
 const result=logicalStyles(a.read(file),`app://-${path}`);
 if(result.changed){styles[path]=result.css;report.styles.push({file,changed:result.changed,preservedRules:result.preservedRules});}
}
const moduleFile=a.files.find(f=>/^webview\/assets\/app-initial-[^.]+\.js$/.test(f));
const source=moduleFile?a.read(moduleFile):'';
const directionalIcons=[];
if(source){simple(parse(source,{ecmaVersion:'latest',sourceType:'module'}),{ObjectExpression(node){
 const fields=new Map(node.properties.filter(p=>p.type==='Property'&&!p.computed).map(p=>[p.key.name??p.key.value,p.value]));
 const name=readStringLiteral(fields.get('name')),body=readStringLiteral(fields.get('body'));
 if(typeof name==='string'&&/^(?:arrow-(?:left|right)|chevron-(?:left|right))-(?:(?:sm|md|lg)-)?(?:light|regular|bold|filled|outline|solid)-/.test(name)&&typeof body==='string'){
  const paths=[...body.matchAll(/\bd="([^"]+)"/g)].map(m=>m[1]);if(paths.length)directionalIcons.push({name,signature:paths.join('||')});
 }
}});}
// Version fingerprint is intentionally conservative. Refuse unknown exports
// instead of modifying an unrelated context after an application upgrade.
const windows=JSON.parse(fs.readFileSync(fileURLToPath(new URL('../../config/windows-target.json',import.meta.url)),'utf8'));
const macKnown=a.hash==='64fc2f27d2dddfa968acfacbe5e4e0328071bdc406351ff4a7d18f0b4692c83d'&&source.includes('Tle as Pln')&&source.includes('c as tdn')&&source.includes('return e||t||`ltr`');
const windowsKnown=a.hash===windows.archiveSha256&&[windows.directionSignature,windows.directionExportSignature,windows.reactExportSignature].every(signature=>source.includes(signature));
const known=macKnown||windowsKnown;
const direction=known?{moduleUrl:`app://-/${moduleFile.slice('webview/'.length)}`,reactExport:windowsKnown?windows.reactExport:'tdn',directionExport:windowsKnown?windows.directionExport:'Pln',directionalIcons}:null;
fs.mkdirSync('.lab',{recursive:true});
fs.writeFileSync('.lab/adaptation.json',JSON.stringify({archiveSha256:a.hash,styles,direction,directionalIcons}));
fs.writeFileSync('reports/rtl-conversion.json',JSON.stringify({...report,directionalIconNames:directionalIcons.map(x=>x.name),directionBridgeSupported:known},null,2)+'\n');
console.log(JSON.stringify({convertedStylesheets:report.styles.length,changedDeclarations:report.styles.reduce((s,r)=>s+r.changed,0),directionalIcons:directionalIcons.length,directionBridgeSupported:known}));

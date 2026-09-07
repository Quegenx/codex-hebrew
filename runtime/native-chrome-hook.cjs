const TEXT_FIELDS=new Set(['title','message','detail','label','sublabel','toolTip','name','buttonLabel']);

function compileCatalog(catalog){
 const translated=catalog.entries.filter(entry=>entry.disposition==='translated'),exact=new Map(translated.filter(entry=>!/{[A-Za-z][A-Za-z0-9]*}/.test(entry.source)).map(entry=>[entry.source,entry.translation]));
 const embedded=new Map(['ChatGPT','Codex','Browser','Chrome','Ultra','Visualize','Sites','Messages'].map(source=>[source,exact.get(source)]).filter(([,translation])=>translation));
 const templateEntries=[...translated.filter(entry=>/{[A-Za-z][A-Za-z0-9]*}/.test(entry.source)).map(entry=>({source:entry.source,translation:entry.translation,token:/\{([A-Za-z][A-Za-z0-9]*)\}/g})),...catalog.dynamicEntries.filter(entry=>entry.disposition==='translated').map(entry=>({source:entry.sourceTemplate,translation:entry.translation,token:/\{(expression\d+)\}/g}))];
 const templates=templateEntries.map(entry=>{
  const tokens=[...entry.source.matchAll(entry.token)];let cursor=0,pattern='^';
  for(const token of tokens){pattern+=entry.source.slice(cursor,token.index).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(.*?)';cursor=token.index+token[0].length;}
  pattern+=entry.source.slice(cursor).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$';
  return{expression:new RegExp(pattern,'u'),translation:entry.translation,tokens:tokens.map(token=>token[1])};
 });
 return{exact,templates,embedded};
}

function translateText(value,compiled){
 if(typeof value!=='string')return value;
 const exact=compiled.exact.get(value);if(exact!=null)return exact;
 let translated=value;
 for(const template of compiled.templates){const match=value.match(template.expression);if(!match)continue;const values=new Map(template.tokens.map((token,index)=>[token,match[index+1]]));translated=template.translation.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g,(token,name)=>values.get(name)??token);break;}
 translated=new Map([['Substitutions','החלפות'],['Speech','הקראה']]).get(translated)??translated;
 for(const [source,replacement]of compiled.embedded)translated=translated.replaceAll(source,()=>replacement);
 translated=translated.replace(/^About /,'מידע על ').replace(/^Hide /,'הסתרת ').replace(/^Quit /,'יציאה מ־');
 return translated;
}

function translateOptions(value,compiled,key){
 if(typeof value==='string')return key==='buttons'||TEXT_FIELDS.has(key)?translateText(value,compiled):value;
 if(Array.isArray(value))return value.map(item=>translateOptions(item,compiled,key));
 if(value==null||typeof value!=='object')return value;
 const result={};for(const [childKey,child] of Object.entries(value))result[childKey]=translateOptions(child,compiled,childKey);return result;
}

function installNativeChrome(electron,catalog){
 const compiled=compileCatalog(catalog),dialogMethods=['showMessageBox','showMessageBoxSync','showOpenDialog','showSaveDialog'];
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),marker=path.join(os.tmpdir(),`chatgpt-rtl-native-chrome-${process.pid}.json`);
 const status=process.__chatgptRtlNativeChrome={schemaVersion:2,archiveSha256:catalog.archiveSha256,translated:catalog.entries.filter(entry=>entry.disposition==='translated').length,dynamicTranslated:catalog.dynamicEntries.filter(entry=>entry.disposition==='translated').length,exact:compiled.exact.size,templates:compiled.templates.length,menuBuilds:0,menuLabels:[]};
 const writeStatus=()=>{const temporary=`${marker}.${process.pid}.tmp`;fs.writeFileSync(temporary,JSON.stringify(status));fs.renameSync(temporary,marker);};
 for(const name of dialogMethods){const original=electron.dialog?.[name];if(typeof original!=='function')continue;electron.dialog[name]=function(...args){const index=args.length-1;args[index]=translateOptions(args[index],compiled);return original.apply(this,args);};}
 if(typeof electron.dialog?.showErrorBox==='function'){const original=electron.dialog.showErrorBox;electron.dialog.showErrorBox=function(title,content){return original.call(this,translateText(title,compiled),translateText(content,compiled));};}
 if(typeof electron.Menu?.buildFromTemplate==='function'){const original=electron.Menu.buildFromTemplate;electron.Menu.buildFromTemplate=function(template){const translated=translateOptions(template,compiled),labels=[];const visit=value=>{if(Array.isArray(value))for(const item of value)visit(item);else if(value&&typeof value==='object'){if(typeof value.label==='string')labels.push(value.label);if(value.submenu)visit(value.submenu);}};visit(translated);status.menuBuilds++;status.menuLabels=[...new Set([...status.menuLabels,...labels])];writeStatus();return original.call(this,translated);};}
 writeStatus();process.once('exit',()=>{try{fs.unlinkSync(marker);}catch{}});
 return status;
}

module.exports={compileCatalog,translateOptions,installNativeChrome};

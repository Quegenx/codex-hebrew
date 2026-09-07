import {collectUiLiterals} from '../analysis/scan-ui-literals.mjs';
import {readHebrewCatalog} from '../translation/hebrew-catalog.mjs';

const hotkeySource='function L4i(e,t){if(e==null)return``;if(t&&e===`Plus`)return`+`;switch(e){case`Enter`:return`⏎`;case`Escape`:return`Esc`;case`LeftOption`:return t?`Left ⌥`:`Left Option`;case`RightOption`:return t?`Right ⌥`:`Right Option`;case`DoubleOption`:return t?`⌥ + ⌥`:`Double Option`;case`LeftCommand`:return t?`Left ⌘`:`Left Command`;case`DoubleCommand`:return t?`⌘ + ⌘`:`Double Command`;case`RightCommand`:return t?`Right ⌘`:`Right Command`;case`LeftControl`:return t?`Left ⌃`:`Left Control`;case`RightControl`:return t?`Right ⌃`:`Right Control`;case`LeftShift`:return t?`Left ⇧`:`Left Shift`;case`RightShift`:return t?`Right ⇧`:`Right Shift`;case`DoubleShift`:return t?`⇧ + ⇧`:`Double Shift`;case`Fn`:return`Fn`;case`MouseBack`:return`Mouse Back`;case`MouseForward`:return`Mouse Forward`;default:return e}}';
const hotkeyHebrew='function L4i(e,t){if(e==null)return``;if(t&&e===`Plus`)return`+`;switch(e){case`Enter`:return`⏎`;case`Escape`:return`אסק`;case`Space`:return`רווח`;case`Tab`:return`טאב`;case`Left`:return`שמאלה`;case`Right`:return`ימינה`;case`LeftOption`:return t?`⌥ שמאל`:`Option שמאלי`;case`RightOption`:return t?`⌥ ימין`:`Option ימני`;case`DoubleOption`:return t?`⌥ + ⌥`:`Option כפול`;case`LeftCommand`:return t?`⌘ שמאל`:`Command שמאלי`;case`DoubleCommand`:return t?`⌘ + ⌘`:`Command כפול`;case`RightCommand`:return t?`⌘ ימין`:`Command ימני`;case`LeftControl`:return t?`⌃ שמאל`:`Control שמאלי`;case`RightControl`:return t?`⌃ ימין`:`Control ימני`;case`LeftShift`:return t?`⇧ שמאל`:`Shift שמאלי`;case`RightShift`:return t?`⇧ ימין`:`Shift ימני`;case`DoubleShift`:return t?`⇧ + ⇧`:`Shift כפול`;case`Fn`:return`Fn`;case`MouseBack`:return`אחורה בעכבר`;case`MouseForward`:return`קדימה בעכבר`;default:return e}}';
const voicePreviewEnabledSource='{initialVoice:n,onVoiceChange:r,previewEnabled:i,voices:a}=e,o=i===void 0||i,s=as()';
const voicePreviewButtonSource='`button`,{type:`button`,"aria-label":D,className:`relative size-36 cursor-interaction rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0`,"data-orb-treatment":y.orbTreatment,onClick:E,children:A}';
const modelComponentSource='function R4(e){let t=(0,ior.c)(16)';
const modelLabelSource='n=Uf(r,{stripGptPrefix:e})';
const modelAnnouncementSource='model:e.modelLabel}):e.sliderLabel??`${e.modelLabel} ${t.formatMessage';
const selectedModelIconSource='RightIcon:t.model===m?Iv';
const selectedEffortIconSource='RightIcon:t===h?Iv';
const replacements=new Map([
 ['New voice chat','שיחה קולית חדשה'],
 ['New Realtime Voice Chat','שיחת קול חדשה בזמן אמת'],
 [",pro:`Pro`,prolite:`Pro`,",",pro:`פרו`,prolite:`פרו`,"],
 [hotkeySource,hotkeyHebrew],
 [voicePreviewEnabledSource,voicePreviewEnabledSource.replace('o=i===void 0||i','o=!1')],
 [voicePreviewButtonSource,voicePreviewButtonSource.replace('onClick:E','disabled:!o,onClick:E')],
]);

function translatedTemplate(translation,expressions){
 const tokens=[...translation.matchAll(/\{expression(\d+)\}/g)],indexes=tokens.map(match=>Number(match[1]));
 if(indexes.length!==expressions.length||new Set(indexes).size!==expressions.length||indexes.some(index=>index<1||index>expressions.length))throw Error(`Immediate Hebrew dynamic label placeholders changed: ${translation}`);
 const escape=value=>value.replaceAll('\\','\\\\').replaceAll('`','\\`').replaceAll('${','\\${');
 let result='`',offset=0;
 for(const match of tokens){result+=escape(translation.slice(offset,match.index))+`\${${expressions[Number(match[1])-1]}}`;offset=match.index+match[0].length;}
 return result+escape(translation.slice(offset))+'`';
}

function patchRendererLabels(source,file,catalog,found){
 const literalTranslations=new Map(catalog.hardcoded.filter(entry=>entry.disposition==='translated').map(entry=>[entry.source,entry.translation]));
 const dynamicTranslations=new Map(catalog.dynamic.filter(entry=>entry.disposition==='translated').map(entry=>[entry.sourceTemplate,entry.translation]));
 const patches=[];
 for(const item of collectUiLiterals(source,file).patches){
  const translation=item.source===undefined?dynamicTranslations.get(item.sourceTemplate):literalTranslations.get(item.source);
  if(!translation)continue;
  found.add(item.source??item.sourceTemplate);
  patches.push({...item,replacement:item.expressions?translatedTemplate(translation,item.expressions):JSON.stringify(translation)});
 }
 for(const item of patches.sort((left,right)=>right.start-left.start))source=source.slice(0,item.start)+item.replacement+source.slice(item.end);
 return source;
}

export function findAndPatchImmediateHebrewLabels(archive,catalog=readHebrewCatalog()){
 if(!archive.files.includes('webview/index.html'))return{};
 const interfaceLabels=Object.fromEntries(Object.entries(catalog.runtime?.interfaceLabels??{}).map(([source,translation])=>[source,translation.trimEnd()]));
 if(Object.keys(interfaceLabels).length===0)throw Error('Immediate Hebrew model labels are missing');
 const exactReplacements=new Map(replacements);
 exactReplacements.set(modelComponentSource,`function hebrewModelLabel(e,t=!1){return ${JSON.stringify(interfaceLabels)}[Uf(e,{stripGptPrefix:!1})]??Uf(e,{stripGptPrefix:t})}${modelComponentSource}`);
 exactReplacements.set(modelLabelSource,'n=hebrewModelLabel(r,e)');
 exactReplacements.set(modelAnnouncementSource,'model:hebrewModelLabel(e.modelLabel)}):e.sliderLabel??`${hebrewModelLabel(e.modelLabel)} ${t.formatMessage');
 exactReplacements.set(selectedModelIconSource,'LeftIcon:t.model===m?Iv');
 exactReplacements.set(selectedEffortIconSource,'LeftIcon:t===h?Iv');
 const changes={},counts=new Map([...exactReplacements.keys()].map(source=>[source,0])),found=new Set();
 for(const file of archive.files.filter(file=>file.endsWith('.js'))){
  let source=archive.read(file),patched=source;
  for(const [english,hebrew]of exactReplacements){
   const count=patched.split(english).length-1;
   if(count){counts.set(english,counts.get(english)+count);patched=patched.replaceAll(english,()=>hebrew);}
  }
  if(file.startsWith('webview/assets/'))patched=patchRendererLabels(patched,file,catalog,found);
  if(patched!==source)changes[file]=patched;
 }
 const expected=new Map([['New voice chat',3],['New Realtime Voice Chat',2],[',pro:`Pro`,prolite:`Pro`,',1],[hotkeySource,1],[voicePreviewEnabledSource,1],[voicePreviewButtonSource,1],[modelComponentSource,1],[modelLabelSource,1],[modelAnnouncementSource,1],[selectedModelIconSource,1],[selectedEffortIconSource,1]]);
 for(const [source,count]of expected)if(counts.get(source)!==count)throw Error(`Immediate Hebrew label signature changed: ${source}`);
 const missing=catalog.hardcoded.filter(entry=>entry.disposition==='translated'&&!found.has(entry.source));
 if(missing.length)throw Error(`Immediate Hebrew UI labels missing from renderer: ${missing[0].source}`);
 const html=archive.read('webview/index.html'),root='<html lang="en" data-build=';
 if(!html.includes(root)||!html.includes('<head>'))throw Error('Webview bootstrap signature changed');
 changes['webview/index.html']=html.replace(root,'<html lang="he" dir="rtl" data-build=').replace('<head>','<head>\n    <style id="chatgpt-hebrew-boot">html{visibility:hidden}</style>');
 return changes;
}

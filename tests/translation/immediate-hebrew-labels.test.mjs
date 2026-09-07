import {expect,test} from 'bun:test';
import fs from 'node:fs';
import {findAndPatchImmediateHebrewLabels} from '../../scripts/rtl/immediate-hebrew-labels.mjs';

test('hardcoded labels, shortcuts, voice defaults, and plan names are Hebrew before rendering',()=>{
 const files=['main.js','voice.js','webview/assets/app.js','webview/index.html'],sources={
  'main.js':'const title=`New voice chat`; title===`New Realtime Voice Chat`;',
  'voice.js':'/* {initialVoice:n,onVoiceChange:r,previewEnabled:i,voices:a}=e,o=i===void 0||i,s=as() `button`,{type:`button`,"aria-label":D,className:`relative size-36 cursor-interaction rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0`,"data-orb-treatment":y.orbTreatment,onClick:E,children:A} */',
  'app.js':'const fallback=`New voice chat`; const other=`New voice chat`; value===`New Realtime Voice Chat`; const plans={free:`Free`,pro:`Pro`,prolite:`Pro`,team:`Business`}; function L4i(e,t){if(e==null)return``;if(t&&e===`Plus`)return`+`;switch(e){case`Enter`:return`⏎`;case`Escape`:return`Esc`;case`LeftOption`:return t?`Left ⌥`:`Left Option`;case`RightOption`:return t?`Right ⌥`:`Right Option`;case`DoubleOption`:return t?`⌥ + ⌥`:`Double Option`;case`LeftCommand`:return t?`Left ⌘`:`Left Command`;case`DoubleCommand`:return t?`⌘ + ⌘`:`Double Command`;case`RightCommand`:return t?`Right ⌘`:`Right Command`;case`LeftControl`:return t?`Left ⌃`:`Left Control`;case`RightControl`:return t?`Right ⌃`:`Right Control`;case`LeftShift`:return t?`Left ⇧`:`Left Shift`;case`RightShift`:return t?`Right ⇧`:`Right Shift`;case`DoubleShift`:return t?`⇧ + ⇧`:`Double Shift`;case`Fn`:return`Fn`;case`MouseBack`:return`Mouse Back`;case`MouseForward`:return`Mouse Forward`;default:return e}} function R4(e){let t=(0,ior.c)(16);n=Uf(r,{stripGptPrefix:e})} function pvr(e,t){return e.isLocked?t.formatMessage(x,{model:e.modelLabel}):e.sliderLabel??`${e.modelLabel} ${t.formatMessage(y)}`} const icons={RightIcon:t.model===m?Iv:void 0}; const effort={RightIcon:t===h?Iv:void 0}; jsx("button",{"aria-label":"Choose a voice",children:`Hello ${name}`});',
  'webview/index.html':'<!doctype html><html lang="en" data-build="test"><head></head><body></body></html>',
 };
 const catalog={hardcoded:[{source:'Choose a voice',translation:'בחירת קול',disposition:'translated'}],dynamic:[{sourceTemplate:'Hello {expression1}',translation:'שלום {expression1}',disposition:'translated'}],runtime:{interfaceLabels:{'GPT-6 Astra':'ג׳יפיטי 6 אסטרה\u00a0',Tokens:'טקסט $& $$'}}};
 const changes=findAndPatchImmediateHebrewLabels({files,read:file=>sources[file.replace('webview/assets/','')]},catalog);
 expect(Object.values(changes).join('\n')).not.toContain('New voice chat');
 expect(changes['main.js']).toContain('`שיחה קולית חדשה`');
 expect(changes['webview/assets/app.js']).toContain('pro:`פרו`,prolite:`פרו`');
 expect(changes['webview/assets/app.js']).toContain('case`Space`:return`רווח`');
 expect(changes['webview/assets/app.js']).toContain('"GPT-6 Astra":"ג׳יפיטי 6 אסטרה"');
 expect(changes['webview/assets/app.js'].includes('"Tokens":"טקסט $& $$"')).toBe(true);
 expect(changes['webview/assets/app.js']).toContain('function hebrewModelLabel');
 expect(changes['webview/assets/app.js']).toContain('n=hebrewModelLabel(r,e)');
 expect(changes['webview/assets/app.js']).toContain('model:hebrewModelLabel(e.modelLabel)');
 expect(changes['webview/assets/app.js']).toContain('LeftIcon:t.model===m?Iv');
 expect(changes['webview/assets/app.js']).toContain('LeftIcon:t===h?Iv');
 expect(changes['webview/assets/app.js']).toContain('"aria-label":"בחירת קול"');
 expect(changes['webview/assets/app.js']).toContain('`שלום ${name}`');
 expect(changes['voice.js']).toContain('o=!1');
 expect(changes['voice.js']).toContain('disabled:!o,onClick:E');
 expect(changes['webview/index.html']).toContain('<html lang="he" dir="rtl"');
 expect(changes['webview/index.html']).toContain('id="chatgpt-hebrew-boot"');
});
test('renderer runtime has no post-render literal correction map',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../../catalogs/hebrew.json',import.meta.url)));
 const injection=fs.readFileSync(new URL('../../scripts/build/renderer-injection.mjs',import.meta.url),'utf8');
 const renderer=fs.readFileSync(new URL('../../ui/electron-entry.js',import.meta.url),'utf8');
 expect(catalog.runtime.literalLabels).toEqual({});
 expect(injection).not.toContain('literalTranslations');
 expect(renderer).toContain('postRenderTranslations:false');
 expect(renderer).not.toContain('installMetadata');
});

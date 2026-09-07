import {expect,test} from 'bun:test';
import fs from 'node:fs';
import {patchModelPickerRTL} from '../../scripts/rtl/model-picker-rtl.mjs';
import {patchPetSizeRTL} from '../../scripts/rtl/pet-size-rtl.mjs';

test('model picker input, geometry, pointer preview, and motion all use RTL coordinates',()=>{
 const source='ModelPickerPowerSliderImpl data-model-picker-power-slider dir:`ltr`,disabled:A,max:Ye n=Math.round((e.clientX-t.left)/t.width*N) let t=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:-e.deltaY; style:{left:Qe(N===0?0:t/N*100)} Lt={left:Oe} function $e(e,t,n=1){if(t<=0)return`translateX(${-100*n}%)`;let r=q(e,t);return`translateX(calc(${(e-100)*n}% + ${r*n}px))`} function et(e,t){let n=q(e,t);return`inset(0 calc(${100-e}% - ${n}px) 0 0)`} exit:{opacity:0,transition:gt,x:-110} initial:v?{opacity:0,x:x.phase===`exiting`?28:0}:!1';
 const result=patchModelPickerRTL(source);expect(result.replacements).toBe(3);expect(result.source).toContain('dir:`rtl`');expect(result.source).toContain('(t.right-e.clientX)/t.width');expect(result.source).toContain('style:{left:Qe(');expect(result.source).toContain('Lt={left:Oe}');expect(result.source).toContain('translateX(${-100*n}%)');expect(result.source).toContain('inset(0 calc(');expect(result.source).toContain('x:-110');expect(result.source).toContain('`exiting`?28');
});

test('pet size range value, pointer direction, and painted progress share RTL geometry',()=>{
 const control='let H=`linear-gradient(to right, var(--color-text-info) ${x}%, var(--color-border-subtle) ${x}%)`;control:jsx(`input`,{id:`pet-size`,className:`range`,max:224,min:80,type:`range`})';
 const result=patchPetSizeRTL(`settings.pets.size ${control} ${control}`);
 expect(result.replacements).toBe(4);expect(result.source.split('linear-gradient(to left').length-1).toBe(2);expect(result.source.split('{dir:`rtl`,id:`pet-size`').length-1).toBe(2);
});

test('model and effort labels are Hebrew and separated in the compact picker',()=>{
 const runtime=JSON.parse(fs.readFileSync(new URL('../../catalogs/hebrew.json',import.meta.url),'utf8')).runtime;
 expect(runtime.interfaceLabels['GPT-6 Astra']).toBe('ג׳יפיטי 6 אסטרה\u00a0');
 expect(runtime.interfaceLabels['Daybreak Blue']).toBe('דייברייק בלו\u00a0');
 expect(runtime.interfaceLabels['GPT-5.3 Codex Spark']).toBe('ג׳יפיטי 5.3 קודקס ספארק\u00a0');
 expect(Object.values(runtime.interfaceLabels).every(label=>!/[A-Za-z]/.test(label)&&label.endsWith('\u00a0'))).toBe(true);
 const catalog=JSON.parse(fs.readFileSync(new URL('../../catalogs/hebrew.json',import.meta.url),'utf8'));
 expect(catalog.messages.find(message=>message.id==='composer.mode.local.reasoning.ultra.label').translation).toBe('אולטרה');
 const stylesheet=fs.readFileSync(new URL('../../ui/rtl.css',import.meta.url),'utf8');
 expect(stylesheet).toContain('[data-model-picker-view] [role="menuitemradio"][aria-checked="true"] > [data-menu-row-content]');
});

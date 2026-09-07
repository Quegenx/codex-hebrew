import {test,expect} from 'bun:test';
import postcss from 'postcss';
import {logicalStyles} from '../../scripts/rtl/rtl-styles.mjs';
import {attachDirectionContext} from '../../ui/direction-context.js';
import {validateItems} from '../../scripts/translation/runtime-translations.mjs';
const convert=css=>logicalStyles(css,'app://-/assets/main.css').css;
const declarations=css=>Object.fromEntries(postcss.parse(css).first.nodes.filter(n=>n.type==='decl').map(d=>[d.prop,d.value]));
test('both physical edges become independent logical edges without clearing each other',()=>{
 expect(declarations(convert('.row{left:2px;right:8px;margin-left:3px;padding-right:7px}'))).toEqual({'inset-inline-start':'2px','inset-inline-end':'8px','margin-inline-start':'3px','padding-inline-end':'7px'});
});
test('existing logical layout and intentional LTR direction are preserved',()=>{
 expect(declarations(convert('.row{padding-inline-start:3px;direction:ltr;flex-direction:row}'))).toEqual({'padding-inline-start':'3px',direction:'ltr','flex-direction':'row'});
});
test('code-editor and explicit RTL rules stay physical',()=>{
 const input='.monaco-editor{left:2px;padding:1px 2px 3px 4px}[dir=rtl] .item{right:3px}';expect(convert(input)).toBe(input);
});
test('corners, alignment and asymmetric padding migrate correctly',()=>{
 expect(declarations(convert('.row{border-top-left-radius:3px;text-align:left;padding:1px 2px 3px 4px}'))).toEqual({'border-start-start-radius':'3px','text-align':'start',padding:'1px 4px 3px 2px'});
});
test('CSS asset URLs resolve against the original stylesheet',()=>{
 expect(convert('.icon{background:url(./icon.svg);mask:url(data:image/svg+xml;base64,AA)}')).toContain('app://-/assets/icon.svg');
});
test('horizontal displacement changes without mirroring icons or rotations',()=>{
 expect(declarations(convert('.row{transform:translateX(-50%);scale:1;rotate:90deg}'))).toEqual({transform:'translateX(50%)',scale:'1',rotate:'90deg'});
});
test('the model picker slider moves its physical artwork into an RTL coordinate system',()=>{
 const input='._Root_slider{--model-picker-power-slider-motion-duration:.3s}._Track_slider{height:24px;border-radius:12px;flex-grow:1;position:relative;overflow:hidden}._Range_slider{border-radius:12px 0 0 12px}._Tick_slider{width:4px;height:4px;transform:translate(-50%,-50%)}._VisualThumbRail_slider{z-index:4;pointer-events:none;width:100%;position:absolute;inset-inline-start:0}._ThumbScale_slider{width:28px;height:28px;will-change:left;transform:translate(-50%,-50%)}';
 const output=convert(input);expect(output).toContain('._Track_slider{height:24px;border-radius:12px;flex-grow:1;position:relative;overflow:hidden;transform:scaleX(-1)}');expect(output).toContain('._VisualThumbRail_slider{z-index:4;pointer-events:none;width:100%;position:absolute;inset-inline-start:0;transform:scaleX(-1)}');expect(output).toContain('._Range_slider{border-radius:12px 0 0 12px}');expect(output).toContain('._ThumbScale_slider{width:28px;height:28px;will-change:left;transform:translate(-50%,-50%)}');
});
test('Radix bridge captures the actual context and restores React dispatcher and defaults',()=>{
 const context={_currentValue:undefined,_currentValue2:undefined};const before={};const internals={H:before};const react={__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE:internals};
 const hook=()=>internals.H.useContext(context)||'ltr';const bridge=attachDirectionContext(react,hook);
 expect(internals.H).toBe(before);expect(context._currentValue).toBe('rtl');expect(context._currentValue2).toBe('rtl');
 bridge.stop();expect(context._currentValue).toBeUndefined();expect(context._currentValue2).toBeUndefined();
});
test('failed direction capture always restores the dispatcher',()=>{
 const before={};const internals={H:before};expect(()=>attachDirectionContext({__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE:internals},()=>{throw Error('changed hook');})).toThrow();expect(internals.H).toBe(before);
});
test('metadata requests reject unsupported types, bidi controls and oversized batches',()=>{
 expect(()=>validateItems([{kind:'conversation',source:'Private message'}])).toThrow();expect(()=>validateItems([{kind:'plugin-description',source:'abc\u202e'}])).toThrow();expect(()=>validateItems(Array(51).fill({kind:'ui-literal',source:'Label'}))).toThrow();
});

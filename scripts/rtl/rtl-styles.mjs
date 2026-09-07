import postcss from 'postcss';
import rtlcss from 'rtlcss';

// These rules describe physical content coordinates or already provide an RTL
// branch. Keep them intact; document chrome uses the converted logical rules.
const preserved=/monaco|cm-|xterm|terminal|diff-|diff_|mermaid|canvas|mapbox|katex|mathjax|prosemirror|\bpre\b|\bcode\b|waveform|video|image-canvas|titlebar-area|traffic-light|window-controls|data-codex-os|_media|_fasttrack|_burst|_cardscene|_cardtexture|_cardmark|_pocket|\[dir[^\]]*rtl|:dir\(rtl\)/i;
const visualizationAsset=/\/visualization-[^/]+\.css(?:[?#]|$)/i;
const corners={'top-left':'start-start','top-right':'start-end','bottom-left':'end-start','bottom-right':'end-end'};
const modelPickerPowerSliderAsset=source=>source.includes('--model-picker-power-slider-motion-duration');
export function classifyRTLRule(file,selector,property,value,assetSource=''){
 if(modelPickerPowerSliderAsset(assetSource)){
  return{disposition:'preserved',reason:'The original slider artwork remains intact and its complete graphical rails are mirrored as units.'};
 }
 if(property==='direction'&&value==='ltr')return{disposition:'preserved',reason:'Explicit LTR content or utility direction is preserved; document chrome direction is applied separately.'};
 if(visualizationAsset.test(file))return{disposition:'preserved',reason:'Visualization coordinates stay physical so generated charts and diagrams retain their authored geometry.'};
 if(preserved.test(selector))return{disposition:'preserved',reason:'Editor, code, visualization, content-direction, or OS-coordinate rule stays physical.'};
 return{disposition:'adapted',reason:'The replacement stylesheet converts this physical UI declaration to its logical inline equivalent.'};
}
export function isRTLCandidateDeclaration(property,value){
 if(property==='direction'&&value==='ltr')return true;
 if(/^(?:left|right|(?:margin|padding|border)-(?:left|right)(?:-(?:width|style|color))?|border-(?:top|bottom)-(?:left|right)-radius)$/.test(property))return true;
 if(['text-align','float','clear'].includes(property)&&['left','right'].includes(value))return true;
 if(/^(?:margin|padding|border-(?:color|style|width)|border-radius)$/.test(property))return value.trim().split(/\s+/).length>1;
 if(property==='--tw-translate-x')return value!=='0'&&value!=='0px';
 return property==='transform'&&/translate(?:X|3d)?\(/i.test(value)&&!/(?:rotate|matrix|skew)\(/i.test(value);
}
export function logicalStyles(css,assetUrl){
 const root=postcss.parse(css);let changed=0,kept=0;
 const slider=modelPickerPowerSliderAsset(css);
 let sliderTrack,sliderVisualThumbRail;
 if(slider){
  root.walkRules(rule=>{
   const declarations=Object.fromEntries((rule.nodes||[]).filter(node=>node.type==='decl').map(node=>[node.prop,node.value]));
   if(declarations.height==='24px'&&declarations['flex-grow']==='1'&&declarations.overflow==='hidden')sliderTrack=rule.selector.match(/\.[A-Za-z0-9_-]+/)?.[0];
   if(declarations['z-index']==='4'&&declarations.width==='100%'&&declarations['pointer-events']==='none')sliderVisualThumbRail=rule.selector.match(/\.[A-Za-z0-9_-]+/)?.[0];
  });
  if(!sliderTrack||!sliderVisualThumbRail)throw Error('Unsupported model picker slider stylesheet');
 }
 root.walkRules(rule=>{
  if(slider){
   if(rule.selector===sliderTrack||rule.selector===sliderVisualThumbRail){rule.append({prop:'transform',value:'scaleX(-1)'});changed++;}
   return;
  }
  if(classifyRTLRule(assetUrl,rule.selector,'','',css).disposition==='preserved'){kept++;return;}
  // Declarations of nested rules are handled when visiting those rules.
  for(const d of rule.nodes||[]){
   if(d.type!=='decl')continue;
   const before=d.toString();
   if(d.prop==='left')d.prop='inset-inline-start';
   else if(d.prop==='right')d.prop='inset-inline-end';
   else if(/^(margin|padding|border)-(left|right)(?:-(width|style|color))?$/.test(d.prop))d.prop=d.prop.replace(/-(left|right)/,(_,side)=>`-inline-${side==='left'?'start':'end'}`);
   else if(/^border-(top|bottom)-(left|right)-radius$/.test(d.prop))d.prop=`border-${corners[d.prop.slice(7,-7)]}-radius`;
   else if(['text-align','float','clear'].includes(d.prop)&&['left','right'].includes(d.value))d.value=`${d.prop==='text-align'?'':'inline-'}${d.value==='left'?'start':'end'}`;
   else if(/^(margin|padding|border-(color|style|width)|border-radius)$/.test(d.prop)){
    const result=postcss.parse(rtlcss.process(`x{${d.toString()}}`,{processEnv:false}));d.value=result.first.first.value;
   }
   // Flip displacement, not icons or rotations. Tailwind also uses a custom
   // translate-x variable with the independent CSS translate property.
   else if(d.prop==='--tw-translate-x'&&d.value!=='0'&&d.value!=='0px')d.value=`calc(-1 * (${d.value}))`;
   else if(d.prop==='transform'&&/translate(?:X|3d)?\(/i.test(d.value)&&!/(?:rotate|matrix|skew)\(/i.test(d.value)){
    const result=postcss.parse(rtlcss.process(`x{${d.toString()}}`,{processEnv:false}));d.value=result.first.first.value;
   }
   if(before!==d.toString())changed++;
  }
 });
 // Replacement <style> elements resolve URLs against the document, whereas
 // linked stylesheets resolve them against the CSS asset.
 root.walkDecls(d=>{d.value=d.value.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g,(all,q,url)=>/^(?:data:|#|[a-z]+:|\/)/i.test(url)?all:`url("${new URL(url,assetUrl).href}")`);});
 root.walkComments(c=>{if(/sourceMappingURL/.test(c.text))c.remove();});
 return {css:root.toString(),changed,preservedRules:kept};
}

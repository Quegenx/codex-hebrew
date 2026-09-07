import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {readHebrewCatalog} from '../translation/hebrew-catalog.mjs';

const defaultRoot=fileURLToPath(new URL('../../',import.meta.url));

export async function buildRendererInjection({root=defaultRoot,archive}={}){
 const build=await Bun.build({entrypoints:[`${root}ui/electron-entry.js`],target:'browser',format:'iife',minify:true,define:{'process.env.NODE_ENV':'"production"'}});
 if(!build.success)throw Error('Renderer build failed');
 const bundle=await build.outputs[0].text(),catalog=readHebrewCatalog();
 const translations=Object.fromEntries(catalog.messages.filter(message=>message.descriptorKind!=='messageId'&&['draft','approved'].includes(message.status)&&message.translation).map(message=>[message.id,message.translation]));
 const adaptation=JSON.parse(fs.readFileSync(`${root}.lab/adaptation.json`,'utf8'));
 if(adaptation.archiveSha256!==archive||catalog.archiveSha256!==archive)throw Error('Renderer catalogs do not match the installed application');
 const heebo=fs.readFileSync(`${root}assets/fonts/Heebo-Variable.ttf`).toString('base64');
 const fontFace=`@font-face{font-family:"Heebo";src:url(data:font/ttf;base64,${heebo}) format("truetype");font-style:normal;font-weight:100 900;font-display:swap;}`;
 const options={css:`${fontFace}\n${fs.readFileSync(`${root}ui/rtl.css`,'utf8')}`,locale:'he',translations,styles:adaptation.styles,direction:adaptation.direction,directionalIcons:adaptation.directionalIcons};
 const install=`(()=>{const options=${JSON.stringify(options)};window.__chatgptHebrewRuntimeOptions=options;const apply=()=>{if(window.__codexRoot?._internalRoot?.current){window.installChatGPTHebrew(options);return true;}return false;};if(!apply()){let attempts=0;const timer=setInterval(()=>{if(apply()||++attempts>=120)clearInterval(timer);},50);}})();`;
 return `${bundle}\n${install}`;
}

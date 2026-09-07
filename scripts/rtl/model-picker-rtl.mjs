const patches=[
 ['dir:`ltr`,disabled:A,max:Ye','dir:`rtl`,disabled:A,max:Ye'],
 ['n=Math.round((e.clientX-t.left)/t.width*N)','n=Math.round((t.right-e.clientX)/t.width*N)'],
 ['let t=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:-e.deltaY;','let t=Math.abs(e.deltaX)>Math.abs(e.deltaY)?-e.deltaX:-e.deltaY;'],
];

export function patchModelPickerRTL(source){
 if(!source.includes('data-model-picker-power-slider')||!source.includes('ModelPickerPowerSliderImpl'))return null;
 let patched=source;
 for(const [before,after]of patches){
  const first=patched.indexOf(before);
  if(first<0||patched.indexOf(before,first+before.length)>=0)throw Error(`Unsupported model picker slider source: ${before.slice(0,60)}`);
  patched=patched.slice(0,first)+after+patched.slice(first+before.length);
 }
 return{source:patched,replacements:patches.length};
}

export function findAndPatchModelPickerRTL(archive){
 const matches=[];
 for(const file of archive.files)if(file.startsWith('webview/assets/')&&file.endsWith('.js')){
  const source=archive.read(file);if(source.includes('data-model-picker-power-slider'))matches.push({file,source});
 }
 if(matches.length!==1)throw Error(`Expected one model picker slider asset, found ${matches.length}`);
 const result=patchModelPickerRTL(matches[0].source);
 if(!result)throw Error('Model picker slider implementation was not recognized');
 return{file:matches[0].file,...result};
}

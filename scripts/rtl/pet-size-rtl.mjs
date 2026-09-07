const patches=[
  ['linear-gradient(to right, var(--color-text-info)','linear-gradient(to left, var(--color-text-info)'],
  ['{id:`pet-size`,className:','{dir:`rtl`,id:`pet-size`,className:'],
];

export function patchPetSizeRTL(source){
  if(!source.includes('settings.pets.size')||!source.includes('id:`pet-size`'))return null;
  let patched=source,replacements=0;
  for(const [before,after]of patches){
    const count=patched.split(before).length-1;
    if(count!==2)throw Error(`Unsupported pet size slider source: expected 2 × ${before}`);
    patched=patched.replaceAll(before,after);replacements+=count;
  }
  return{source:patched,replacements};
}

export function findAndPatchPetSizeRTL(archive){
  const matches=[];
  for(const file of archive.files)if(file.startsWith('webview/assets/')&&file.endsWith('.js')){
    const source=archive.read(file);
    if(source.includes('settings.pets.size')&&source.includes('id:`pet-size`'))matches.push({file,source});
  }
  if(matches.length!==1)throw Error(`Expected one pet size settings asset, found ${matches.length}`);
  return{file:matches[0].file,...patchPetSizeRTL(matches[0].source)};
}

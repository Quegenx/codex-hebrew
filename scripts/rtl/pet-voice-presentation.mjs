// Keep the native voice session, controls and handoff geometry. Only its artwork
// changes: retain the selected pet and hide the orb without removing its anchor.
const patches=[
 ['kt=St===`pet`||Tt&&St!==`hidden`','kt=St===`pet`||St===`voice-orb`||Tt&&St!==`hidden`'],
 ['className:`absolute inset-0`,initial:!1,transition:Xu,children:(0,Q.jsx)(H,',
  'className:`absolute inset-0`,"data-hebrew-pet-voice-orb":!0,"aria-hidden":!0,style:{visibility:`hidden`,pointerEvents:`none`},initial:!1,transition:Xu,children:(0,Q.jsx)(H,'],
 ['"data-avatar-overlay-debug-window-border":vr,inert:Dt',
  '"data-avatar-overlay-debug-window-border":vr,"data-hebrew-pet-layout":!0,dir:`ltr`,inert:Dt'],
];

export function patchPetVoicePresentation(source){
 if(!source.includes('AvatarOverlayNativePage'))return null;
 let patched=source;
 for(const [before,after]of patches){
  if(patched.split(before).length-1!==1)throw Error(`Unsupported pet voice presentation: expected one ${before}`);
  patched=patched.replace(before,after);
 }
 return{source:patched,replacements:patches.length};
}

export function findAndPatchPetVoicePresentation(archive){
 const files=archive.files.filter(file=>/^webview\/assets\/avatar-overlay-native-page-[^.]+\.js$/.test(file));
 if(files.length!==1)throw Error(`Expected one native pet overlay asset, found ${files.length}`);
 const result=patchPetVoicePresentation(archive.read(files[0]));
 if(!result)throw Error('Unsupported native pet overlay export');
 return{file:files[0],...result};
}

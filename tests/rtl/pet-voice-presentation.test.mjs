import {test,expect} from 'bun:test';
import {patchPetVoicePresentation,findAndPatchPetVoicePresentation} from '../../scripts/rtl/pet-voice-presentation.mjs';

const source='AvatarOverlayNativePage;kt=St===`pet`||Tt&&St!==`hidden`,next=0;className:`absolute inset-0`,initial:!1,transition:Xu,children:(0,Q.jsx)(H,{presentationAnchorRef:X?.presentationAnchorRef,phase:mt});"data-avatar-overlay-debug-window-border":vr,inert:Dt;isRealtimeVoiceSurfaceVisible:St===`voice-orb`,onStop:X?.onStop,onToggleMicrophoneMute:X?.onToggleMicrophoneMute,onToggleMute:X?.onToggleMute';

test('voice presentation keeps the pet visible and preserves session controls and anchor',()=>{
 const result=patchPetVoicePresentation(source);
 const expression=result.source.match(/kt=(.*?),next=/)[1];
 const petVisible=new Function('St','Tt',`return ${expression}`);
 expect(petVisible('voice-orb',false)).toBe(true);
 expect(petVisible('pet',false)).toBe(true);
 expect(petVisible('hidden',false)).toBe(false);
 expect(result.source).toContain('"aria-hidden":!0,style:{visibility:`hidden`,pointerEvents:`none`}');
 expect(result.source).toContain('presentationAnchorRef:X?.presentationAnchorRef,phase:mt');
 expect(result.source).toContain('isRealtimeVoiceSurfaceVisible:St===`voice-orb`,onStop:X?.onStop,onToggleMicrophoneMute:X?.onToggleMicrophoneMute,onToggleMute:X?.onToggleMute');
 expect(result.source).toContain('"data-hebrew-pet-layout":!0,dir:`ltr`');
});

test('pet presentation patch refuses unsupported or ambiguous application assets',()=>{
 expect(patchPetVoicePresentation('other component')).toBeNull();
 expect(()=>patchPetVoicePresentation(source.replace('kt=','changed='))).toThrow('Unsupported pet voice presentation');
 expect(()=>patchPetVoicePresentation(source+source)).toThrow('Unsupported pet voice presentation');
 const file='webview/assets/avatar-overlay-native-page-fixture.js';
 expect(findAndPatchPetVoicePresentation({files:[file],read:()=>source}).file).toBe(file);
 expect(()=>findAndPatchPetVoicePresentation({files:[]})).toThrow('Expected one native pet overlay asset');
});

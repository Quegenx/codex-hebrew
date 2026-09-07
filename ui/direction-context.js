// Use the installed app's React and Radix context, never a second copy of
// @radix-ui/react-direction. Asset and export names are verified from its ASAR.
export async function installDirection(config){
 if(!config)return {status:()=>({state:'unsupported'}),stop(){}};
 const module=await import(/* @vite-ignore */config.moduleUrl);
 const React=module[config.reactExport]?.();
 const hook=module[config.directionExport];
 return attachDirectionContext(React,hook);
}
export function attachDirectionContext(React,hook){
 const internals=React?.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
 if(!internals||typeof hook!=='function')throw Error('Unsupported React/Radix bridge');
 let context,calls=0;
 const dispatcher=internals.H;
 // Synchronous capture only; no component is rendered and no React subtree
 // is remounted. Restore the dispatcher even if the hook's signature changes.
 try{internals.H={useContext(c){calls++;context=c;return undefined;}};if(hook()!=='ltr'||calls!==1)throw Error('Unexpected direction hook');}
 finally{internals.H=dispatcher;}
 if(!context||!('_currentValue' in context)||!('_currentValue2' in context))throw Error('Unsupported direction context');
 const saved=[context._currentValue,context._currentValue2];
 if(saved.some(v=>v!==undefined&&v!=='ltr'&&v!=='rtl'))throw Error('Unexpected direction context value');
 context._currentValue='rtl';context._currentValue2='rtl';
 return {status:()=>({state:'attached',mechanism:'app-radix-context-default'}),stop(){if(context._currentValue==='rtl')context._currentValue=saved[0];if(context._currentValue2==='rtl')context._currentValue2=saved[1];}};
}

export function installStyles(styles={}) {
 const applied=new Map();let stopped=false;
 function apply(){
  if(stopped)return;
  for(const link of document.querySelectorAll('link[rel="stylesheet"]')){
   const source=styles[new URL(link.href,location.href).pathname];if(!source)continue;
   let entry=applied.get(link);
   if(!entry&&link.disabled)continue;
   if(!entry){const style=document.createElement('style');style.dataset.chatgptRTLAsset='';style.textContent=source;style.media=link.media;link.before(style);entry={style,disabled:link.disabled};applied.set(link,entry);}
   link.disabled=true;
  }
  for(const [link,entry]of applied)if(!link.isConnected){entry.style.remove();applied.delete(link);}
 }
 const observer=new MutationObserver(apply);observer.observe(document.head,{childList:true,subtree:true});apply();
 return {apply,status:()=>({replacedStylesheets:applied.size}),stop(){stopped=true;observer.disconnect();for(const [link,e]of applied){e.style.remove();link.disabled=e.disabled;}applied.clear();}};
}

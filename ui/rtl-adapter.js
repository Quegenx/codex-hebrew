import {createSummaryPanelAdapter} from './summary-panel.js';

// Reversible renderer adapter. Only explicit message IDs are translated.
export function installRTL({css, locale='he', translations={}, directionalIcons=[]} = {}) {
  window.chatgptRTL?.stop();
  const html = document.documentElement;
  const originals = [];
  const fileInputs = [];
  const credits = [];
  const attributes = new WeakMap();
  const profileNames=new Set();
  function attr(el,name,value) {
    let saved = attributes.get(el);
    if (!saved) {saved = new Set();attributes.set(el,saved);}
    if (!saved.has(name)) {originals.push({el,name,old:el.getAttribute(name),applied:value});saved.add(name);}
    if (el.getAttribute(name) !== value) el.setAttribute(name,value);
  }
  attr(html,'dir','rtl');attr(html,'lang',locale);attr(html,'data-chatgpt-rtl','');
  const summaryPanel=createSummaryPanelAdapter({translations,attr});
  const style = document.createElement('style');style.textContent=css;style.dataset.chatgptRTLStyle='';html.append(style);
  const texts = new Map();
  const iconSignatures=new Set(directionalIcons.map(x=>x.signature));
  const logOutLabels=new Set(['Log out',translations['codex.profileDropdown.logOut']].filter(Boolean));
  const profileMenuLabels=new Set(['Open profile menu',translations['codex.profileFooter.openProfileMenu']].filter(Boolean));
  const previousVoiceLabels=new Set(['Previous voice',translations['settings.general.realtimeVoice.previous']].filter(Boolean));
  const nextVoiceLabels=new Set(['Next voice',translations['settings.general.realtimeVoice.next']].filter(Boolean));
  const noFileChosen=translations['No file chosen']||'לא נבחר קובץ';
  const conversationRoot='[data-markdown-text-tone="user-message"],[data-markdown-text-style="assistant-message"],[data-message-author-role]';
  const technicalSurface='pre,code,kbd,samp,[data-codex-terminal],[data-codex-xterm],dil-renderer,.xterm,.monaco-editor,.cm-editor';
  const directionalActionId=/(?:^|\.)(?:navigateBack|navigateForward|back(?:Button|To[A-Z][A-Za-z]*)?|forward)$/i;
  const directionalActionLabels=new Set(['Back','Forward','Go back','Go forward']);
  for(const [id,value] of Object.entries(translations))if(directionalActionId.test(id)&&typeof value==='string'&&!/[{}<>]/.test(value))directionalActionLabels.add(value);
  function directionalIcon(svg){
    if(svg.matches('.lucide-chevron-left,.lucide-chevron-right,.lucide-arrow-left,.lucide-arrow-right'))return true;
    return iconSignatures.has([...svg.querySelectorAll('path')].map(path=>path.getAttribute('d')).join('||'));
  }
  function translate(el,id,attribute) {
    const value = translations[id];
    // Plain labels only. ICU needs the app's formatter, never raw insertion here.
    if (typeof value !== 'string' || /[{}<>]/.test(value)) return;
    if (attribute) {if (['title','aria-label','placeholder'].includes(attribute)) attr(el,attribute,value);return;}
    if (el.children.length || el.closest('pre,code,textarea,[contenteditable],input')) return;
    const old = texts.get(el);
    if (!old) texts.set(el,{original:el.textContent,applied:value});
    else if (el.textContent !== old.applied) old.original=el.textContent;
    if (el.textContent !== value) el.textContent=value;
  }
  function apply(scope=document) {
    const query=selector=>scope===document?[...document.querySelectorAll(selector)]:[...(scope.matches?.(selector)?[scope]:[]),...scope.querySelectorAll(selector)];
    summaryPanel.apply(query);
    if(scope===document){attr(html,'dir','rtl');attr(html,'lang',locale);attr(html,'data-chatgpt-rtl','');}
    for(const menu of query('[role="menu"],[role="menubar"]')) attr(menu,'dir','rtl');
    for(const technical of query('[data-codex-terminal],[data-codex-xterm],dil-renderer,.xterm,.monaco-editor,.cm-editor')) attr(technical,'dir','ltr');
    for(const scroller of query('[data-radix-scroll-area-viewport],.overflow-y-auto,.overflow-y-scroll,.overflow-auto'))if(!scroller.closest('[data-codex-terminal],[data-codex-xterm],dil-renderer,.xterm,.monaco-editor,.cm-editor'))attr(scroller,'data-rtl-scrollbar-right','');
    for (const el of query('[data-message-id]')) translate(el,el.dataset.messageId,el.dataset.messageAttribute);
    for (const el of query('textarea,input:not([type]),input[type="text"],input[type="search"],[contenteditable="true"],[data-rtl-user-content],[data-markdown-text-tone="user-message"],[data-markdown-text-style="assistant-message"],[data-message-author-role],p,h1,h2,h3,h4,h5,h6,td,th,a,bdi')) {
      const content=el.matches(`textarea,input:not([type]),input[type="text"],input[type="search"],[contenteditable="true"],[data-rtl-user-content],${conversationRoot}`)||el.closest(conversationRoot);
      if(content&&!el.hasAttribute('dir')&&!el.closest(technicalSurface))attr(el,'dir','auto');
    }
    // A list or quote with dir=auto cannot see text inside a paragraph that
    // already owns dir=auto. Inherit its first text block's browser-computed
    // direction so bullets, quote rails, and table columns stay with the text.
    for(const container of query('li,blockquote,ol,ul,table')){
      if(!container.closest(conversationRoot)||(container.hasAttribute('dir')&&container.dir!=='auto')||container.closest(technicalSurface))continue;
      const probe=container.querySelector('p[dir="auto"],h1[dir="auto"],h2[dir="auto"],h3[dir="auto"],h4[dir="auto"],h5[dir="auto"],h6[dir="auto"],td[dir="auto"],th[dir="auto"]');
      if(!container.textContent.trim())continue;
      attr(container,'dir',probe?window.getComputedStyle(probe).direction:'auto');
    }
    for(const input of query('input[type="file"]')){
      if(input.hidden||input.getAttribute('aria-hidden')==='true'||window.getComputedStyle(input).display==='none'||!input.getClientRects().length)continue;
      attr(input,'data-rtl-file-input','');
      let label=input.nextElementSibling;
      if(!label?.hasAttribute('data-rtl-file-name')){
        label=document.createElement('span');label.setAttribute('data-rtl-file-name','');input.after(label);
        const onChange=()=>{label.textContent=input.files?.[0]?.name||noFileChosen;};
        input.addEventListener('change',onChange);fileInputs.push({input,label,onChange});
      }
      label.textContent=input.files?.[0]?.name||noFileChosen;
    }
    // Ellipsis belongs at the end of the label's own language. Isolate only
    // leaf labels, so surrounding icons and flex layout retain chrome RTL.
    for (const el of query('.truncate,.truncate-text,[class*="line-clamp-"]')) {
      if(!el.children.length&&!el.hasAttribute('dir')&&!el.closest('pre,code,kbd,samp,input,textarea,[contenteditable],[data-codex-terminal],[data-codex-xterm],dil-renderer,.xterm,.monaco-editor,.cm-editor')) attr(el,'dir','auto');
    }
    for(const row of query('button'))if(profileMenuLabels.has(row.getAttribute('aria-label'))){
      attr(row,'data-rtl-profile-account','');
      const name=row.querySelector(':scope > .truncate, :scope > .truncate-text');
      if(name?.textContent.trim())profileNames.add(name.textContent.trim());
      if(row.parentElement&&!row.parentElement.querySelector(':scope > [data-codex-hebrew-credit]')){
        const credit=document.createElement('div');credit.setAttribute('data-codex-hebrew-credit','');credit.setAttribute('dir','rtl');credit.textContent='פותח על ידי גל חבקין';
        row.before(credit);credits.push(credit);
      }
    }
    for(const row of query('[role^="menuitem"]'))if([...profileNames].some(name=>row.textContent.trim().includes(name)))attr(row,'data-rtl-profile-account-menuitem','');
    for(const row of query('button')){
      const label=row.getAttribute('aria-label');
      if(!previousVoiceLabels.has(label)&&!nextVoiceLabels.has(label))continue;
      const svg=row.querySelector('svg');if(svg)attr(svg,'data-rtl-mirror','');
    }
    for(const row of query('button,[role="menuitem"]'))if(logOutLabels.has(row.textContent.trim())){
      const svg=row.querySelector('svg');if(svg&&!svg.closest('pre,code,[data-message-author-role],.monaco-editor,.cm-editor'))attr(svg,'data-rtl-mirror','');
    }
    for(const row of query('button,[role="button"],[role^="menuitem"],a')) {
      const labels=[row.getAttribute('aria-label'),row.getAttribute('title'),row.textContent.trim()].filter(Boolean);
      if(!labels.some(label=>directionalActionLabels.has(label)))continue;
      for(const svg of row.querySelectorAll('svg')){
        if(svg.hasAttribute('data-rtl-mirror')||!directionalIcon(svg)||svg.closest('pre,code,[data-message-author-role],.monaco-editor,.cm-editor'))continue;
        const computed=window.getComputedStyle(svg);if(computed.direction==='ltr'||(computed.transform&&computed.transform!=='none'))continue;
        attr(svg,'data-rtl-mirror','');
      }
    }
  }
  let pending=false,stopped=false;const pendingRoots=new Set();
  const observer=new MutationObserver(records => {
    for(const record of records){
      if(record.type==='characterData'&&record.target.parentElement)pendingRoots.add(record.target.parentElement);
      for(const node of record.addedNodes||[])if(node.nodeType===1)pendingRoots.add(node);else if(node.parentElement)pendingRoots.add(node.parentElement);
      if(record.target?.nodeType===1&&record.target!==document.body&&record.target!==html)pendingRoots.add(record.target);
    }
    if(pending||stopped)return;
    pending=true;queueMicrotask(()=>{pending=false;if(stopped)return;const roots=[...pendingRoots];pendingRoots.clear();for(const root of roots)if(root.isConnected&&!roots.some(other=>other!==root&&other.contains(root)))apply(root);});
  });
  apply();observer.observe(document.body || html,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','aria-pressed','aria-expanded']});
  const rootObserver=new MutationObserver(()=>{if(!stopped)apply();});
  rootObserver.observe(html,{attributes:true,attributeFilter:['dir','lang','data-chatgpt-rtl']});
  const api={
    stop() {
      stopped=true;observer.disconnect();rootObserver.disconnect();summaryPanel.stop();style.remove();
      for(const credit of credits)credit.remove();
      for(const {input,label,onChange} of fileInputs){input.removeEventListener('change',onChange);label.remove();}
      for (const [el,state] of texts) if (el.textContent === state.applied) el.textContent=state.original;
      for (const {el,name,old,applied} of originals.reverse()) if (el.getAttribute(name) === applied) {
        if (old === null) el.removeAttribute(name);else el.setAttribute(name,old);
      }
      if (window.chatgptRTL === api) delete window.chatgptRTL;
    },
    status(){return {locale,direction:html.dir,translatedNodes:texts.size,active:!stopped};},
  };
  window.chatgptRTL=api;return api;
}

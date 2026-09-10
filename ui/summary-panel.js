// Reuse Codex's summary state: closing must release its reserved layout space.
export function createSummaryPanelAdapter({translations,attr}) {
 const labels=new Set(['Toggle summary','Toggle pinned summary']);
 for(const prefix of ['localConversation','chatgptConversations'])for(const suffix of ['toggle','togglePinned']){
  const label=translations[`${prefix}.summaryPanel.${suffix}`];if(label)labels.add(label);
 }
 const userContent='[data-message-author-role],[data-markdown-text-tone],[data-markdown-text-style],pre,code';
 const additions=new Set(),closeButtons=new Set(),toggles=new Set();
 const nativeToggle=()=>[...toggles].find(button=>button.isConnected&&
  !button.closest('[aria-hidden="true"],[inert]')&&button.getClientRects().length&&window.getComputedStyle(button).visibility==='visible');
 return {
  apply(query){
   for(const button of query('header button')){
    if(!labels.has(button.getAttribute('aria-label'))||button.closest(userContent))continue;
    attr(button,'data-rtl-summary-toggle','');
    toggles.add(button);
    // Include hidden header measurement copies so the real action fits too.
    if(!button.querySelector('[data-rtl-summary-label]')){
     const label=document.createElement('span');label.setAttribute('data-rtl-summary-label','');label.setAttribute('aria-hidden','true');label.textContent='פלטים ומקורות';button.append(label);additions.add(label);
    }
   }
   for(const slot of query('[data-slot="thread-summary-panel-section-actions"]')){
    if(slot.closest(userContent))continue;
    const card=slot.closest('.rounded-3xl.bg-surface-elevated-secondary');
    if(!card||card.querySelector('[data-rtl-summary-toolbar]'))continue;
    const toolbar=document.createElement('div');toolbar.setAttribute('data-rtl-summary-toolbar','');
    const title=document.createElement('span');title.textContent='פלטים ומקורות';
    const close=document.createElement('button');close.type='button';close.setAttribute('data-rtl-summary-close','');close.setAttribute('aria-label','סגירת פלטים ומקורות');close.title='סגירת פלטים ומקורות';close.textContent='×';
    close.onclick=()=>{const toggle=nativeToggle();if(toggle?.getAttribute('aria-pressed')==='true'){toggle.click();toggle.focus({preventScroll:true});}};
    toolbar.append(title,close);card.prepend(toolbar);additions.add(toolbar);closeButtons.add(close);
   }
   const open=nativeToggle()?.getAttribute('aria-pressed')==='true';
   for(const close of closeButtons){
    if(!close.isConnected){close.onclick=null;closeButtons.delete(close);continue;}
    const tabIndex=open&&window.getComputedStyle(close).pointerEvents!=='none'?0:-1;
    if(close.tabIndex!==tabIndex)close.tabIndex=tabIndex;
   }
   for(const node of additions)if(!node.isConnected)additions.delete(node);
   for(const button of toggles)if(!button.isConnected)toggles.delete(button);
  },
  stop(){for(const close of closeButtons)close.onclick=null;for(const node of additions)node.remove();closeButtons.clear();additions.clear();toggles.clear();},
 };
}

import {expect,test} from 'bun:test';
import {Window} from 'happy-dom';
import fs from 'node:fs';
import postcss from 'postcss';
import {installRTL} from '../../ui/rtl-adapter.js';

test('summary can close and reopen through the native control, including lazy popovers and cleanup',async()=>{
 const w=new Window({url:'app://-/index.html'});
 for(const key of ['document','MutationObserver','location'])globalThis[key]=w[key];globalThis.window=w;
 document.body.innerHTML='<header><div style="visibility:hidden"><button aria-label="Toggle summary" aria-pressed="true"></button></div><button id="toggle" aria-label="Toggle pinned summary" aria-pressed="true"><svg></svg></button></header><div class="rounded-3xl bg-surface-elevated-secondary"><div data-slot="thread-summary-panel-section-actions"></div></div><article data-message-author-role="user"><header><button aria-label="Toggle summary">User content</button></header></article>';
 const toggle=document.querySelector('#toggle');toggle.style.visibility='visible';
 for(const button of document.querySelectorAll('header button'))button.getClientRects=()=>[{width:120,height:28}];
 let nativeClicks=0;toggle.onclick=()=>{nativeClicks++;toggle.setAttribute('aria-pressed',String(toggle.getAttribute('aria-pressed')!=='true'));};
 const css=fs.readFileSync(new URL('../../ui/rtl.css',import.meta.url),'utf8');
 const shiftRule=postcss.parse(css).nodes.find(rule=>rule.nodes?.some(node=>node.prop==='transform'&&node.value.includes('--thread-wide-block-inline-shift')));
 document.body.insertAdjacentHTML('beforeend','<div class="thread-scroll-container"><div style="--thread-wide-block-inline-shift:158px;transform:translateX(-158px)"></div></div>');
 const thread=document.querySelector('.thread-scroll-container > div');
 const mac=installRTL({css,platform:'darwin'});
 expect(document.querySelectorAll('[data-rtl-summary-close]')).toHaveLength(0);
 expect(toggle.textContent).toBe('');
 expect([...document.querySelectorAll(shiftRule.selector)].includes(thread)).toBe(false);
 expect(document.documentElement.hasAttribute('data-rtl-windows-summary')).toBe(false);
 mac.stop();
 const adapter=installRTL({css,platform:'win32'});const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
 try{
  expect([...document.querySelectorAll(shiftRule.selector)].includes(thread)).toBe(true);
  expect(toggle.textContent).toContain('פלטים ומקורות');
  expect(document.querySelector('article').textContent).toBe('User content');
  const close=document.querySelector('[data-rtl-summary-close]');expect(close).not.toBeNull();
  close.click();await settle();expect(nativeClicks).toBe(1);expect(toggle.getAttribute('aria-pressed')).toBe('false');expect(close.tabIndex).toBe(-1);
  toggle.click();await settle();expect(close.tabIndex).toBe(0);
  document.querySelector('.rounded-3xl').remove();
  toggle.setAttribute('aria-label','Toggle summary');toggle.removeAttribute('aria-pressed');toggle.setAttribute('aria-expanded','true');
  toggle.onclick=()=>{nativeClicks++;toggle.setAttribute('aria-expanded',String(toggle.getAttribute('aria-expanded')!=='true'));};
  document.body.insertAdjacentHTML('beforeend','<div role="dialog" class="rounded-3xl bg-surface-elevated-secondary"><div data-slot="thread-summary-panel-section-actions"></div></div>');await settle();
  expect(document.querySelectorAll('[data-rtl-summary-close]')).toHaveLength(1);
  expect(document.querySelector('[data-rtl-summary-close]').tabIndex).toBe(0);
  document.querySelector('[data-rtl-summary-close]').click();await settle();expect(nativeClicks).toBe(3);expect(toggle.getAttribute('aria-expanded')).toBe('false');
  adapter.stop();expect(document.querySelectorAll('[data-rtl-summary-close]')).toHaveLength(0);expect(document.querySelector('[data-rtl-summary-toggle]')).toBeNull();expect(toggle.textContent).toBe('');expect(document.documentElement.hasAttribute('data-rtl-windows-summary')).toBe(false);expect([...document.querySelectorAll(shiftRule.selector)].includes(thread)).toBe(false);
 }finally{adapter.stop();await w.happyDOM.abort();}
});

import {test,expect} from 'bun:test';
import {Window} from 'happy-dom';
import {installStyles} from '../../ui/stylesheet-adapter.js';
import {installRTL} from '../../ui/rtl-adapter.js';
import fs from 'node:fs';
function environment(){const w=new Window({url:'app://-/index.html'});for(const key of ['document','MutationObserver','location'])globalThis[key]=w[key];globalThis.window=w;return w;}
test('empty search fields and the composer use scoped RTL alignment',()=>{
 const css=fs.readFileSync(new URL('../../ui/rtl.css',import.meta.url),'utf8');expect(css).toContain(':placeholder-shown');expect(css).toContain('.ProseMirror[contenteditable="true"]');expect(css).toContain('.ProseMirror .placeholder:after');expect(css).toContain(':has(> p[data-placeholder]:only-child > br.ProseMirror-trailingBreak:only-child) > p[data-placeholder]');expect(css).toContain('unicode-bidi: isolate;\n  text-align: right;');
});
test('paired back and forward icons both compose with RTL mirroring',()=>{
 const w=environment();document.body.innerHTML='<button aria-label="חזרה"><svg id="back" style="direction:rtl"><path d="navigation-arrow"/></svg></button><button aria-label="קדימה"><svg id="forward" style="direction:rtl;scale:-1 1"><path d="navigation-arrow"/></svg></button>';
 const adapter=installRTL({css:'',translations:{'codex.command.navigateBack':'חזרה','codex.command.navigateForward':'קדימה'},directionalIcons:[{signature:'navigation-arrow'}]});expect(document.querySelector('#back').hasAttribute('data-rtl-mirror')).toBe(true);expect(document.querySelector('#forward').hasAttribute('data-rtl-mirror')).toBe(true);adapter.stop();w.happyDOM.abort();
});
test('spatial carousel arrows keep the direction represented by their position',()=>{
 const w=environment();document.body.innerHTML='<button aria-label="הקול הקודם"><svg id="left" style="direction:rtl"><path d="navigation-arrow"/></svg></button><button aria-label="הקול הבא"><svg id="right" style="direction:rtl;scale:-1 1"><path d="navigation-arrow"/></svg></button>';
 const adapter=installRTL({css:'',directionalIcons:[{signature:'navigation-arrow'}]});expect(document.querySelector('#left').hasAttribute('data-rtl-mirror')).toBe(false);expect(document.querySelector('#right').hasAttribute('data-rtl-mirror')).toBe(false);adapter.stop();w.happyDOM.abort();
});
test('voice-picker arrows flip horizontally after their controls move in RTL',()=>{
 const w=environment();document.body.innerHTML='<button aria-label="הקול הקודם"><svg id="previous"><path d="left"/></svg></button><button aria-label="הקול הבא"><svg id="next"><path d="right"/></svg></button>';
 const adapter=installRTL({css:'',translations:{'settings.general.realtimeVoice.previous':'הקול הקודם','settings.general.realtimeVoice.next':'הקול הבא'}});expect(document.querySelector('#previous').hasAttribute('data-rtl-mirror')).toBe(true);expect(document.querySelector('#next').hasAttribute('data-rtl-mirror')).toBe(true);adapter.stop();w.happyDOM.abort();
});
test('application scroll containers keep their scrollbar on the physical right',()=>{
 const w=environment();document.body.innerHTML='<main class="overflow-y-auto"><section id="content">תוכן</section></main><div class="xterm overflow-y-auto" id="terminal"></div>';
 const adapter=installRTL({css:''});expect(document.querySelector('main').hasAttribute('data-rtl-scrollbar-right')).toBe(true);expect(document.querySelector('#terminal').hasAttribute('data-rtl-scrollbar-right')).toBe(false);adapter.stop();w.happyDOM.abort();
});
test('visible native file inputs show the localized empty-selection label and restore cleanly',()=>{
 const w=environment();document.body.innerHTML='<input id="visible" type="file"><input id="hidden" type="file" hidden>';
 const input=document.querySelector('#visible');input.getClientRects=()=>[{width:120,height:24}];
 const adapter=installRTL({css:'',translations:{'No file chosen':'לא נבחר קובץ'}});
 expect(input.hasAttribute('data-rtl-file-input')).toBe(true);expect(input.nextElementSibling.textContent).toBe('לא נבחר קובץ');expect(document.querySelector('#hidden').nextElementSibling).toBe(null);
 const label=input.nextElementSibling;
 adapter.stop();expect(document.querySelector('[data-rtl-file-name]')).toBe(null);expect(input.hasAttribute('data-rtl-file-input')).toBe(false);
 label.textContent='Stopped';input.dispatchEvent(new w.Event('change'));expect(label.textContent).toBe('Stopped');
 const replacement=installRTL({css:''});input.nextElementSibling.textContent='Pending';input.dispatchEvent(new w.Event('change'));
 expect(input.nextElementSibling.textContent).toBe('לא נבחר קובץ');expect(label.textContent).toBe('Stopped');replacement.stop();w.happyDOM.abort();
});
test('the translated log-out action mirrors its directional icon',()=>{
 const w=environment();document.body.innerHTML='<button><svg id="logout" style="direction:rtl"><path d="logout-icon"/></svg><span>התנתקות</span></button>';
 const adapter=installRTL({css:'',translations:{'codex.profileDropdown.logOut':'התנתקות'}});expect(document.querySelector('#logout').hasAttribute('data-rtl-mirror')).toBe(true);adapter.stop();w.happyDOM.abort();
});
test('Latin profile names stay grouped with their avatar at RTL start',async()=>{
 const w=environment();document.body.innerHTML='<div><button id="profile" aria-label="פתיחת תפריט הפרופיל"><span id="avatar">GH</span><span id="footer-name" class="min-w-0 flex-1 truncate">Gal Havkin</span></button></div><div role="menu"><button id="account" role="menuitem"><span>GH</span><span id="menu-name" class="truncate">Gal Havkin</span><span>פרו</span></button></div>';
 const adapter=installRTL({css:'',translations:{'codex.profileFooter.openProfileMenu':'פתיחת תפריט הפרופיל'}});
 const credit=document.querySelector('[data-codex-hebrew-credit]');
 expect(document.querySelector('#footer-name').dir).toBe('auto');expect(document.querySelector('#menu-name').dir).toBe('auto');expect(document.querySelector('#profile').hasAttribute('data-rtl-profile-account')).toBe(true);expect(document.querySelector('#account').hasAttribute('data-rtl-profile-account-menuitem')).toBe(true);
 expect(credit?.textContent).toBe('פותח על ידי גל חבקין');expect(credit?.nextElementSibling).toBe(document.querySelector('#profile'));expect(document.querySelectorAll('[data-codex-hebrew-credit]')).toHaveLength(1);
 adapter.stop();expect(document.querySelector('[data-codex-hebrew-credit]')).toBeNull();expect(document.querySelector('#profile').hasAttribute('data-rtl-profile-account')).toBe(false);expect(document.querySelector('#account').hasAttribute('data-rtl-profile-account-menuitem')).toBe(false);w.happyDOM.abort();
});
test('replacement stylesheet keeps source order, handles lazy links, and restores originals',async()=>{
 const w=environment();const link=document.createElement('link');link.disabled=false;link.rel='stylesheet';link.href='app://-/assets/main.css';document.head.append(link);
 const adapter=installStyles({'/assets/main.css':'.row{margin-inline-start:4px}','/assets/lazy.css':'.row{padding-inline-end:2px}'});
 expect(link.disabled).toBe(true);expect(link.previousElementSibling.textContent).toContain('margin-inline-start');
 const lazy=document.createElement('link');lazy.disabled=false;lazy.rel='stylesheet';lazy.href='app://-/assets/lazy.css';document.head.append(lazy);await new Promise(resolve=>setTimeout(resolve,0));expect(adapter.status().replacedStylesheets).toBe(2);expect(lazy.disabled).toBe(true);
 adapter.stop();expect(link.disabled).toBe(false);expect(lazy.disabled).toBe(false);expect(document.querySelectorAll('[data-chatgpt-r-t-l-asset]').length).toBe(0);w.happyDOM.abort();
});
test('streaming mutations scan only their changed subtree',async()=>{
 const w=environment();document.body.innerHTML='<main><div id="chart"></div></main>';const adapter=installRTL({css:''}),original=document.querySelectorAll.bind(document);let documentScans=0;document.querySelectorAll=(...args)=>{documentScans++;return original(...args);};
 const label=document.createElement('span');label.className='truncate';label.textContent='נקודה 42';document.querySelector('#chart').append(label);await new Promise(resolve=>setTimeout(resolve,0));
 expect(documentScans).toBe(0);expect(label.dir).toBe('auto');document.querySelectorAll=original;adapter.stop();w.happyDOM.abort();
});
test('truncation, chat blocks and mixed inputs get their own direction without reversing the surrounding row',()=>{
 const w=environment();document.body.innerHTML='<div class="flex"><span class="truncate">English title</span><span class="truncate">כותרת</span></div><div data-message-author-role="assistant"><p>English <b>mixed</b></p><pre><code>const value = 1</code></pre></div><input type="search"><input type="url"><pre><span class="truncate">code</span></pre>';
 const adapter=installRTL({css:''});expect(document.documentElement.dir).toBe('rtl');expect([...document.querySelectorAll('.flex .truncate')].every(el=>el.dir==='auto')).toBe(true);expect(document.querySelector('input[type=search]').dir).toBe('auto');expect(document.querySelector('input[type=url]').dir).toBe('');expect(document.querySelector('pre span').dir).toBe('');
 expect(document.querySelector('[data-message-author-role]').dir).toBe('auto');expect(document.querySelector('[data-message-author-role] p').dir).toBe('auto');expect(document.querySelector('[data-message-author-role] code').dir).toBe('');
 adapter.stop();expect(document.querySelector('.truncate').hasAttribute('dir')).toBe(false);expect(document.documentElement.hasAttribute('dir')).toBe(false);w.happyDOM.abort();
});
test('a lazily mounted application menu receives RTL and restores its original direction',async()=>{
 const w=environment();const adapter=installRTL({css:''});
 const menu=document.createElement('div');menu.role='menu';menu.dir='ltr';menu.innerHTML='<button id="settings" role="menuitem"><span>Settings</span><span class="ms-2 shrink-0 text-xs">⌘,</span></button><div dir="ltr"><div role="menu"><button id="open" role="menuitem">Open</button></div></div>';document.body.append(menu);
 let activated=false;document.querySelector('#open').addEventListener('keydown',event=>{if(event.key==='ArrowRight')activated=true;});
 await new Promise(resolve=>setTimeout(resolve,0));expect(menu.dir).toBe('rtl');expect(document.querySelector('[dir="ltr"] [role="menu"]').dir).toBe('rtl');
 const key=new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true});document.querySelector('#open').dispatchEvent(key);expect(activated).toBe(true);expect(key.defaultPrevented).toBe(false);expect([...document.querySelectorAll('button')].map(button=>button.id)).toEqual(['settings','open']);
 adapter.stop();expect(menu.dir).toBe('ltr');w.happyDOM.abort();
});
test('streamed chat keeps logical content, technical surfaces, composition, focus order, and directional chrome',async()=>{
 const w=environment();document.body.innerHTML='<button id="before">Before</button><article data-message-author-role="assistant"><p>שלום OpenAI 123 https://example.com/a?b=1</p><ul><li>פריט one</li></ul><table><tbody><tr><td>ערך 42</td></tr></tbody></table><a href="https://example.com/citation">[1]</a><pre><code>const answer = "שלום";</code></pre><dil-renderer>+ unchanged diff line</dil-renderer><div data-codex-terminal><div class="xterm">$ printf שלום</div></div><svg id="content-arrow" class="lucide-chevron-right"><path d="content"/></svg></article><textarea id="composer">שלום OpenAI</textarea><button id="after"><svg class="lucide-chevron-right" style="direction:rtl"><path d="chrome"/></svg>After</button>';
 const original=document.body.textContent,order=[...document.querySelectorAll('button,textarea,a')];let composed=false;const composer=document.querySelector('#composer');composer.addEventListener('compositionend',()=>{composed=true;});
 const adapter=installRTL({css:''});
 expect(document.body.textContent).toBe(original);expect(document.querySelector('article').dir).toBe('auto');expect(document.querySelector('article p').dir).toBe('auto');expect(document.querySelector('li').dir).toBe('auto');expect(document.querySelector('td').dir).toBe('auto');
 expect(document.querySelector('pre').dir).toBe('');expect(document.querySelector('dil-renderer').dir).toBe('ltr');expect(document.querySelector('[data-codex-terminal]').dir).toBe('ltr');expect(document.querySelector('.xterm').dir).toBe('ltr');
 expect(document.querySelector('#content-arrow').hasAttribute('data-rtl-mirror')).toBe(false);expect(document.querySelector('#after svg').hasAttribute('data-rtl-mirror')).toBe(false);expect([...document.querySelectorAll('button,textarea,a')]).toEqual(order);
 composer.value='שלום OpenAI 42';composer.dispatchEvent(new w.Event('compositionend',{bubbles:true}));expect(composed).toBe(true);expect(composer.value).toBe('שלום OpenAI 42');
 const streamed=document.createElement('li');streamed.textContent='stream חדש 7';document.querySelector('ul').append(streamed);await new Promise(resolve=>setTimeout(resolve,0));expect(streamed.dir).toBe('auto');expect(streamed.textContent).toBe('stream חדש 7');
 const withStream=document.body.textContent;adapter.stop();expect(document.body.textContent).toBe(withStream);expect(document.querySelector('dil-renderer').hasAttribute('dir')).toBe(false);expect(document.querySelector('#after svg').hasAttribute('data-rtl-mirror')).toBe(false);w.happyDOM.abort();
});
test('real Codex conversation roots give each BiDi paragraph its own direction',async()=>{
 const w=environment();document.body.innerHTML='<article><div data-markdown-text-tone="user-message"><p>שלום OpenAI 123 (beta)</p><p>English עברית 42</p></div><div data-markdown-text-style="assistant-message"><blockquote><p style="direction:rtl">בדיקה /tmp/report.txt</p></blockquote><ul><li><p style="direction:rtl">פריט --verbose</p></li></ul><table dir="auto"><thead><tr><th dir="auto" style="direction:rtl">עברית</th><th dir="auto">English</th><th dir="auto" style="direction:rtl">צבע</th></tr></thead></table><p>פתח <a href="https://example.com/a?b=1">https://example.com/a?b=1</a></p><pre><code>const value = "שלום";</code></pre></div></article><div contenteditable="true" class="ProseMirror" data-codex-composer="true" dir="auto"><p>English ואז עברית</p><p>עברית then English</p></div>';
 const original=document.body.textContent,roots=[...document.querySelectorAll('[data-markdown-text-tone],[data-markdown-text-style]')];const adapter=installRTL({css:''});
 expect(roots.every(root=>root.dir==='auto')).toBe(true);expect([...document.querySelectorAll('[data-markdown-text-tone] p,[data-markdown-text-style] p')].every(block=>block.dir==='auto')).toBe(true);expect([...document.querySelectorAll('.ProseMirror p')].every(block=>!block.hasAttribute('dir'))).toBe(true);expect(document.querySelector('a').dir).toBe('auto');expect(document.querySelector('blockquote').dir).toBe('rtl');expect(document.querySelector('ul').dir).toBe('rtl');expect(document.querySelector('li').dir).toBe('rtl');expect(document.querySelector('table').dir).toBe('rtl');expect(document.querySelector('pre').dir).toBe('');expect(document.querySelector('code').dir).toBe('');expect(document.body.textContent).toBe(original);
 const streamed=document.createElement('p');streamed.textContent='חדש English 7';roots[1].append(streamed);await new Promise(resolve=>setTimeout(resolve,0));expect(streamed.dir).toBe('auto');expect(streamed.textContent).toBe('חדש English 7');
 const streamedText=document.body.textContent;adapter.stop();expect(document.body.textContent).toBe(streamedText);w.happyDOM.abort();
});

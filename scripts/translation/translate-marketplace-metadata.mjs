import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readHebrewCatalog} from './hebrew-catalog.mjs';
import {runtimeTranslator} from './runtime-translations.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const displayNameOverrides={Canva:'קנבה',CircleCI:'סירקל סי־איי',Cloudflare:'קלאודפלייר',Consensus:'קונסנזוס','Datadog (Preview)':'דאטהדוג (תצוגה מקדימה)',Higgsfield:'היגספילד','HyperFrames by HeyGen':'הייפרפריימס מבית הייג׳ן','Mixpanel Headless':'מיקספאנל ללא ממשק משתמש','monday.com':'מאנדיי.קום',PostHog:'פוסטהוג',Remotion:'רימושן',Sentry:'סנטרי',Shopify:'שופיפיי',Supabase:'סופאבייס',Teams:'טימס',Zoom:'זום',Zotero:'זוטרו','Build iOS Apps':'בניית אפליקציות לאיי־או־אס','Life Sciences NGS Analysis':'ניתוח אן־ג׳י־אס במדעי החיים','OpenAI Ads Conversions':'המרות פרסום של אופן־איי','OpenAI Developers':'מפתחי אופן־איי'};
Object.assign(displayNameOverrides,{
 BigQuery:'ביג קוורי',Longbridge:'לונגברידג׳','Rosalind Workbench':'שולחן העבודה רוזלינד',Attio:'אטיו',Trello:'טרלו',OpenArt:'אופן ארט',Runway:'ראנוויי',Magnific:'מגניפיק',Exa:'אקסה',Floot:'פלוט',WPVibe:'דבליו־פי וייב',HubSpot:'האבספוט','Windsor.ai':'וינדזור איי־איי','Metricool for Social Media':'מטריקול לרשתות חברתיות',vidIQ:'ויד איי־קיו',ZoomInfo:'זום אינפו',Mixpanel:'מיקספאנל','Porter Metrics':'מדדי פורטר','Helium 10':'הליום 10',Serpstat:'סרפסטאט','Superhuman Mail':'סופרהיומן מייל','Hostinger Mail':'הוסטינגר מייל','Mailopoly Inbox':'תיבת הדואר מיילופולי',Tarteel:'תרתיל','Explain Video Generator':'מחולל הסרטונים אקספליין','Acumen by Talarion':'אקומן מבית טלריון',SciSpace:'סיי ספייס','Kahoot!':'קהוט!',Undermind:'אנדרמיינד','Tamarind Bio':'טמרינד ביו','Inductive Bio':'אינדקטיב ביו','NGS Analysis Workbench':'שולחן עבודה לניתוח אן־ג׳י־אס',Proto:'פרוטו',Malwarebytes:'מלוורבייטס',PrivacyHawk:'פרייבסי הוק',Bitdefender:'ביטדפנדר','PureVPN Privacy Assistant':'מסייע הפרטיות פיור וי־פי־אן','AJAXX Data Scrubber':'מנקה הנתונים אייג׳קס','Interactive Brokers (IBKR)':'אינטראקטיב ברוקרס (איי־בי־קיי־אר)',Alpaca:'אלפקה',Parqet:'פארקט',MyInvestor:'מיי אינווסטור',COROS:'קורוס','Fitness AI Connector':'מחבר כושר מבוסס בינה מלאכותית',Tredict:'טרדיקט','Calorie Tracker':'מעקב קלוריות',freddy:'פרדי',Fitbod:'פיטבוד',TABLEALL:'טייבלאול','ForeFlight Mobile':'פורפלייט למובייל',Skyscanner:'סקייסקאנר',komoot:'קומוט','Booking.com':'בוקינג.קום',Chessy:'צ׳סי',SoundBreak:'סאונדברייק','Smart Chess:Train+Learn to win':'שחמט חכם: אימון ולמידה לניצחון',Spotify:'ספוטיפיי',"PocketMind: Texas Hold'em":'פוקטמיינד: טקסס הולדם','Piano 1024':'פסנתר 1024',Astrologic:'אסטרולוג׳יק',Kleinanzeigen:'קליינאנצייגן',Tarot:'טארוט','TriAstra Astrology & Saju':'אסטרולוגיה וסאג׳ו של טריאסטרה','Ask Tarot Cards':'שאלו את קלפי הטארוט','Astro Scope: Astrology':'אסטרו סקופ: אסטרולוגיה',
});
Object.assign(displayNameOverrides,{'Pocket AI':'פוקט איי־איי',Box:'בוקס',Lucid:'לוסיד',Krisp:'קריספ',Tally:'טאלי','Read AI':'ריד איי־איי','CVpop - Resume & CV Builder':'סי־וי־פופ – בונה קורות חיים',Adverity:'אדווריטי',LinkedIn:'לינקדאין',Hex:'הקס',Statsig:'סטאטסיג',NaCl:'נאקל','$nipp':'$nipp'});
const shortDescriptionOverrides={'Summarize Teams and follow up':'סיכום טימס ומעקב אחר המשך טיפול','Smart meeting insights from Zoom':'תובנות חכמות מפגישות זום','Write HTML, render video':'כתיבת אייץ׳־טי־אם־אל ורינדור סרטונים','Analyze Mixpanel data with Python':'ניתוח נתוני מיקספאנל באמצעות פייתון','Build and deploy web apps and agents':'בניית אפליקציות וסוכני ווב ופריסתם','Triage PRs, issues, CI, and publish flows':'מיון בקשות משיכה, תקלות, שילוב מתמשך ותהליכי פרסום','Cloudflare platform guidance with official MCP':'הנחיות לפלטפורמת קלאודפלייר באמצעות אם־סי־פי הרשמי','Find papers and add citations from Zotero':'מציאת מאמרים והוספת ציטוטים מזוטרו','Guided NGS routing and local execution for sequencing analysis':'ניתוב מונחה של אן־ג׳י־אס וביצוע מקומי לניתוח ריצוף'};
Object.assign(shortDescriptionOverrides,{'Get insights on your marketing':'קבלת תובנות על השיווק שלכם','Search Pocket recordings':'חיפוש בהקלטות פוקט','Search and reference documents':'חיפוש מסמכים והפניה אליהם','Ideate, diagram & align teams.':'פיתוח רעיונות, יצירת תרשימים ותיאום בין צוותים','Add meeting context to chats':'הוספת הקשר מפגישות לשיחות','Create beautiful forms':'יצירת טפסים יפים','AI Meeting Notes & Transcripts':'סיכומי פגישות ותמלולים באמצעות בינה מלאכותית','Your next job starts here':'המשרה הבאה שלכם מתחילה כאן'});
const remoteCatalog=path.resolve(process.argv[3]||path.join(os.homedir(),'Library','Application Support','ChatGPT Hebrew','codex-home','cache','remote_plugin_catalog'));
const marketplace=path.resolve(process.argv[2]||path.join(os.homedir(),'Library','Application Support','ChatGPT Hebrew','codex-home','.tmp','plugins'));
const pluginRoot=path.join(marketplace,'plugins'),fields=['description','displayName','shortDescription','longDescription','category','capabilities','defaultPrompt'],entries=[];
const manifests=fs.readdirSync(pluginRoot,{withFileTypes:true}).filter(item=>item.isDirectory()).map(item=>path.join(pluginRoot,item.name,'.codex-plugin','plugin.json')).filter(file=>fs.existsSync(file)).sort();
const add=(pluginId,field,index,source)=>{if(typeof source==='string'&&source.trim())entries.push({id:`${pluginId}/${field}${index==null?'':`/${index}`}`,pluginId,field,index:index??null,source});};
for(const file of manifests){
 const pluginId=path.basename(path.dirname(path.dirname(file))),value=JSON.parse(fs.readFileSync(file,'utf8')),ui=value.interface??{};
 add(pluginId,'description',null,value.description);
 for(const field of fields.slice(1))Array.isArray(ui[field])?ui[field].forEach((source,index)=>add(pluginId,field,index,source)):add(pluginId,field,null,ui[field]);
}
const remotePlugins=new Map;
for(const item of fs.readdirSync(remoteCatalog,{withFileTypes:true}).filter(item=>item.isFile()&&item.name.endsWith('.json'))){
 const value=JSON.parse(fs.readFileSync(path.join(remoteCatalog,item.name),'utf8'));
 for(const plugin of value.plugins??[])remotePlugins.set(plugin.id,plugin);
}
for(const [pluginId,plugin]of remotePlugins){
 const release=plugin.release??{},ui=release.interface??{};
 add(`connected:${pluginId}`,'displayName',null,release.display_name);
 add(`connected:${pluginId}`,'shortDescription',null,ui.short_description??release.description);
}
const canonical=readHebrewCatalog(),categories=canonical.runtime.pluginCategories??{},translator=runtimeTranslator(root),translations=new Map();
const unique=[...new Map(entries.map(entry=>[entry.source,entry])).values()].filter(entry=>!categories[entry.source]&&!(entry.field==='displayName'&&displayNameOverrides[entry.source])&&!(entry.field!=='displayName'&&shortDescriptionOverrides[entry.source]));
for(let index=0;index<unique.length;index+=300){
 const group=unique.slice(index,index+300),batches=[];
 for(let batchIndex=0;batchIndex<group.length;batchIndex+=50)batches.push(group.slice(batchIndex,batchIndex+50));
 const results=await Promise.all(batches.map(batch=>translator.translateConcurrent(batch.map(entry=>({source:entry.source,kind:entry.field==='displayName'?'plugin-name':entry.field==='category'?'plugin-category':'plugin-description'})))));
 for(const item of results.flat())translations.set(item.source,item.translation);
 console.log(`Marketplace metadata: ${Math.min(index+300,unique.length)}/${unique.length}`);
}
for(const entry of entries)entry.translation=((entry.field==='displayName'&&displayNameOverrides[entry.source])||(entry.field!=='displayName'&&shortDescriptionOverrides[entry.source])||categories[entry.source])??translations.get(entry.source);
const missingEntries=entries.filter(entry=>typeof entry.translation!=='string'||!entry.translation.trim());
if(missingEntries.length)throw Error(`Marketplace metadata translation is incomplete: ${JSON.stringify(missingEntries.slice(0,10).map(({field,source})=>({field,source})))}`);
const commit=Bun.spawnSync(['git','-C',marketplace,'rev-parse','HEAD'],{stdout:'pipe',stderr:'pipe'});if(commit.exitCode!==0)throw Error('Marketplace source commit is unavailable');
const sourceSha256=crypto.createHash('sha256').update(entries.map(({id,source})=>`${id}\0${source}\0`).join('')).digest('hex');
const catalog={schemaVersion:1,generatedAt:new Date().toISOString(),sourceCommit:commit.stdout.toString().trim(),sourceSha256,plugins:manifests.length,connectedPlugins:remotePlugins.size,entries};
fs.writeFileSync(path.join(root,'catalogs','marketplace-hebrew.json'),JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({plugins:catalog.plugins,entries:entries.length,uniqueSources:new Set(entries.map(entry=>entry.source)).size,translator:translator.status()}));

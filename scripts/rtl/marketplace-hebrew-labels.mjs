import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {readHebrewCatalog} from '../translation/hebrew-catalog.mjs';

const defaultCatalog=fileURLToPath(new URL('../../catalogs/marketplace-hebrew.json',import.meta.url));
const signatures={
 local:'function kSn(e){return{category:e.plugin.interface?.category??null,creatorName:e.plugin.shareContext?.creatorName?.trim()||null,description:e.description,disabledReason:e.plugin.disabledReason??null,displayName:e.displayName??e.plugin.name,',
 shared:'function MSn(e,t){let n=e.release.interface,r;return e.scope===`WORKSPACE`?r=`workspace`:e.scope===`USER`&&(r=`user-cloud`),{category:n.category??t?.plugin.interface?.category??null,creatorName:((`creator_name`in e?e.creator_name:null)??t?.plugin.shareContext?.creatorName)?.trim()||null,description:n.short_description??e.release.description,disabledReason:e.disabled_reason??t?.plugin.disabledReason??null,displayName:e.release.display_name,',
 remote:'function FSn(e,t){return{category:t?.plugin.interface?.category??null,description:e.short_description,disabledReason:e.disabled_reason??t?.plugin.disabledReason??null,displayName:e.display_name,',
 localKeywords:'keywords:e.keywords??[],logoDarkPath:',
 sharedKeywords:'keywords:n.capabilities,logoDarkPath:',
 remoteKeywords:'keywords:e.keywords??t?.keywords??[],logoDarkPath:',
 searchNormalization:'function TX(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,` `).trim()}',
 sections:'s.set(t,{id:t,title:e.title,urlSlug:e.url_slug,plugins:n})',
 localSections:'s.set(i.id,{id:i.id,title:i.title,urlSlug:null,plugins:e})',
 grouped:'return{section:{id:`plugins-${wX(e).replaceAll(` `,`-`)}`,title:e},plugins:ySn(t,n)',
 detailName:'function Xd(e){return e.summary.interface?.displayName??e.summary.name}',
 detailDescriptions:'function ef(e){return e.summary.interface?.longDescription??e.description??e.summary.interface?.shortDescription??null}function tf(e){return e.summary.interface?.shortDescription??e.description??e.summary.interface?.longDescription??null}',
 prompt:'function _d(e){return e.trim()}',
 informationCategory:'a=i.category?.trim()',
 informationCapabilities:'u=i.capabilities?.join(`, `)',
 pluginPage:'function Td(e){let t=(0,kd.c)(22)',
 pluginCardName:'F=Le(E)',
 pluginRowName:'let t=Le(e);return',
 pluginPreviewNames:'t.slice(0,2).map(Le).join(`, `)',
 pluginDisplayName:'pluginDisplayName:Le(e)',
 pluginDescription:'children:E.description})',
};

const helper=labels=>`const hebrewMarketplaceLabels=${JSON.stringify(labels)};function hebrewMarketplaceLabel(e){return typeof e===\`string\`?hebrewMarketplaceLabels[e]??e:e}`;
function replaceSignatures(source,replacements){
 for(const [signature,replacement]of replacements){const count=source.split(signature).length-1;if(count!==1)throw Error(`Marketplace Hebrew signature changed: ${signature}`);source=source.replace(signature,()=>replacement);}
 return source;
}
function patchMarketplaceCatalogLabels(source,labels){
 return replaceSignatures(source,new Map([
  [signatures.local,`${helper(labels)}function kSn(e){return{category:hebrewMarketplaceLabel(e.plugin.interface?.category??null),creatorName:e.plugin.shareContext?.creatorName?.trim()||null,description:hebrewMarketplaceLabel(e.description),disabledReason:e.plugin.disabledReason??null,displayName:hebrewMarketplaceLabel(e.displayName??e.plugin.name),`],
  [signatures.shared,'function MSn(e,t){let n=e.release.interface,r;return e.scope===`WORKSPACE`?r=`workspace`:e.scope===`USER`&&(r=`user-cloud`),{category:hebrewMarketplaceLabel(n.category??t?.plugin.interface?.category??null),creatorName:((`creator_name`in e?e.creator_name:null)??t?.plugin.shareContext?.creatorName)?.trim()||null,description:hebrewMarketplaceLabel(n.short_description??e.release.description),disabledReason:e.disabled_reason??t?.plugin.disabledReason??null,displayName:hebrewMarketplaceLabel(e.release.display_name),'],
  [signatures.remote,'function FSn(e,t){return{category:hebrewMarketplaceLabel(t?.plugin.interface?.category??null),description:hebrewMarketplaceLabel(e.short_description),disabledReason:e.disabled_reason??t?.plugin.disabledReason??null,displayName:hebrewMarketplaceLabel(e.display_name),'],
  [signatures.localKeywords,'keywords:[...(e.keywords??[]),e.displayName??e.plugin.name,e.description,hebrewMarketplaceLabel(e.description)],logoDarkPath:'],
  [signatures.sharedKeywords,'keywords:[...(n.capabilities??[]),e.release.display_name,n.short_description??e.release.description,hebrewMarketplaceLabel(n.short_description??e.release.description)],logoDarkPath:'],
  [signatures.remoteKeywords,'keywords:[...(e.keywords??t?.keywords??[]),e.display_name,e.short_description,hebrewMarketplaceLabel(e.short_description)],logoDarkPath:'],
  [signatures.searchNormalization,'function TX(e){return e.toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu,` `).trim()}'],
  [signatures.sections,'s.set(t,{id:t,title:hebrewMarketplaceLabel(e.title),urlSlug:e.url_slug,plugins:n})'],
  [signatures.localSections,'s.set(i.id,{id:i.id,title:hebrewMarketplaceLabel(i.title),urlSlug:null,plugins:e})'],
  [signatures.grouped,'return{section:{id:`plugins-${wX(e).replaceAll(` `,`-`)}`,title:hebrewMarketplaceLabel(e)},plugins:ySn(t,n)'],
 ]));
}
function patchMarketplaceDetailLabels(source,labels){
 return replaceSignatures(source,new Map([
  [signatures.detailName,`${helper(labels)}function Xd(e){return hebrewMarketplaceLabel(e.summary.interface?.displayName??e.summary.name)}`],
  [signatures.detailDescriptions,'function ef(e){return hebrewMarketplaceLabel(e.summary.interface?.longDescription??e.description??e.summary.interface?.shortDescription??null)}function tf(e){return hebrewMarketplaceLabel(e.summary.interface?.shortDescription??e.description??e.summary.interface?.longDescription??null)}'],
  [signatures.prompt,'function _d(e){return hebrewMarketplaceLabel(e.trim())}'],
  [signatures.informationCategory,'a=hebrewMarketplaceLabel(i.category?.trim())'],
  [signatures.informationCapabilities,'u=i.capabilities?.map(hebrewMarketplaceLabel).join(`, `)'],
 ]));
}
function patchMarketplacePluginPageLabels(source,labels){
 const displayNameCount=source.split(signatures.pluginDisplayName).length-1;
 if(displayNameCount!==3)throw Error(`Marketplace Hebrew signature changed: ${signatures.pluginDisplayName}`);
 source=replaceSignatures(source,new Map([
  [signatures.pluginPage,`${helper(labels)}function Td(e){let t=(0,kd.c)(22)`],
  [signatures.pluginCardName,'F=hebrewMarketplaceLabel(Le(E))'],
  [signatures.pluginRowName,'let t=hebrewMarketplaceLabel(Le(e));return'],
  [signatures.pluginPreviewNames,'t.slice(0,2).map(e=>hebrewMarketplaceLabel(Le(e))).join(`, `)'],
  [signatures.pluginDescription,'children:hebrewMarketplaceLabel(E.description)})'],
 ]));
 return source.replaceAll(signatures.pluginDisplayName,'pluginDisplayName:hebrewMarketplaceLabel(Le(e))');
}

export function findAndPatchMarketplaceHebrewLabels(archive,catalog=JSON.parse(fs.readFileSync(defaultCatalog,'utf8')),priorChanges={},canonical=readHebrewCatalog()){
 const labels=Object.fromEntries([...canonical.hardcoded,...canonical.metadata].filter(entry=>entry.disposition==='translated').map(entry=>[entry.source,entry.translation]));
 Object.assign(labels,canonical.runtime.pluginCategories,Object.fromEntries(Object.values(canonical.runtimeCache).filter(entry=>entry.kind==='plugin-name'||entry.kind==='plugin-description').map(entry=>[entry.source,entry.translation])),Object.fromEntries(catalog.entries.map(entry=>[entry.source,entry.translation])));
 const read=file=>priorChanges[file]??archive.read(file),catalogFiles=archive.files.filter(file=>/^webview\/assets\/app-primary-[\w-]+\.js$/.test(file)&&read(file).includes(signatures.local)),detailFiles=archive.files.filter(file=>/^webview\/assets\/plugin-detail-page-[\w-]+\.js$/.test(file)&&read(file).includes(signatures.detailName)),pluginPageFiles=archive.files.filter(file=>/^webview\/assets\/plugins-page-[\w-]+\.js$/.test(file)&&read(file).includes(signatures.pluginPage));
 if(catalogFiles.length===0&&detailFiles.length===0&&pluginPageFiles.length===0&&!archive.files.includes('webview/index.html'))return{};
 if(catalogFiles.length!==1||detailFiles.length!==1||pluginPageFiles.length!==1)throw Error('Marketplace renderer bundle signature changed');
 return{[catalogFiles[0]]:patchMarketplaceCatalogLabels(read(catalogFiles[0]),labels),[detailFiles[0]]:patchMarketplaceDetailLabels(read(detailFiles[0]),labels),[pluginPageFiles[0]]:patchMarketplacePluginPageLabels(read(pluginPageFiles[0]),labels)};
}

import {exactSourceHebrew, safePolish} from './hebrew-ui-style.mjs';
import {signature} from './icu-signature.mjs';
import {readHebrewCatalog,writeHebrewCatalog} from './hebrew-catalog.mjs';

const catalog=readHebrewCatalog();
const nativeById=new Map(Object.entries(catalog.polishById));

const nativeBySource=new Map(Object.entries(catalog.polishBySource));

function rewrite(source, translation, extra, options) {
  if (typeof translation !== 'string') return translation;
  if (extra?.disposition && extra.disposition !== 'translated' && extra.disposition !== 'draft' && extra.disposition !== 'approved' && !exactSourceHebrew.has(source)) return translation;
  if (nativeBySource.has(source)) return nativeBySource.get(source);
  return safePolish(source, translation, options);
}

let changed = 0;
function bump(before, after) {
  if (before !== after) changed++;
  return after;
}

for (const message of catalog.messages) {
  if (message.status === 'obsolete' || !message.translation) continue;
  const id = message.originalId || message.id.replace(/^@messageId:/, '');
  let next = nativeById.get(id);
  if (next) {
    try { if (signature(message.source) !== signature(next)) next = null; } catch { next = null; }
  }
  if (!next) next = rewrite(message.source, message.translation, {disposition: message.status}, {source: message.source});
  message.translation = bump(message.translation, next);
}
for (const section of ['hardcoded','native','nativeDynamic','dynamic','metadata']) {
  for (const entry of catalog[section]) {
    if (!entry.translation) continue;
    const source = entry.source || entry.sourceTemplate;
    const previous=entry.translation;
    entry.translation = bump(previous, rewrite(source, previous, entry, {source}));
    if(entry.translation!==previous&&exactSourceHebrew.has(source)){
      entry.disposition='translated';delete entry.reason;
    }
  }
}

const runtime = catalog.runtime;
for (const [source, translation] of Object.entries(runtime.interfaceLabels)) {
  runtime.interfaceLabels[source] = bump(translation, safePolish(source, translation, {restoreGpt: false, keepTrailingNbsp: true, source}));
}
for (const [source, translation] of Object.entries(runtime.literalLabels)) {
  runtime.literalLabels[source] = bump(translation, safePolish(source, translation, {source}));
}
for (const [source, translation] of Object.entries(runtime.pluginCategories)) {
  runtime.pluginCategories[source] = bump(translation, safePolish(source, translation, {source}));
}
for(const entry of Object.values(catalog.runtimeCache)){
    if(typeof entry?.source!=='string'||typeof entry?.translation!=='string')continue;
    entry.translation=bump(entry.translation,safePolish(entry.source,entry.translation,{source:entry.source}));
}

writeHebrewCatalog(catalog);

console.log(JSON.stringify({changed}));

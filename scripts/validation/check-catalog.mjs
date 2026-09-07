import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {signature} from '../translation/icu-signature.mjs';
import {readHebrewCatalog} from '../translation/hebrew-catalog.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const locale = process.argv[2] || 'he';
if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)) throw new Error('Invalid locale');
if(locale!=='he')throw new Error('This project has one canonical Hebrew catalog');
const source = JSON.parse(fs.readFileSync(`${root}catalogs/source/en.json`, 'utf8'));
const catalog = readHebrewCatalog();
const originals = new Map(source.messages.map(m => [m.id, m]));
const errors = [], seen = new Set();
let translated = 0;
for (const m of catalog.messages) {
  if (seen.has(m.id)) errors.push(`${m.id}: duplicate ID`);
  seen.add(m.id);
  if (!['untranslated','draft','approved','needs-review','obsolete'].includes(m.status)) errors.push(`${m.id}: invalid status`);
  if (m.status === 'obsolete') {if (originals.has(m.id)) errors.push(`${m.id}: active ID marked obsolete`); continue;}
  const original = originals.get(m.id);
  if (!original || original.sourceHash !== m.sourceHash) {errors.push(`${m.id}: stale source`); continue;}
  if (!m.translation) {
    if (m.status === 'approved' || m.status === 'draft') errors.push(`${m.id}: translation missing`);
    continue;
  }
  translated++;
  try {if (signature(original.source) !== signature(m.translation)) errors.push(`${m.id}: ICU variable/tag mismatch`);}
  catch {errors.push(`${m.id}: invalid ICU message`);}
}
for (const id of originals.keys()) if (!seen.has(id)) errors.push(`${id}: missing entry`);
const result = {locale, total:source.messages.length, translated, errors, note:'Checks catalog structure and ICU variables. Does not prove translation quality, RTL layout, or app integration.'};
fs.writeFileSync(`${root}reports/check-${locale}.json`, JSON.stringify(result, null, 2) + '\n');
console.log(`${translated}/${source.messages.length} translated; ${errors.length} validation errors.`);
if (errors.length) {console.error(errors.slice(0,10).join('\n'));process.exitCode=1;}

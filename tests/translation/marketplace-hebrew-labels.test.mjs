import {describe,expect,test} from 'bun:test';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {openAsar} from '../../scripts/analysis/asar-archive.mjs';
import {findAndPatchMarketplaceHebrewLabels} from '../../scripts/rtl/marketplace-hebrew-labels.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),catalog=JSON.parse(fs.readFileSync(`${root}catalogs/marketplace-hebrew.json`,'utf8'));

describe('plugin marketplace metadata',()=>{
 test('classifies every current plugin field and gives every card a Hebrew name',()=>{
  expect(catalog.plugins).toBe(62);
  expect(catalog.connectedPlugins).toBeGreaterThan(3000);
  expect(catalog.entries.length).toBeGreaterThan(700);
  expect(catalog.entries.every(entry=>entry.translation.trim().length>0)).toBe(true);
  const names=catalog.entries.filter(entry=>entry.field==='displayName');
  expect(names.length).toBe(catalog.plugins+catalog.connectedPlugins);
  expect(names.every(entry=>entry.translation!==entry.source||/^[@$]/.test(entry.source)||!/[A-Za-z]/.test(entry.source))).toBe(true);
  expect(Object.fromEntries(names.map(entry=>[entry.source,entry.translation]))).toMatchObject({'Pocket AI':'פוקט איי־איי',Box:'בוקס',Lucid:'לוסיד',Krisp:'קריספ',Tally:'טאלי','Read AI':'ריד איי־איי','CVpop - Resume & CV Builder':'סי־וי־פופ – בונה קורות חיים'});
 });

 test.skipIf(process.platform!=='darwin')('writes marketplace names, descriptions and detail metadata into renderer bundles before startup',()=>{
  const replacementTokens='טקסט עם $& $1 $$';
  const archive=openAsar('/Applications/ChatGPT.app/Contents/Resources/app.asar'),changes=findAndPatchMarketplaceHebrewLabels(archive,{...catalog,entries:[...catalog.entries,{source:'Replacement tokens',translation:replacementTokens}]}),files=Object.keys(changes);
  expect(files.some(file=>file.includes('/app-primary-'))).toBe(true);
  expect(files.some(file=>file.includes('/plugin-detail-page-'))).toBe(true);
  expect(files.some(file=>file.includes('/plugins-page-'))).toBe(true);
  const source=Object.values(changes).join('\n');
  expect(source.includes(JSON.stringify(replacementTokens))).toBe(true);
  expect(source).toContain('hebrewMarketplaceLabel(e.display_name)');
  expect(source).toContain('e.display_name,e.short_description,hebrewMarketplaceLabel(e.short_description)');
  expect(source).toContain("replace(/[^\\p{L}\\p{N}]+/gu");
  expect(source).toContain('hebrewMarketplaceLabel(e.summary.interface?.longDescription');
  expect(source).toContain('F=hebrewMarketplaceLabel(Le(E))');
  expect(source).toContain('let t=hebrewMarketplaceLabel(Le(e));return');
  expect(source).toContain('map(e=>hebrewMarketplaceLabel(Le(e))).join');
  expect(source).toContain('children:hebrewMarketplaceLabel(E.description)');
  expect(source).toContain('"Shopify":"שופיפיי"');
  expect(source).toContain('"Default templates":"תבניות ברירת מחדל"');
  expect(source).toContain('"Discover and manage plugins":"גילוי וניהול תוספים"');
  expect(source).toContain('"Build and manage your store":"בניית החנות וניהולה"');
 });
});

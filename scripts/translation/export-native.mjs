import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {nativeLocaleMessages,readHebrewCatalog} from './hebrew-catalog.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const catalog=readHebrewCatalog();
const {translations,missing,ids:requiredIds,report}=nativeLocaleMessages(catalog);
fs.writeFileSync(`${root}reports/native-coverage.json`,JSON.stringify({archiveSha256:report.archiveSha256,total:requiredIds.length,translated:Object.keys(translations).length,missing,bundledLocaleIds:report.nativeMessageIds.length,mainProcessDescriptorIds:catalog.messages.filter(message=>message.descriptorKind==='messageId').length,note:'Native locale data is built directly from the canonical Hebrew catalog.'},null,2)+'\n');
console.log(`${Object.keys(translations).length}/${requiredIds.length} native messages exported.`);
if(missing.length)process.exitCode=1;

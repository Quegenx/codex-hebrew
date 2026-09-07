import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openAsar} from '../analysis/asar-archive.mjs';
import {findAndPatchModelPickerRTL} from '../rtl/model-picker-rtl.mjs';
import {findAndPatchPetSizeRTL} from '../rtl/pet-size-rtl.mjs';
import {findAndPatchImmediateHebrewLabels} from '../rtl/immediate-hebrew-labels.mjs';
import {findAndPatchMarketplaceHebrewLabels} from '../rtl/marketplace-hebrew-labels.mjs';
import {readHebrewCatalog,nativeLocaleMessages} from '../translation/hebrew-catalog.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function createNativeWrapperAssets({sourceAsar,catalog,loader=`${root}runtime/application-loader.cjs`}){
 const catalogData=catalog?fs.readFileSync(catalog):Buffer.from(JSON.stringify(nativeLocaleMessages().translations,null,2)+'\n');
 const archive=openAsar(sourceAsar),sourceSha256=archive.hash,catalogSha256=crypto.createHash('sha256').update(catalogData).digest('hex'),loaderSha256=digest(loader),implementationSha256=crypto.createHash('sha256').update(digest(fileURLToPath(import.meta.url))).update(digest(fileURLToPath(new URL('../analysis/asar-archive.mjs',import.meta.url)))).update(digest(fileURLToPath(new URL('../rtl/model-picker-rtl.mjs',import.meta.url)))).update(digest(fileURLToPath(new URL('../rtl/pet-size-rtl.mjs',import.meta.url)))).update(digest(fileURLToPath(new URL('../rtl/immediate-hebrew-labels.mjs',import.meta.url)))).update(digest(fileURLToPath(new URL('../rtl/marketplace-hebrew-labels.mjs',import.meta.url)))).update(digest(fileURLToPath(new URL('../../catalogs/marketplace-hebrew.json',import.meta.url)))).digest('hex');
 const {originalMain,changes}=assembleNativeWrapperChanges(archive,{canonical:readHebrewCatalog(),marketplace:JSON.parse(fs.readFileSync(`${root}catalogs/marketplace-hebrew.json`,'utf8')),catalogData,loaderSource:fs.readFileSync(loader,'utf8')});
 const wrapperSha256=crypto.createHash('sha256').update(catalogSha256).update(loaderSha256).update(implementationSha256).update(sourceSha256).digest('hex');
 return{sourceSha256,catalogSha256,loaderSha256,implementationSha256,wrapperSha256,originalMain,changes};
}

export function assembleNativeWrapperChanges(archive,{canonical,marketplace,catalogData,loaderSource}){
 const sourceSha256=archive.hash;
 const packageJson=JSON.parse(archive.read('package.json')),originalMain=packageJson.main;
 if(typeof originalMain!=='string'||!archive.files.includes(originalMain))throw Error('Installed package main is missing from the ASAR');
 if(originalMain==='codex-he-loader.cjs')throw Error('Source application is already patched');
 const originalRequire=originalMain.startsWith('./')||originalMain.startsWith('../')?originalMain:`./${originalMain}`;
 const patchedLoader=loaderSource.replace('__SOURCE_ARCHIVE_SHA256__',sourceSha256).replace('__ORIGINAL_MAIN__',originalRequire);
 packageJson.main='codex-he-loader.cjs';
 const modelPicker=findAndPatchModelPickerRTL(archive),petSize=findAndPatchPetSizeRTL(archive);
 const immediateLabels=findAndPatchImmediateHebrewLabels(archive,canonical);
 const marketplaceLabels=findAndPatchMarketplaceHebrewLabels(archive,marketplace,immediateLabels,canonical);
 const changes={'package.json':JSON.stringify(packageJson),'codex-he-loader.cjs':patchedLoader,'native-menu-locales/he.json':catalogData,...immediateLabels,...marketplaceLabels,[modelPicker.file]:modelPicker.source,[petSize.file]:petSize.source};
 return{originalMain,changes};
}

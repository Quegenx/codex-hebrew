import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolveApplicationTarget} from '../analysis/application-target.mjs';
import {openAsar,rewriteAsarFiles} from '../analysis/asar-archive.mjs';
import {readHebrewCatalog} from '../translation/hebrew-catalog.mjs';
import {createWindowsCatalog} from '../translation/windows-catalog.mjs';
import {buildRendererInjection} from './renderer-injection.mjs';
import {findAndPatchModelPickerRTL} from '../rtl/model-picker-rtl.mjs';
import {findAndPatchPetSizeRTL} from '../rtl/pet-size-rtl.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const supported=JSON.parse(fs.readFileSync(path.join(root,'config/windows-target.json'),'utf8'));
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
function run(command){
 const result=Bun.spawnSync(command,{cwd:root,stdout:'pipe',stderr:'pipe'});
 if(result.exitCode!==0)throw Error(result.stderr.toString()||result.stdout.toString());
 return result.stdout.toString();
}

export async function buildWindowsWrapper({executable,destination}){
 if(!executable||!destination)throw Error('Pass the installed ChatGPT.exe path and a new output directory.');
 if(process.platform!=='win32'||process.arch!==supported.arch)throw Error('This build requires Windows x64.');
 const target=resolveApplicationTarget({executable}),archive=openAsar(target.archive);
 if(archive.hash!==supported.archiveSha256)throw Error('Unsupported Windows application version. Source application was not changed.');
 const output=path.resolve(destination),sourceDirectory=path.dirname(target.executable);
 const outputKey=output.toLowerCase(),sourceKey=sourceDirectory.toLowerCase();
 if(outputKey.startsWith(sourceKey+path.sep)||sourceKey.startsWith(outputKey+path.sep)||outputKey===sourceKey)throw Error('Output must be separate from the source application.');
 if(fs.existsSync(output))throw Error('Choose a new empty output directory; existing installations are preserved.');
 const scanRoot=path.join(root,'.lab/windows-scan');
 console.log(run([process.execPath,path.join(root,'scripts/analysis/scan-messages.mjs'),target.archive,scanRoot]).trim());
 const source=JSON.parse(fs.readFileSync(path.join(scanRoot,'catalogs/source/en.json'),'utf8'));
 const scan=JSON.parse(fs.readFileSync(path.join(scanRoot,'reports/scan.json'),'utf8'));
 const canonical=readHebrewCatalog(),{catalog,coverage}=createWindowsCatalog(source,canonical);
 console.log(run([process.execPath,path.join(root,'scripts/build/build-adaptation.mjs'),target.archive]).trim());
 const adaptation=JSON.parse(fs.readFileSync(path.join(root,'.lab/adaptation.json'),'utf8'));
 if(!adaptation.direction)throw Error('Windows direction bridge was not verified.');
 const injection=await buildRendererInjection({root,archive:archive.hash,catalog});
 const renderer=injection+`\nnew Promise(resolve=>{let attempts=0;const timer=setInterval(()=>{const status=window.chatgptHebrew?.status();if((status?.status==='attached'&&status.direction?.state==='attached')||++attempts===400){clearInterval(timer);document.getElementById('chatgpt-hebrew-boot')?.remove();resolve({url:location.href,lang:document.documentElement.lang,dir:document.documentElement.dir,status});}},50);})`;
 const metadata=JSON.parse(archive.read('package.json')),originalMain=metadata.main;
 if(typeof originalMain!=='string'||!archive.files.includes(originalMain))throw Error('Missing application bootstrap.');
 const loader=fs.readFileSync(path.join(root,'runtime/application-loader.cjs'),'utf8').replace('__SOURCE_ARCHIVE_SHA256__',archive.hash).replace('__ORIGINAL_MAIN__','./'+originalMain.replace(/^\.\//,''));
 metadata.main='codex-he-loader.cjs';
 const translations=new Map(catalog.messages.map(message=>[message.id,message.translation]));
 const aliases={'electron.appMenu.file.newWindow':'codex.commandMenuTitle.newWindow'};
 const nativeLocale=Object.fromEntries(scan.nativeMessageIds.flatMap(id=>{const value=translations.get('@messageId:'+id)||translations.get(id)||translations.get(aliases[id]);return value?[[id,value]]:[];}));
 const modelPicker=findAndPatchModelPickerRTL(archive),petSize=findAndPatchPetSizeRTL(archive);
 const html=archive.read('webview/index.html');
 if(!html.includes('<html lang="en"')||!html.includes('<head>'))throw Error('Windows HTML bootstrap changed.');
 const changes={'package.json':JSON.stringify(metadata),'codex-he-loader.cjs':loader,'native-menu-locales/he.json':JSON.stringify(nativeLocale),[modelPicker.file]:modelPicker.source,[petSize.file]:petSize.source,'webview/index.html':html.replace('<html lang="en"','<html lang="he" dir="rtl"').replace('<head>','<head><style id="chatgpt-hebrew-boot">html{visibility:hidden}</style>')};
 fs.mkdirSync(output,{recursive:true});
 console.log('Copying the installed application to the isolated output...');
 // MSIX directories reject Bun's directory enumeration on this Windows build.
 const copied=Bun.spawnSync(['robocopy.exe',sourceDirectory,path.join(output,'app'),'/E','/COPY:DAT','/DCOPY:DAT','/R:0','/W:0','/XJ','/NFL','/NDL','/NJH','/NJS'],{stdout:'pipe',stderr:'pipe'});
 if(copied.exitCode>=8)throw Error(`Application copy failed (${copied.exitCode}): ${copied.stdout.toString()} ${copied.stderr.toString()}`);
 if(openAsar(target.archive).hash!==archive.hash)throw Error('Application updated during the build; discard this incomplete output.');
 const built=rewriteAsarFiles(target.archive,path.join(output,'app/resources/app.asar'),changes);
 const runtimeRoot=path.join(output,'app/resources/hebrew-runtime');fs.mkdirSync(runtimeRoot,{recursive:true});
 const iconFile=path.join(root,'assets/icons/codex-hebrew.ico');
 const files={'main.cjs':fs.readFileSync(path.join(root,'runtime/electron-main.cjs')),'app.ico':fs.readFileSync(iconFile),'renderer.js':Buffer.from(renderer),'native-chrome-hook.cjs':fs.readFileSync(path.join(root,'runtime/native-chrome-hook.cjs')),'native-chrome-he.json':Buffer.from(JSON.stringify({archiveSha256:archive.hash,entries:canonical.native,dynamicEntries:canonical.nativeDynamic}))};
 const runtimeSha256=digest(Buffer.concat(Object.entries(files).sort().flatMap(([name,data])=>[Buffer.from(name),data])));
 for(const [name,data]of Object.entries(files))fs.writeFileSync(path.join(runtimeRoot,name),data);
 fs.writeFileSync(path.join(runtimeRoot,'manifest.json'),JSON.stringify({schemaVersion:2,sourceArchiveSha256:archive.hash,runtimeSha256,files:Object.keys(files).sort()},null,2));
 const compiler=path.join(process.env.WINDIR,'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
 console.log(run([compiler,'/nologo','/target:winexe','/reference:System.Windows.Forms.dll','/reference:System.Web.Extensions.dll','/win32icon:'+iconFile,'/out:'+path.join(output,'Codex Hebrew.exe'),path.join(root,'scripts/launch/windows-launcher.cs')]).trim());
 for(const name of ['LICENSE','NOTICE.md'])fs.copyFileSync(path.join(root,name),path.join(output,name));
 fs.copyFileSync(path.join(root,'scripts/launch/repair-windows-shortcuts.ps1'),path.join(output,'repair-windows-shortcuts.ps1'));
 fs.copyFileSync(path.join(root,'docs/WINDOWS.md'),path.join(output,'WINDOWS.md'));
 fs.copyFileSync(path.join(root,'assets/fonts/OFL.txt'),path.join(output,'Heebo-LICENSE.txt'));
 const report={platform:'win32',version:supported.version,packageVersion:supported.packageVersion,sourceArchiveSha256:archive.hash,outputArchiveSha256:built.archiveSha256,runtimeSha256,translatedMessages:coverage.reusedMessages,sourceMessages:coverage.sourceMessages,nativeMessages:Object.keys(nativeLocale).length,unresolvedDescriptors:scan.unresolvedDescriptors,changedAssets:built.changedAssets,limitations:['New or changed messages without a matching committed translation remain in English.','macOS-specific hardcoded and marketplace patches are not applied.','Signed-in workflows have not been verified.']};
 fs.writeFileSync(path.join(output,'build-report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(root,'reports/windows-missing-translations.json'),JSON.stringify(coverage.missing,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 return report;
}
if(import.meta.main)await buildWindowsWrapper({executable:process.argv[2],destination:process.argv[3]});

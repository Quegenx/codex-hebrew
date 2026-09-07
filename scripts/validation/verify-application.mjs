import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildCoverage} from './translation-coverage.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const archive=process.argv[2]||'/Applications/ChatGPT.app/Contents/Resources/app.asar';
const commands=[
 ['project-structure',[process.execPath,`${root}scripts/validation/check-project-structure.mjs`]],
 ['target-status',[process.execPath,`${root}scripts/validation/target-status.mjs`]],
 ['catalog-structure',[process.execPath,`${root}scripts/validation/check-catalog.mjs`]],
 ['translation-audit',[process.execPath,`${root}scripts/validation/audit-translations.mjs`]],
 ['hardcoded-discovery',[process.execPath,`${root}scripts/analysis/scan-ui-literals.mjs`,archive]],
 ['native-ui-discovery',[process.execPath,`${root}scripts/analysis/scan-native-ui.mjs`,archive]],
 ['metadata-inventory',[process.execPath,`${root}scripts/analysis/scan-metadata.mjs`,path.dirname(archive)]],
 ['native-catalog',[process.execPath,`${root}scripts/translation/export-native.mjs`]],
 ['rtl-candidate-inventory',[process.execPath,`${root}scripts/validation/audit-rtl.mjs`,archive]],
 ['adaptation-contract',[process.execPath,`${root}scripts/build/build-adaptation.mjs`,archive]],
 ['update-comparison',[process.execPath,`${root}scripts/validation/update-comparison.mjs`,archive]],
 ['agent-language',[process.execPath,`${root}scripts/validation/check-agent-language.mjs`,archive]],
 ['macos-visual',[process.execPath,`${root}scripts/validation/check-visual.mjs`,archive]],
 ['unit-tests',[process.execPath,'test']],
];
const checks={};const results=[];
for(const [name,command] of commands){
 const run=Bun.spawnSync(command,{cwd:root,stdout:'pipe',stderr:'pipe'});
 const passed=run.exitCode===0;checks[name]=passed;
 results.push({name,passed,exitCode:run.exitCode,stdout:run.stdout.toString().trim(),stderr:run.stderr.toString().trim()});
 console.log(`${passed?'PASS':'FAIL'} ${name}${results.at(-1).stdout?`: ${results.at(-1).stdout.split('\n').at(-1)}`:''}`);
}
const build=await Bun.build({entrypoints:[`${root}ui/electron-entry.js`],target:'browser',format:'iife',minify:true,define:{'process.env.NODE_ENV':'"production"'}});
checks['renderer-build']=build.success;results.push({name:'renderer-build',passed:build.success,logs:build.logs.map(String)});console.log(`${build.success?'PASS':'FAIL'} renderer-build`);
const coverage=buildCoverage({root,archive,checks});
fs.writeFileSync(`${root}reports/coverage.json`,JSON.stringify(coverage,null,2)+'\n');
const report={schemaVersion:1,generatedAt:new Date().toISOString(),archiveSha256:coverage.target.archiveSha256,adaptationSha256:coverage.target.adaptationSha256,checks,results,coverage:coverage.summary};
fs.writeFileSync(`${root}reports/verification.json`,JSON.stringify(report,null,2)+'\n');
for(const item of coverage.categories)console.log(`${item.complete?'PASS':'FAIL'} coverage:${item.id}`);
console.log(JSON.stringify(coverage.summary));
if(!coverage.summary.complete||Object.values(checks).some(value=>!value))process.exitCode=1;

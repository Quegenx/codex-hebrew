import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const archive=path.resolve(process.argv[2]||'/Applications/ChatGPT.app/Contents/Resources/app.asar');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'ebrew-fresh-checkout-'));
const checkout=path.join(temporary,'source'),runtimeRoot=path.join(temporary,'application','runtime');
function run(command,cwd=checkout){
 const result=Bun.spawnSync(command,{cwd,stdout:'pipe',stderr:'pipe'});
 assert.equal(result.exitCode,0,`Fresh checkout command failed: ${command.join(' ')}\n${result.stderr.toString()}`);
 return result.stdout.toString();
}
try{
 fs.mkdirSync(checkout);
 // Copy only tracked paths, using current working files so pending fixes are tested.
 const files=run(['git','ls-files','-z'],root).split('\0').filter(Boolean);
 for(const file of files){
  const destination=path.join(checkout,file);
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(root,file),destination);
 }
 for(const file of ['.env','.lab','node_modules','reports/scan.json','catalogs/source/en.json'])assert.equal(fs.existsSync(path.join(checkout,file)),false,`Local artifact tracked: ${file}`);
 const packageJson=JSON.parse(fs.readFileSync(path.join(checkout,'package.json'),'utf8'));
 assert.equal(packageJson.scripts.install,undefined,'App installation must not be a dependency-install lifecycle hook');
 run([process.execPath,'install','--frozen-lockfile']);
 const manifest=JSON.parse(run([process.execPath,'scripts/build/build-runtime.mjs',archive,runtimeRoot]));
 assert.equal(manifest.runtimeRoot,runtimeRoot);
 for(const file of manifest.files)assert.ok(fs.statSync(path.join(runtimeRoot,file)).size>0);
 const scan=JSON.parse(fs.readFileSync(path.join(checkout,'reports/scan.json'),'utf8'));
 assert.equal(scan.archiveSha256,manifest.sourceArchiveSha256);
 const native=JSON.parse(run([process.execPath,'-e',"import {nativeLocaleMessages} from './scripts/translation/hebrew-catalog.mjs';const {missing,translations}=nativeLocaleMessages();console.log(JSON.stringify({missing,count:Object.keys(translations).length}));"]));
 assert.deepEqual(native.missing,[]);assert.ok(native.count>0);
 console.log(`Fresh checkout passed: dependencies installed, runtime built, ${native.count} native messages resolved; no application installed or launched.`);
}finally{fs.rmSync(temporary,{recursive:true,force:true});}

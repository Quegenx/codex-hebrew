import {test,expect} from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {commitInstallation} from '../../scripts/installation/installation-transaction.mjs';

function withInstallationFixture(check){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'chatgpt-install-transaction-'));
 const files=Object.fromEntries(['app','runtime','stagedApp','stagedRuntime','profile'].map(name=>[name,path.join(root,name)]));
 for(const [name,file]of Object.entries(files))fs.writeFileSync(file,name);
 const replacements=[{staged:files.stagedApp,destination:files.app},{staged:files.stagedRuntime,destination:files.runtime}];
 try{check(files,replacements);}finally{fs.rmSync(root,{recursive:true,force:true});}
}

test('installer replaces the application and runtime while preserving the profile',()=>withInstallationFixture((files,replacements)=>{
 commitInstallation(replacements);
 expect(fs.readFileSync(files.app,'utf8')).toBe('stagedApp');
 expect(fs.readFileSync(files.runtime,'utf8')).toBe('stagedRuntime');
 expect(fs.readFileSync(files.profile,'utf8')).toBe('profile');
 expect(fs.existsSync(`${files.app}.previous-${process.pid}`)).toBeFalse();
}));

test('installer restores both previous versions when installed verification fails',()=>withInstallationFixture((files,replacements)=>{
 expect(()=>commitInstallation(replacements,()=>{throw Error('signature rejected');})).toThrow('signature rejected');
 expect(fs.readFileSync(files.app,'utf8')).toBe('app');
 expect(fs.readFileSync(files.runtime,'utf8')).toBe('runtime');
 expect(fs.readFileSync(files.profile,'utf8')).toBe('profile');
}));

test('installer restores the application when moving the runtime fails',()=>withInstallationFixture((files,replacements)=>{
 fs.rmSync(files.stagedRuntime);
 expect(()=>commitInstallation(replacements)).toThrow();
 expect(fs.readFileSync(files.app,'utf8')).toBe('app');
 expect(fs.readFileSync(files.runtime,'utf8')).toBe('runtime');
}));

test('installer preserves a backup left by an interrupted installation',()=>withInstallationFixture((files,replacements)=>{
 const backup=`${files.app}.previous-${process.pid}`;fs.writeFileSync(backup,'recoverable');
 expect(()=>commitInstallation(replacements)).toThrow('Installer recovery required');
 expect(fs.readFileSync(backup,'utf8')).toBe('recoverable');
 expect(fs.readFileSync(files.app,'utf8')).toBe('app');
}));

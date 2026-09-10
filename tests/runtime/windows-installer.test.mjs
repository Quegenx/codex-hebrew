import {test,expect} from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

test.skipIf(process.platform!=='win32')('Windows installer preserves profiles and restores failed updates',()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url)),parent=fs.mkdtempSync(path.join(os.tmpdir(),'codex-hebrew-installer-check-'));
 try{
  const executable=path.join(parent,'check.exe'),compiler=path.join(process.env.WINDIR,'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
  const sources=['windows-installer.cs','windows-uninstaller.cs','windows-install-paths.cs','windows-install-integration.cs','windows-delta.cs','windows-asar-patch.cs'].map(name=>path.join(root,'scripts/installation',name));
  const references=['System.Windows.Forms.dll','System.Web.Extensions.dll','System.IO.Compression.dll','System.IO.Compression.FileSystem.dll','Microsoft.CSharp.dll'].map(name=>'/reference:'+name);
  const built=Bun.spawnSync([compiler,'/nologo','/platform:x64','/target:exe','/main:WindowsInstallerChecks','/out:'+executable,...references,...sources,path.join(root,'tests/launch/windows-installer-check.cs')],{stdout:'pipe',stderr:'pipe'});
  expect(built.stdout.toString()+built.stderr.toString()).toBe('');expect(built.exitCode).toBe(0);
  const checked=Bun.spawnSync([executable,path.join(parent,'fixture')],{stdout:'pipe',stderr:'pipe'});
  expect(checked.stderr.toString()).toBe('');expect(checked.exitCode).toBe(0);expect(checked.stdout.toString()).toContain('Windows installer checks passed');
 }finally{if(!fs.realpathSync(parent).toLowerCase().startsWith(fs.realpathSync(os.tmpdir()).toLowerCase()+path.sep))throw Error('Unexpected test cleanup path');fs.rmSync(parent,{recursive:true,force:true});}
});

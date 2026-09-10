import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildWindowsWrapper} from './build-windows-wrapper.mjs';
import {buildWindowsAsarDelta} from './windows-asar-delta.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function run(command){const result=Bun.spawnSync(command,{cwd:root,stdout:'pipe',stderr:'pipe'});if(result.exitCode!==0)throw Error(result.stdout.toString()+result.stderr.toString());return result.stdout.toString();}
export async function buildWindowsInstaller({executable,destination}){
 if(process.platform!=='win32'||process.arch!=='x64')throw Error('Build the Windows installer on Windows x64.');
 if(!executable||!destination)throw Error('Pass the installed ChatGPT.exe and a new Setup.exe output path.');
 executable=path.resolve(executable);destination=path.resolve(destination);
 if(fs.existsSync(destination))throw Error('Choose a new installer output path.');
 const workParent=path.join(root,'.lab/windows-installer');fs.mkdirSync(workParent,{recursive:true});
 const work=fs.mkdtempSync(path.join(workParent,'build-'));
 const wrapper=path.join(work,'wrapper');
 try{
  const report=await buildWindowsWrapper({executable,destination:wrapper});
  const compiler=path.join(process.env.WINDIR,'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
  const install=name=>path.join(root,'scripts/installation',name);
  const icon=path.join(root,'assets/icons/codex-hebrew.ico');
  const references=['System.Windows.Forms.dll','System.Drawing.dll','System.Web.Extensions.dll','System.IO.Compression.dll','System.IO.Compression.FileSystem.dll','Microsoft.CSharp.dll'].map(name=>'/reference:'+name);
  const compile=(output,main,files,extra=[])=>run([compiler,'/nologo','/platform:x64','/target:winexe','/main:'+main,'/out:'+output,'/win32icon:'+icon,'/win32manifest:'+install('windows-installer.manifest'),...references,...extra,...files.map(install)]);
  const deltaTool=path.join(work,'delta.exe');compile(deltaTool,'WindowsDeltaTool',['windows-delta.cs','windows-asar-patch.cs']);
  console.log('Creating a Windows delta from the matching local ASAR...');
  const delta=path.join(work,'app.asar.delta'),original=path.join(path.dirname(executable),'resources/app.asar'),modified=path.join(wrapper,'app/resources/app.asar');
  const deltaLayout=buildWindowsAsarDelta({source:original,target:modified,output:delta,work,deltaTool});
  const applier=path.join(work,'apply.exe');compile(applier,'WindowsAsarDeltaTool',['windows-delta.cs','windows-asar-patch.cs']);
  const proof=path.join(work,'verified.asar');run([applier,original,delta,proof]);
  if(digest(fs.readFileSync(proof))!==report.outputArchiveSha256)throw Error('Installer delta roundtrip mismatch');
  const uninstaller=path.join(wrapper,'Uninstall.exe');compile(uninstaller,'WindowsUninstaller',['windows-uninstaller.cs','windows-install-paths.cs','windows-install-integration.cs']);
  const manifest=JSON.parse(fs.readFileSync(path.join(wrapper,'app/resources/hebrew-runtime/manifest.json'),'utf8'));
  fs.copyFileSync(path.join(root,'docs/WINDOWS_INSTALLER.md'),path.join(wrapper,'WINDOWS_INSTALLER.md'));
  const names=['Codex Hebrew.exe','Uninstall.exe','LICENSE','NOTICE.md','Heebo-LICENSE.txt','WINDOWS.md','WINDOWS_INSTALLER.md','repair-windows-shortcuts.ps1',...['manifest.json',...manifest.files].map(name=>'app/resources/hebrew-runtime/'+name)];
  const files=Object.fromEntries(names.map(name=>[name,digest(fs.readFileSync(path.join(wrapper,name)))]));
  const payload={product:'codex-hebrew-windows',packageVersion:report.packageVersion,sourceArchiveSha256:report.sourceArchiveSha256,outputArchiveSha256:report.outputArchiveSha256,runtimeSha256:report.runtimeSha256,deltaSha256:digest(fs.readFileSync(delta)),files};
  const payloadRoot=path.join(work,'payload');fs.mkdirSync(payloadRoot);
  fs.writeFileSync(path.join(payloadRoot,'installer.json'),JSON.stringify(payload));fs.copyFileSync(delta,path.join(payloadRoot,'app.asar.delta'));
  for(const name of names){const target=path.join(payloadRoot,'files',name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(wrapper,name),target);}
  const zipper=path.join(work,'zip.ps1'),zip=path.join(work,'payload.zip');
  // Windows PowerShell's legacy CreateFromDirectory writes backslashes in ZIP names.
  fs.writeFileSync(zipper,['param([string]$Source,[string]$Destination)',"$ErrorActionPreference='Stop'",'Add-Type -AssemblyName System.IO.Compression,System.IO.Compression.FileSystem',
   '$archive=[IO.Compression.ZipFile]::Open($Destination,[IO.Compression.ZipArchiveMode]::Create)',
   'try { foreach($file in Get-ChildItem -LiteralPath $Source -Recurse -File) {',
   '$entry=$file.FullName.Substring($Source.Length+1).Replace([char]92,[char]47)',
   '[void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file.FullName,$entry,[IO.Compression.CompressionLevel]::Optimal)',
   '} } finally { $archive.Dispose() }',''].join('\n'));
  run([path.join(process.env.WINDIR,'System32/WindowsPowerShell/v1.0/powershell.exe'),'-NoProfile','-NonInteractive','-File',zipper,payloadRoot,zip]);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  const stage=path.join(work,'Setup.exe');compile(stage,'WindowsSetupProgram',['windows-installer-ui.cs','windows-installer.cs','windows-install-paths.cs','windows-install-integration.cs','windows-delta.cs','windows-asar-patch.cs'],['/resource:'+zip+',payload.zip']);
  fs.copyFileSync(stage,destination);
  const result={...payload,installer:path.basename(destination),installerSha256:digest(fs.readFileSync(destination)),installerBytes:fs.statSync(destination).size,deltaBytes:fs.statSync(delta).size,deltaLayout,signed:false};
  fs.writeFileSync(destination+'.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));return result;
 }finally{
  // This freshly generated staging tree contains no profiles or conversation data.
  const parent=fs.realpathSync(workParent);if(!fs.realpathSync(work).toLowerCase().startsWith(parent.toLowerCase()+path.sep))throw Error('Unexpected installer build cleanup path');
  fs.rmSync(work,{recursive:true,force:true});
 }
}
if(import.meta.main)await buildWindowsInstaller({executable:process.argv[2],destination:process.argv[3]});

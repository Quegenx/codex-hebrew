import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildMacOSWrapper} from '../build/build-macos-wrapper.mjs';
import {buildRuntime} from '../build/build-runtime.mjs';
import {resolveApplicationTarget} from '../analysis/application-target.mjs';
import {openAsar} from '../analysis/asar-archive.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
if(process.platform!=='darwin')throw Error(`Codex Hebrew supports macOS only, not ${process.platform}.`);
const target=resolveApplicationTarget({executable:process.argv[2]});
const scan=JSON.parse(fs.readFileSync(`${root}reports/scan.json`,'utf8'));
const archiveHash=openAsar(target.archive).hash;
if(scan.archiveSha256!==archiveHash)throw Error(`Installed target ${archiveHash} has not passed this workspace's scan and translation contracts.`);
const nativeBuild=Bun.spawn([process.execPath,`${root}scripts/translation/export-native.mjs`],{cwd:root,stdout:'ignore',stderr:'inherit'});
if(await nativeBuild.exited!==0)throw Error('Native catalog build failed');
fs.mkdirSync(`${root}.lab`,{recursive:true,mode:0o700});
const directory=fs.mkdtempSync(`${root}.lab/run-`);fs.chmodSync(directory,0o700);
const env={...process.env,CODEX_ELECTRON_USER_DATA_PATH:path.join(directory,'profile'),CODEX_HOME:path.join(directory,'codex-home')};
delete env.OPENAI_API_KEY;
fs.mkdirSync(env.CODEX_HOME,{recursive:true,mode:0o700});
const agentLanguage=JSON.parse(fs.readFileSync(`${root}config/agent-language.json`,'utf8'));
fs.writeFileSync(path.join(env.CODEX_HOME,'config.toml'),`developer_instructions = ${JSON.stringify(agentLanguage.developerInstructions)}\n\n[desktop]\nlocaleOverride = "he"\n`,{mode:0o600});
const runtime=await buildRuntime({archive:target.archive});
const launchedExecutable=buildMacOSWrapper({executable:target.executable,runtime}).applicationExecutable;
const log=fs.openSync(path.join(directory,'app.log'),'a',0o600);
const app=Bun.spawn([launchedExecutable,`--user-data-dir=${env.CODEX_ELECTRON_USER_DATA_PATH}`,'--lang=he'],{env,stdout:log,stderr:log});
let closing=false;
async function close(){
  if(closing)return;closing=true;
  if(app.exitCode===null)app.kill('SIGTERM');
  fs.closeSync(log);
}
process.on('SIGINT',()=>{void close().then(()=>process.exit(0));});
process.on('SIGTERM',()=>{void close().then(()=>process.exit(0));});
try {
  await Bun.sleep(1500);if(app.exitCode!==null)throw new Error('Hebrew application exited during startup.');
  console.log('Opened the Hebrew application in a fresh lab profile. Your regular profile is not used.');
  await app.exited;
}catch(e){console.error(e.message);process.exitCode=1;}finally{await close();}

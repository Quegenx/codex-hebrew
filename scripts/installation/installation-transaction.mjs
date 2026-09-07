import fs from 'node:fs';
import path from 'node:path';

// Staging and backups stay beside each destination so rename stays on one volume.
export function commitInstallation(replacements,verify=()=>{}){
 const committed=[];
 try{
  for(const {staged,destination}of replacements){
   const backup=`${destination}.previous-${process.pid}`;
   if(fs.existsSync(backup))throw Error(`Installer recovery required: ${backup}`);
   const state={destination,backup,hadPrevious:fs.existsSync(destination),installed:false};
   committed.push(state);
   if(state.hadPrevious)fs.renameSync(destination,backup);
   fs.renameSync(staged,destination);state.installed=true;
  }
  verify();
 }catch(error){
  for(const state of committed.reverse()){
   if(state.installed)fs.rmSync(state.destination,{recursive:true,force:true});
   if(fs.existsSync(state.backup))fs.renameSync(state.backup,state.destination);
  }
  throw error;
 }
 // Backup cleanup must not turn a committed installation into a reported failure.
 for(const state of committed)try{fs.rmSync(state.backup,{recursive:true,force:true});}catch(error){console.warn(`Installer backup retained at ${state.backup}: ${error.message}`);}
}

export function createInstallationStage(destination){
 fs.mkdirSync(path.dirname(destination),{recursive:true,mode:0o700});
 return fs.mkdtempSync(path.join(path.dirname(destination),'.chatgpt-hebrew-install-'));
}

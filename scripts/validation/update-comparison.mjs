import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function compareUpdateCatalogs(baseline,candidate){
 const old=new Map(baseline.messages.map(message=>[message.id,message]));
 const added=[],changed=[],unchanged=[];
 for(const message of candidate.messages){
  const prior=old.get(message.id);old.delete(message.id);
  if(!prior)added.push(message.id);
  else if(prior.sourceHash!==message.sourceHash)changed.push({id:message.id,before:prior.sourceHash,after:message.sourceHash});
  else unchanged.push(message.id);
 }
 return {added,changed,removed:[...old.keys()].sort(),unchanged};
}

if(import.meta.main){
 const root=fileURLToPath(new URL('../../',import.meta.url));
 const archive=path.resolve(process.argv[2]||'/Applications/ChatGPT.app/Contents/Resources/app.asar');
 const baseline=JSON.parse(fs.readFileSync(`${root}catalogs/source/en.json`,'utf8'));
 fs.mkdirSync(`${root}.lab`,{recursive:true,mode:0o700});
 const temporary=fs.mkdtempSync(`${root}.lab/update-scan-`);
 let report;
 try{
  const scan=Bun.spawnSync([process.execPath,`${root}scripts/analysis/scan-messages.mjs`,archive,temporary],{cwd:root,stdout:'pipe',stderr:'pipe'});
  if(scan.exitCode!==0)throw Error(`Candidate scan failed: ${scan.stderr.toString().trim()||scan.stdout.toString().trim()}`);
  const candidate=JSON.parse(fs.readFileSync(`${temporary}/catalogs/source/en.json`,'utf8'));
  const scanReport=JSON.parse(fs.readFileSync(`${temporary}/reports/scan.json`,'utf8'));
  const comparison=compareUpdateCatalogs(baseline,candidate);
  const compatible=!comparison.added.length&&!comparison.changed.length&&!comparison.removed.length&&!scanReport.parseErrors.length&&scanReport.unresolvedUnclassified===0&&scanReport.unresolvedClassificationStatus==='matched'&&!scanReport.staleUnresolvedClassifications.length&&scanReport.supplementalStatus==='matched';
  report={generatedAt:new Date().toISOString(),archive,baselineSha256:baseline.archiveSha256,candidateSha256:candidate.archiveSha256,compatible,comparison:{added:comparison.added,changed:comparison.changed,removed:comparison.removed,unchanged:comparison.unchanged.length},contracts:{parseErrors:scanReport.parseErrors,unresolvedDescriptors:scanReport.unresolvedDescriptors,unresolvedUnclassified:scanReport.unresolvedUnclassified,unresolvedClassificationStatus:scanReport.unresolvedClassificationStatus,staleUnresolvedClassifications:scanReport.staleUnresolvedClassifications,supplementalStatus:scanReport.supplementalStatus,nativeMessageIds:scanReport.nativeMessageIds.length},note:'Compatibility covers the message schema for the candidate ASAR. Renderer direction and native contracts are checked separately.'};
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
 fs.writeFileSync(`${root}reports/update-comparison.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({compatible:report.compatible,baselineSha256:report.baselineSha256,candidateSha256:report.candidateSha256,added:report.comparison.added.length,changed:report.comparison.changed.length,removed:report.comparison.removed.length,unresolvedDescriptors:report.contracts.unresolvedDescriptors}));
 if(!report.compatible)process.exitCode=1;
}

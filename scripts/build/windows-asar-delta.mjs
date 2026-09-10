import fs from 'node:fs';
import path from 'node:path';

function indexArchive(bytes){
 const base=8+bytes.readUInt32LE(4),header=JSON.parse(bytes.subarray(16,16+bytes.readUInt32LE(12))),files=new Map();
 function walk(entries,parent=''){for(const [name,entry]of Object.entries(entries)){const file=parent?parent+'/'+name:name;if(entry.files)walk(entry.files,file);else if(!entry.unpacked&&!entry.link)files.set(file,{offset:base+Number(entry.offset),length:entry.size});}}
 walk(header.files);return{base,files};
}
export function buildWindowsAsarDelta({source,target,output,work,deltaTool}){
 const original=fs.readFileSync(source),modified=fs.readFileSync(target),before=indexArchive(original),after=indexArchive(modified),operations=[];
 function add(offset,length,bytes){
  const prior=operations.at(-1);
  if(bytes.equals(original.subarray(offset,offset+length))){if(prior?.type===0&&prior.offset+prior.length===offset){prior.length+=length;prior.targetLength+=length;}else operations.push({type:0,offset,length,targetLength:length,delta:Buffer.alloc(0)});return;}
  const inputFile=path.join(work,'chunk-source'),targetFile=path.join(work,'chunk-target'),deltaFile=path.join(work,'chunk-delta');
  fs.writeFileSync(inputFile,original.subarray(offset,offset+length));fs.writeFileSync(targetFile,bytes);
  const result=Bun.spawnSync([deltaTool,'create',inputFile,targetFile,deltaFile],{stdout:'pipe',stderr:'pipe'});
  if(result.exitCode!==0)throw Error('ASAR chunk compression failed: '+result.stdout.toString()+result.stderr.toString());
  operations.push({type:1,offset,length,targetLength:bytes.length,delta:fs.readFileSync(deltaFile)});
 }
 add(0,before.base,modified.subarray(0,after.base));
 let cursor=after.base;
 for(const [name,entry]of [...after.files].sort((a,b)=>a[1].offset-b[1].offset)){
  if(entry.offset!==cursor)throw Error('Rebuilt ASAR has non-contiguous payloads');
  const old=before.files.get(name);add(old?.offset??0,old?.length??0,modified.subarray(entry.offset,entry.offset+entry.length));cursor+=entry.length;
 }
 if(cursor!==modified.length)throw Error('Rebuilt ASAR has trailing data');
 const header=Buffer.alloc(12);header.write('CHD1');header.writeInt32LE(modified.length,4);header.writeInt32LE(operations.length,8);
 const chunks=[header];for(const op of operations){const row=Buffer.alloc(21);row.writeUInt8(op.type);row.writeBigInt64LE(BigInt(op.offset),1);row.writeInt32LE(op.length,9);row.writeInt32LE(op.targetLength,13);row.writeInt32LE(op.delta.length,17);chunks.push(row,op.delta);}
 fs.writeFileSync(output,Buffer.concat(chunks));return{operations:operations.length,compressedChunks:operations.filter(op=>op.type===1).length};
}

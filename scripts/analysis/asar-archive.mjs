import fs from 'node:fs';
import crypto from 'node:crypto';
export function openAsar(archive='/Applications/ChatGPT.app/Contents/Resources/app.asar') {
 const bytes=fs.readFileSync(archive),base=8+bytes.readUInt32LE(4);
 const header=JSON.parse(bytes.subarray(16,16+bytes.readUInt32LE(12)));
 const files=new Map();
 function walk(entries,parent=''){for(const [name,e]of Object.entries(entries)){const p=parent?`${parent}/${name}`:name;if(e.files)walk(e.files,p);else if(!e.unpacked&&!e.link)files.set(p,e);}}
 walk(header.files);
 return {hash:crypto.createHash('sha256').update(bytes).digest('hex'),files:[...files.keys()],readBuffer(name){const e=files.get(name);if(!e)throw Error(`Missing asset: ${name}`);return bytes.subarray(base+Number(e.offset),base+Number(e.offset)+e.size);},read(name){return this.readBuffer(name).toString();}};
}

const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const align4=value=>(value+3)&~3;
const integrity=data=>{const blockSize=4194304,blocks=[];for(let offset=0;offset<data.length;offset+=blockSize)blocks.push(digest(data.subarray(offset,offset+blockSize)));return{algorithm:'SHA256',hash:digest(data),blockSize,blocks};};

export function rewriteAsarFiles(source,destination,changes){
 const bytes=fs.readFileSync(source),oldBase=8+bytes.readUInt32LE(4),header=JSON.parse(bytes.subarray(16,16+bytes.readUInt32LE(12))),entries=[];
 function walk(files,parent=''){for(const [name,entry] of Object.entries(files)){const asset=parent?`${parent}/${name}`:name;if(entry.files)walk(entry.files,asset);else if(!entry.unpacked&&!entry.link)entries.push({asset,entry});}}
 walk(header.files);
 const pending=new Map(Object.entries(changes).map(([asset,data])=>[asset,Buffer.isBuffer(data)?data:Buffer.from(data)]));
 for(const item of entries){item.data=pending.get(item.asset)??bytes.subarray(oldBase+Number(item.entry.offset),oldBase+Number(item.entry.offset)+item.entry.size);pending.delete(item.asset);}
 for(const [asset,data] of pending){
  const parts=asset.split('/');let files=header.files;
  for(const part of parts.slice(0,-1)){files[part]??={files:{}};if(!files[part].files)throw Error(`ASAR path is not a directory: ${part}`);files=files[part].files;}
  if(files[parts.at(-1)])throw Error(`ASAR asset already exists but was not packed: ${asset}`);
  const entry={size:0,offset:'0'};files[parts.at(-1)]=entry;entries.push({asset,entry,data});
 }
 entries.sort((left,right)=>Number(left.entry.offset)-Number(right.entry.offset));
 let dataSize=0;
 for(const item of entries){item.entry.size=item.data.length;item.entry.offset=String(dataSize);item.entry.integrity=integrity(item.data);dataSize+=item.data.length;}
 const json=Buffer.from(JSON.stringify(header)),stringSize=align4(4+json.length),headerSize=4+stringSize,base=8+headerSize,output=Buffer.alloc(base+dataSize);
 output.writeUInt32LE(4,0);output.writeUInt32LE(headerSize,4);output.writeUInt32LE(stringSize,8);output.writeUInt32LE(json.length,12);json.copy(output,16);
 let offset=base;for(const item of entries){item.data.copy(output,offset);offset+=item.data.length;}
 fs.writeFileSync(destination,output);
 return {archiveSha256:digest(output),headerSha256:digest(json),changedAssets:Object.keys(changes).sort()};
}

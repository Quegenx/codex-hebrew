import fs from 'node:fs';

// Keep fixture encoding independent of the production ASAR writer under test.
export function writeAsarFixture(file,assets){
 const files={},data=[];let offset=0;
 for(const [name,content]of Object.entries(assets)){
  const bytes=Buffer.from(content),parts=name.split('/');let entries=files;
  for(const part of parts.slice(0,-1)){entries[part]??={files:{}};entries=entries[part].files;}
  entries[parts.at(-1)]={size:bytes.length,offset:String(offset)};data.push(bytes);offset+=bytes.length;
 }
 const json=Buffer.from(JSON.stringify({files})),stringSize=(4+json.length+3)&~3,headerSize=4+stringSize,header=Buffer.alloc(8+headerSize);
 header.writeUInt32LE(4,0);header.writeUInt32LE(headerSize,4);header.writeUInt32LE(stringSize,8);header.writeUInt32LE(json.length,12);json.copy(header,16);
 fs.writeFileSync(file,Buffer.concat([header,...data]));
}

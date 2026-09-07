import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';
import {simple} from 'acorn-walk';
import {literalResolver} from './literal-bindings.mjs';

const root = process.argv[3] ? path.resolve(process.argv[3]) : fileURLToPath(new URL('../../', import.meta.url));
if(fs.existsSync(path.join(root,'reports'))&&fs.readdirSync(path.join(root,'reports')).some(name=>/^bulk-.*\.lock$/.test(name)))throw new Error('Wait for the active translation before replacing source catalogs, or pass a separate output directory.');
const archive = path.resolve(process.argv[2] || '/Applications/ChatGPT.app/Contents/Resources/app.asar');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const fd = fs.openSync(archive, 'r');
function read(size, offset) {
  const b = Buffer.alloc(size);
  if (fs.readSync(fd, b, 0, size, offset) !== size) throw new Error('Truncated ASAR');
  return b;
}
const prefix = read(16, 0);
const base = 8 + prefix.readUInt32LE(4);
const headerSize = prefix.readUInt32LE(12);
if (headerSize > 64 * 1024 * 1024) throw new Error('Unexpected ASAR header size');
const header = JSON.parse(read(headerSize, 16));
const messages = new Map();
const nativeMessageIds = new Set();
const report = {archive, scannedAssets: 0, parseErrors: [], unresolvedDescriptors: 0, unresolvedDescriptorDetails: [], conflicts: [], nativeCatalogs: [], coverage: 'Static literal message descriptors only; not complete UI coverage.'};
function walk(files, parent = '') {
  for (const [name, entry] of Object.entries(files)) {
    const relative = parent ? `${parent}/${name}` : name;
    if (entry.files) {walk(entry.files, relative); continue;}
    if (relative.startsWith('native-menu-locales/')) {
      report.nativeCatalogs.push(relative);
      if(relative.endsWith('.json')&&!entry.unpacked&&!entry.link)for(const id of Object.keys(JSON.parse(read(entry.size,base+Number(entry.offset)).toString('utf8'))))nativeMessageIds.add(id);
    }
    if (!relative.endsWith('.js') || entry.unpacked || entry.link || relative.includes('node_modules/')) continue;
    const source = read(entry.size, base + Number(entry.offset)).toString('utf8');
    if (!source.includes('defaultMessage')) continue;
    report.scannedAssets++;
    let ast;
    try {ast = parse(source, {ecmaVersion: 'latest', sourceType: 'module'});}
    catch (e) {report.parseErrors.push({file: relative, error: e.message}); continue;}
    const literal = literalResolver(ast);
    simple(ast, {ObjectExpression(node) {
      const fields = new Map(node.properties.filter(p => p.type === 'Property' && !p.computed).map(p => [p.key.name ?? p.key.value, p.value]));
      if (!fields.has('defaultMessage')) return;
      const originalId = literal(fields.get('id') || fields.get('messageId'));
      // The alternate messageId API can reuse an ID with different wording.
      // Keep both messages without overriding the renderer's canonical id entry.
      const alternate = !fields.has('id') && fields.has('messageId');
      const id = originalId ? (alternate ? `@messageId:${originalId}` : originalId) : undefined;
      const text = literal(fields.get('defaultMessage'));
      const description = literal(fields.get('description')) || '';
      if (!id || text === undefined) {
        report.unresolvedDescriptors++;
        report.unresolvedDescriptorDetails.push({file:relative,offset:node.start,idNodeType:(fields.get('id')||fields.get('messageId'))?.type||'missing',defaultMessageNodeType:fields.get('defaultMessage')?.type||'missing'});
        return;
      }
      const hash = sha(JSON.stringify([text, description]));
      const record = messages.get(id);
      if (record) {
        if (record.source !== text) report.conflicts.push({id, file: relative, sourceHash: hash, source:text, description});
        if (description && !record.descriptions.includes(description)) record.descriptions.push(description);
        if (!record.files.includes(relative)) record.files.push(relative);
      } else messages.set(id, {id, ...(alternate ? {originalId,descriptorKind:'messageId'} : {}), source: text, description, descriptions:description ? [description] : [], sourceHash: hash, files: [relative]});
    }});
  }
}
try {walk(header.files);} finally {fs.closeSync(fd);}
const archiveHash = await new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(archive);
  stream.on('data', b => hash.update(b));
  stream.on('error', reject);
  stream.on('end', () => resolve(hash.digest('hex')));
});
const supplementalPath=fileURLToPath(new URL('../../config/supplemental-messages.json',import.meta.url));
if(fs.existsSync(supplementalPath)){
  const supplemental=JSON.parse(fs.readFileSync(supplementalPath,'utf8'));
  report.supplementalStatus=supplemental.archiveSha256===archiveHash?'matched':'skipped-version-mismatch';
  if(supplemental.archiveSha256===archiveHash)for(const m of supplemental.messages){
    const id=m.id||`@messageId:${m.originalId}`;
    const description=m.description||'Native Intel-on-Apple-Silicon compatibility warning. Preserve platform and product names.';
    const existing=messages.get(id);
    if(existing){if(existing.source!==m.source)report.conflicts.push({id,file:m.file||supplemental.file,source:m.source,description});else{if(description&&!existing.descriptions.includes(description))existing.descriptions.push(description);if(!existing.files.includes(m.file||supplemental.file))existing.files.push(m.file||supplemental.file);}}
    else messages.set(id,{id,...(m.originalId?{originalId:m.originalId,descriptorKind:'messageId'}:{}),...(m.sourceLocale?{sourceLocale:m.sourceLocale}:{}),source:m.source,descriptions:[description],files:[m.file||supplemental.file]});
  }
}
const classificationsPath=fileURLToPath(new URL('../../config/unresolved-descriptors.json',import.meta.url));
if(fs.existsSync(classificationsPath)){
  const classifications=JSON.parse(fs.readFileSync(classificationsPath,'utf8'));
  report.unresolvedClassificationStatus=classifications.archiveSha256===archiveHash?'matched':'skipped-version-mismatch';
  if(classifications.archiveSha256===archiveHash){
    const byLocation=new Map(classifications.entries.map(entry=>[`${entry.file}:${entry.offset}`,entry]));
    for(const detail of report.unresolvedDescriptorDetails){const entry=byLocation.get(`${detail.file}:${detail.offset}`);if(entry)Object.assign(detail,{classification:entry.classification,coveredBy:entry.coveredBy,reason:entry.reason});}
    report.staleUnresolvedClassifications=classifications.entries.filter(entry=>!report.unresolvedDescriptorDetails.some(detail=>detail.file===entry.file&&detail.offset===entry.offset));
  }
}
report.unresolvedUnclassified=report.unresolvedDescriptorDetails.filter(detail=>!detail.classification).length;
const ambiguous = new Set(report.conflicts.map(c => c.id));
report.ambiguousIds = [...ambiguous].sort();
for (const id of ambiguous) messages.delete(id);
for (const message of messages.values()) {
  message.description = message.descriptions.sort().join('\n');
  message.sourceHash = sha(JSON.stringify([message.source, message.description]));
  delete message.descriptions;
}
report.messageCount = messages.size;
report.nativeMessageIds = [...nativeMessageIds].sort();
report.archiveSha256 = archiveHash;
report.generatedAt = new Date().toISOString();
for (const dir of ['catalogs/source', 'reports']) fs.mkdirSync(path.join(root, dir), {recursive:true});
fs.writeFileSync(path.join(root, 'reports/scan.json'), JSON.stringify(report, null, 2) + '\n');
if (report.parseErrors.length) {
  console.error('Scan needs review; see reports/scan.json. Existing source catalog was preserved.');
  process.exitCode = 1;
} else {
  const catalog = {schemaVersion:1, archiveSha256:archiveHash, messages:[...messages.values()].sort((a,b) => a.id.localeCompare(b.id))};
  fs.writeFileSync(path.join(root, 'catalogs/source/en.json'), JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Extracted ${messages.size} message IDs. Unresolved descriptors: ${report.unresolvedDescriptors}; ambiguous IDs excluded: ${ambiguous.size}. Native menu catalogs inventoried separately.`);
}

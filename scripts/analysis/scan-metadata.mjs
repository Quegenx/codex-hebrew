import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openAsar} from './asar-archive.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const resources=path.resolve(process.argv[2]||'/Applications/ChatGPT.app/Contents/Resources');
const archive=path.join(resources,'app.asar'),entries=[],parseErrors=[],files=[];
const add=(file,pointer,kind,source)=>{if(typeof source==='string'&&source.trim())entries.push({id:`${path.relative(resources,file)}#${pointer}`,file:path.relative(resources,file),pointer,kind,source});};
function walk(directory,predicate){if(!fs.existsSync(directory))return[];const found=[];for(const item of fs.readdirSync(directory,{withFileTypes:true})){const full=path.join(directory,item.name);if(item.isDirectory())found.push(...walk(full,predicate));else if(item.isFile()&&predicate(full))found.push(full);}return found;}
const pluginFiles=walk(path.join(resources,'plugins'),file=>file.endsWith('/.codex-plugin/plugin.json'));
const marketplaceFiles=walk(path.join(resources,'plugins'),file=>file.endsWith('/.agents/plugins/marketplace.json'));
for(const file of [...pluginFiles,...marketplaceFiles])try{
 const value=JSON.parse(fs.readFileSync(file,'utf8'));files.push(file);
 if(file.endsWith('plugin.json')){
  add(file,'/description','plugin-description',value.description);
  const ui=value.interface;if(ui&&typeof ui==='object'){
   for(const field of ['displayName','shortDescription','longDescription','category'])add(file,`/interface/${field}`,field==='displayName'?'plugin-name':'plugin-description',ui[field]);
   for(const field of ['capabilities','defaultPrompt'])if(Array.isArray(ui[field]))ui[field].forEach((source,index)=>add(file,`/interface/${field}/${index}`,'plugin-description',source));
  }
 }else add(file,'/metadata/interface/displayName','plugin-name',value.metadata?.interface?.displayName);
}catch(error){parseErrors.push({file:path.relative(resources,file),error:error.message});}
function yamlValue(raw){const value=raw.trim();if(value.startsWith('"'))try{return JSON.parse(value);}catch{}return value.replace(/^['"]|['"]$/g,'');}
const skillFiles=[...walk(path.join(resources,'plugins'),file=>file.endsWith('/SKILL.md')),...walk(path.join(resources,'skills'),file=>file.endsWith('/SKILL.md'))];
for(const file of skillFiles)try{
 const text=fs.readFileSync(file,'utf8'),front=text.match(/^---\s*\n([\s\S]*?)\n---/);files.push(file);if(!front)throw Error('Missing one-line YAML frontmatter');
 for(const field of ['name','description']){const match=front[1].match(new RegExp(`^${field}:\\s*(.+)$`,'m'));if(match)add(file,`/frontmatter/${field}`,field==='name'?'skill-name':'skill-description',yamlValue(match[1]));}
}catch(error){parseErrors.push({file:path.relative(resources,file),error:error.message});}
const agentFiles=[...walk(path.join(resources,'plugins'),file=>/\/agents\/openai\.ya?ml$/.test(file)),...walk(path.join(resources,'skills'),file=>/\/agents\/openai\.ya?ml$/.test(file))];
for(const file of agentFiles)try{
 const text=fs.readFileSync(file,'utf8');files.push(file);
 for(const [field,kind] of [['display_name','skill-name'],['short_description','skill-description'],['default_prompt','skill-description']]){const match=text.match(new RegExp(`^\\s*${field}:\\s*(.+)$`,'m'));if(match)add(file,`/interface/${field}`,kind,yamlValue(match[1]));}
}catch(error){parseErrors.push({file:path.relative(resources,file),error:error.message});}
const hash=crypto.createHash('sha256');for(const file of [...new Set(files)].sort()){hash.update(path.relative(resources,file));hash.update(fs.readFileSync(file));}
entries.sort((a,b)=>a.id.localeCompare(b.id));
const report={schemaVersion:1,generatedAt:new Date().toISOString(),resources,archiveSha256:openAsar(archive).hash,resourceSha256:hash.digest('hex'),files:[...new Set(files)].length,pluginManifests:pluginFiles.length,marketplaces:marketplaceFiles.length,skills:skillFiles.length,agentCards:agentFiles.length,entries,parseErrors};
fs.writeFileSync(path.join(root,'reports/metadata-inventory.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({files:report.files,entries:entries.length,uniqueSources:new Set(entries.map(entry=>entry.source)).size,parseErrors:parseErrors.length}));if(parseErrors.length)process.exitCode=1;

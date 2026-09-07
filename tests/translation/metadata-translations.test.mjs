import {afterEach,expect,test} from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {patchHebrewMetadataResources,verifyHebrewMetadataResources} from '../../scripts/rtl/hebrew-metadata-resources.mjs';

let directory;
afterEach(()=>{if(directory)fs.rmSync(directory,{recursive:true,force:true});});
test('plugin and skill metadata are Hebrew in resources before rendering',()=>{
 directory=fs.mkdtempSync(path.join(os.tmpdir(),'chatgpt-hebrew-metadata-'));
 const plugin='plugins/demo/.codex-plugin/plugin.json',skill='skills/demo/SKILL.md';
 fs.mkdirSync(path.join(directory,path.dirname(plugin)),{recursive:true});fs.mkdirSync(path.join(directory,path.dirname(skill)),{recursive:true});
 fs.writeFileSync(path.join(directory,plugin),JSON.stringify({description:'Find documents',interface:{displayName:'Files',category:'Productivity'},id:'demo'}));
 fs.writeFileSync(path.join(directory,skill),'---\nname: demo\ndescription: "Draft documents"\n---\nBody\n');
 const catalog={archiveSha256:'archive',metadata:[
  {id:`${plugin}#/description`,file:plugin,pointer:'/description',source:'Find documents',translation:'חיפוש מסמכים',disposition:'translated'},
  {id:`${plugin}#/interface/displayName`,file:plugin,pointer:'/interface/displayName',source:'Files',translation:'קבצים',disposition:'translated'},
  {id:`${skill}#/frontmatter/description`,file:skill,pointer:'/frontmatter/description',source:'Draft documents',translation:'יצירת מסמכים עם $& $1 $$',disposition:'translated'},
 ]};
 expect(patchHebrewMetadataResources(directory,catalog,'archive')).toEqual({entries:3,files:2});
 const value=JSON.parse(fs.readFileSync(path.join(directory,plugin),'utf8')),markdown=fs.readFileSync(path.join(directory,skill),'utf8');
 expect(value).toEqual({description:'חיפוש מסמכים',interface:{displayName:'קבצים',category:'Productivity'},id:'demo'});
 expect(markdown).toContain('description: "יצירת מסמכים עם $& $1 $$"');expect(markdown).toContain('\nBody\n');
 expect(verifyHebrewMetadataResources(directory,catalog)).toEqual({complete:true,entries:3,files:2});
});

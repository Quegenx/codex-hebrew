import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';
import {simple} from 'acorn-walk';

const projectRoot=fileURLToPath(new URL('../../',import.meta.url));
// Translation catalogs, generated artifacts, dependencies, and installed skills
// are data or external tooling, not maintained application source.
const excludedDirectories=new Set(['.git','.agents','node_modules','.lab','dist','catalogs','reports']);
const sourceExtensions=new Set(['.js','.mjs','.cjs','.jsx','.ts','.tsx','.css','.scss','.html','.py','.c','.h','.cpp','.swift','.cs','.ps1']);
const failures=[];
let sourceFiles=0,largestFile={file:null,lines:0};

function checkSourceReference(file,reference){
  if(typeof reference!=='string'||!reference.startsWith('.'))return;
  const resolved=path.resolve(path.dirname(file),reference),relative=path.relative(projectRoot,resolved);
  if(!fs.existsSync(resolved)&&!excludedDirectories.has(relative.split(path.sep)[0]))failures.push(`${path.relative(projectRoot,file)}: missing ${reference}`);
}

function checkSourceFile(file){
  if(!sourceExtensions.has(path.extname(file)))return;
  const source=fs.readFileSync(file,'utf8');
  const lines=source.length?source.split('\n').length-Number(source.endsWith('\n')):0;
  sourceFiles++;
  if(lines>largestFile.lines)largestFile={file:path.relative(projectRoot,file),lines};
  if(lines>300)failures.push(`${path.relative(projectRoot,file)}: ${lines} lines exceeds 300`);
  if(!['.js','.mjs','.cjs'].includes(path.extname(file)))return;
  try{
    const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
    const checkNode=node=>checkSourceReference(file,node.source?.value);
    simple(ast,{
      ImportDeclaration:checkNode,ExportNamedDeclaration:checkNode,ExportAllDeclaration:checkNode,ImportExpression:checkNode,
      CallExpression(node){if(node.callee.type==='Identifier'&&node.callee.name==='require')checkSourceReference(file,node.arguments[0]?.value);},
      NewExpression(node){
        if(node.callee.name==='URL'&&node.arguments[1]?.type==='MemberExpression'&&source.slice(node.arguments[1].start,node.arguments[1].end)==='import.meta.url')checkSourceReference(file,node.arguments[0]?.value);
      },
    });
  }catch(error){failures.push(`${path.relative(projectRoot,file)}: ${error.message}`);}
}

function checkSourceDirectory(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory()&&!excludedDirectories.has(entry.name))checkSourceDirectory(file);
    else if(entry.isFile())checkSourceFile(file);
  }
}

checkSourceDirectory(projectRoot);
const packageJson=JSON.parse(fs.readFileSync(path.join(projectRoot,'package.json'),'utf8'));
for(const [name,command]of Object.entries(packageJson.scripts)){
  for(const match of command.matchAll(/\bscripts\/[^\s]+\.(?:mjs|cjs|js|py)\b/g)){
    if(!fs.existsSync(path.join(projectRoot,match[0])))failures.push(`package command ${name}: missing ${match[0]}`);
  }
}
assert.equal(failures.length,0,`Project structure check failed:\n${failures.join('\n')}`);
console.log(`Project structure: ${sourceFiles} source files; imports and commands resolve; largest file is ${largestFile.lines}/300 lines (${largestFile.file}).`);

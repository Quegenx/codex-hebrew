import {afterEach,expect,test} from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openAsar,rewriteAsarFiles} from '../../scripts/analysis/asar-archive.mjs';
import {writeAsarFixture} from './asar-fixture.mjs';

let directory;
afterEach(()=>fs.rmSync(directory,{recursive:true,force:true}));

test('ASAR rewrite replaces and adds packed assets without changing untouched bytes',()=>{
 directory=fs.mkdtempSync(path.join(os.tmpdir(),'chatgpt-rtl-asar-'));const source=path.join(directory,'source.asar'),output=path.join(directory,'output.asar');
 writeAsarFixture(source,{'a.txt':'old','nested/b.txt':'untouched'});
 const result=rewriteAsarFiles(source,output,{'a.txt':'a longer replacement','new/path/c.txt':'new'}),archive=openAsar(output);
 expect(archive.read('a.txt')).toBe('a longer replacement');expect(archive.read('nested/b.txt')).toBe('untouched');expect(archive.read('new/path/c.txt')).toBe('new');
 expect(result.archiveSha256).toBe(archive.hash);expect(result.changedAssets).toEqual(['a.txt','new/path/c.txt']);
});

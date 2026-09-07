import {afterEach,test,expect} from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveApplicationTarget} from '../../scripts/analysis/application-target.mjs';
import {openAsar} from '../../scripts/analysis/asar-archive.mjs';
import {buildWindowsWrapper} from '../../scripts/build/build-windows-wrapper.mjs';
import {writeAsarFixture} from './asar-fixture.mjs';

let directory;
afterEach(()=>{if(directory)fs.rmSync(directory,{recursive:true,force:true});directory=undefined;});

test('application target derives the exact macOS and Windows ASAR paths',()=>{
 const mac='/Applications/ChatGPT.app/Contents/MacOS/ChatGPT',windows='C:\\Users\\Lab\\AppData\\Local\\Programs\\ChatGPT\\ChatGPT.exe';
 const macFiles=new Set([mac,'/Applications/ChatGPT.app/Contents/Resources','/Applications/ChatGPT.app/Contents/Resources/app.asar']);
 expect(resolveApplicationTarget({platform:'darwin',executable:mac,exists:value=>macFiles.has(value)}).archive).toBe('/Applications/ChatGPT.app/Contents/Resources/app.asar');
 const windowsExecutable=path.win32.resolve(windows),windowsResources=path.win32.join(path.win32.dirname(windowsExecutable),'resources'),windowsArchive=path.win32.join(windowsResources,'app.asar'),windowsFiles=new Set([windowsExecutable,windowsResources,windowsArchive]);
 expect(resolveApplicationTarget({platform:'win32',executable:windows,exists:value=>windowsFiles.has(value)})).toEqual({platform:'win32',executable:windowsExecutable,resources:windowsResources,archive:windowsArchive});
});

test('application icon bounds preserve the opacity threshold and reject empty artwork',()=>{
 const script=fileURLToPath(new URL('../../scripts/build/prepare-application-icon.py',import.meta.url));
 const check=`import runpy, sys
from PIL import Image
bounds = runpy.run_path(sys.argv[1])['content_box']
image = Image.new('RGBA', (5, 4), (255, 255, 255, 16))
image.putpixel((1, 1), (0, 0, 0, 17))
image.putpixel((3, 2), (255, 255, 255, 255))
assert bounds(image) == (1, 1, 4, 3)
try:
    bounds(Image.new('RGBA', (2, 2), (255, 255, 255, 16)))
except SystemExit as error:
    assert str(error) == 'No opaque icon content after removing the black field'
else:
    raise AssertionError('Empty artwork was accepted')
`;
 const result=Bun.spawnSync(['python3','-c',check,script],{stdout:'pipe',stderr:'pipe'});
 expect(result.stderr.toString()).toBe('');expect(result.exitCode).toBe(0);
});

test('application target fails closed when Electron resources are absent',()=>{
 expect(()=>resolveApplicationTarget({platform:'win32',executable:'C:\\ChatGPT.exe',exists:value=>value===path.win32.resolve('C:\\ChatGPT.exe')})).toThrow('No Electron resources directory');
});

test('Windows wrapper installs one loader while preserving the original main bundle',()=>{
 directory=fs.mkdtempSync(path.join(os.tmpdir(),'chatgpt-rtl-windows-'));const application=path.join(directory,'installed'),resources=path.join(application,'resources'),executable=path.join(application,'ChatGPT.exe'),archive=path.join(resources,'app.asar'),catalog=path.join(directory,'native.json'),nativeUi=path.join(directory,'native-ui.json');fs.mkdirSync(resources,{recursive:true});fs.writeFileSync(executable,'fixture');fs.writeFileSync(catalog,'{}');
 const slider='ModelPickerPowerSliderImpl data-model-picker-power-slider dir:`ltr`,disabled:A,max:Ye n=Math.round((e.clientX-t.left)/t.width*N) let t=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:-e.deltaY; style:{left:Qe(N===0?0:t/N*100)} Lt={left:Oe} function $e(e,t,n=1){if(t<=0)return`translateX(${-100*n}%)`;let r=q(e,t);return`translateX(calc(${(e-100)*n}% + ${r*n}px))`} function et(e,t){let n=q(e,t);return`inset(0 calc(${100-e}% - ${n}px) 0 0)`} exit:{opacity:0,transition:gt,x:-110} initial:v?{opacity:0,x:x.phase===`exiting`?28:0}:!1';
 const pet='settings.pets.size linear-gradient(to right, var(--color-text-info) x {id:`pet-size`,className:a linear-gradient(to right, var(--color-text-info) y {id:`pet-size`,className:b';
 writeAsarFixture(archive,{'.vite/build/bootstrap-fixture.js':'require("electron");','webview/assets/impl-fixture.js':slider,'webview/assets/pets-fixture.js':pet,'package.json':'{"main":".vite/build/bootstrap-fixture.js"}'});fs.writeFileSync(nativeUi,JSON.stringify({archiveSha256:openAsar(archive).hash,entries:[],dynamicEntries:[]}));
 const sourceArchiveSha256=openAsar(archive).hash,runtime={sourceArchiveSha256,runtimeSha256:'runtime',runtimeRoot:'C:\\Users\\Lab\\AppData\\Roaming\\ChatGPT Hebrew\\runtime'};
 const manifest=buildWindowsWrapper({executable,catalog,nativeUi,runtime,platform:'win32',tempDirectory:path.join(directory,'temp')}),wrapped=openAsar(path.join(manifest.wrapperDirectory,'resources','app.asar'));
 expect(fs.readFileSync(manifest.executable,'utf8')).toBe('fixture');expect(JSON.parse(wrapped.read('package.json')).main).toBe('codex-he-loader.cjs');expect(wrapped.read('codex-he-loader.cjs')).toContain('require(\'./.vite/build/bootstrap-fixture.js\')');expect(wrapped.read('.vite/build/bootstrap-fixture.js')).toBe('require("electron");');expect(wrapped.read('webview/assets/impl-fixture.js')).toContain('dir:`rtl`');expect(wrapped.files).toContain('native-menu-locales/he.json');expect(manifest.runtimeVerified).toBeFalse();
 const ico=fs.readFileSync(path.join(manifest.wrapperDirectory,'resources','icon.ico'));expect(ico.subarray(0,4)).toEqual(Buffer.from([0,0,1,0]));expect(ico.length).toBeGreaterThan(1000);

});
